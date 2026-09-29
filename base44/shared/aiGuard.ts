import {
  PLAN_LIMITS,
  resolveEffectivePlan,
  getPremiumPeriodStart,
  getNextPremiumReset,
} from './subscriptionPlans.ts';

const RESERVATION_EVENT = "ai_quota_reserved";
const REFUNDED_EVENT = "ai_quota_refunded";
const DEMO_LIMITS = {
  standardDaily: 1_000_000,
  premiumAllowance: 1_000_000,
  premiumReset: "weekly",
  aiPerMinute: 60,
  premiumPerTenMinutes: 20,
};

function nowIso() {
  return new Date().toISOString();
}

function safeEventDate(e) {
  const ms = new Date(e?.occurred_at || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function activeReservations(events, nowMs) {
  return (events || []).filter((e) => {
    if (e.event_name !== RESERVATION_EVENT) return false;
    const expires = new Date(e?.properties?.expires_at || 0).getTime();
    return !Number.isFinite(expires) || expires > nowMs;
  });
}

async function loadPlanAndEvents(base44, now) {
  const subs = await base44.entities.SubscriptionState.list("-created_date", 1);
  const sub = subs[0];
  const plan = resolveEffectivePlan(sub, now);
  const limits = sub?.demo_mode === true && plan !== "free" ? DEMO_LIMITS : PLAN_LIMITS[plan];
  const [completed, reservations] = await Promise.all([
    base44.entities.Event.filter(
      { event_name: { $in: ["ai_request_started", "premium_ai_action"] } },
      "-occurred_at",
      400
    ),
    base44.entities.Event.filter(
      { event_name: RESERVATION_EVENT },
      "-occurred_at",
      400
    ),
  ]);
  return { sub, plan, limits, completed: completed || [], reservations: activeReservations(reservations || [], now) };
}

function countWindow(events, predicate) {
  return (events || []).filter((e) => predicate(e, safeEventDate(e))).length;
}

async function releaseReservation(base44, reservationId, status = "refunded") {
  if (!reservationId) return;
  await base44.asServiceRole.entities.Event.update(reservationId, {
    event_name: status === "refunded" ? REFUNDED_EVENT : "ai_quota_cancelled",
    properties: {
      source: "server_ai_guard",
      status,
      updated_at: nowIso(),
    },
  }).catch(() => {});
}

/**
 * Reserves one AI credit before the provider call.
 * Credits are committed only after the operation succeeds; failed provider
 * calls and invalid model output are refunded/cancelled.
 *
 * Base44's current entity API does not expose a cross-request transaction
 * primitive, so the reservation is deliberately fail-closed: the request is
 * re-counted after the reservation is written and the reservation is revoked
 * when the limit would be exceeded.
 */
export async function reserveAIQuota(base44, eventName = "ai_request_started", premiumFeature = "") {
  const now = Date.now();
  const { plan, limits, completed, reservations } = await loadPlanAndEvents(base44, now);
  const isPremium = Boolean(premiumFeature);
  const countedEvent = isPremium ? "premium_ai_action" : eventName;
  const minuteAgo = now - 60_000;
  const tenMinutesAgo = now - 10 * 60_000;
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const todayStartMs = dayStart.getTime();
  const premiumPeriodStartMs = getPremiumPeriodStart(new Date(now), plan).getTime();

  const completedRecent = (completed || []).filter(
    (e) => e.event_name === countedEvent && safeEventDate(e) >= minuteAgo
  );
  const completedToday = (completed || []).filter(
    (e) => e.event_name === countedEvent && safeEventDate(e) >= todayStartMs
  );
  const completedPremium = (completed || []).filter(
    (e) => e.event_name === countedEvent && safeEventDate(e) >= premiumPeriodStartMs
  );
  const reservedBucket = reservations.filter(
    (e) => String(e?.properties?.bucket || "") === (isPremium ? "premium" : "standard")
  );
  const reservedRecent = reservedBucket.filter((e) => safeEventDate(e) >= minuteAgo);
  const reservedTenMinutes = reservedBucket.filter((e) => safeEventDate(e) >= tenMinutesAgo);
  const reservedToday = reservedBucket.filter((e) => safeEventDate(e) >= todayStartMs);
  const reservedPremium = reservedBucket.filter((e) => safeEventDate(e) >= premiumPeriodStartMs);

  if (completedRecent.length + reservedRecent.length >= limits.aiPerMinute) {
    return Response.json(
      { error: "Too many AI requests right now. Please wait a minute and try again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  if (isPremium) {
    if (completedPremium.length + reservedPremium.length >= limits.premiumAllowance) {
      const nextReset = getNextPremiumReset(new Date(now), plan).toISOString();
      const exhaustedMessage = plan === "free"
        ? "You've used this month's 15 Pro credits. They refresh at the next monthly reset."
        : "You've used this week's " + limits.premiumAllowance + " Pro credits. They refresh at the next weekly restock.";
      return Response.json(
        {
          error: exhaustedMessage,
          code: "PREMIUM_CREDITS_EXHAUSTED",
          limit: limits.premiumAllowance,
          reset: limits.premiumReset,
          next_reset_at: nextReset,
          feature: premiumFeature,
        },
        { status: 429 }
      );
    }
    if (completedRecent.length + reservedTenMinutes.length >= limits.premiumPerTenMinutes) {
      return Response.json(
        { error: "Premium AI is cooling down briefly. Please try again soon.", code: "PREMIUM_RATE_LIMITED" },
        { status: 429 }
      );
    }
  } else if (completedToday.length + reservedToday.length >= limits.standardDaily) {
    return Response.json(
      {
        error: "You've reached today's standard AI limit. It refreshes at the next daily reset.",
        code: "DAILY_LIMIT_REACHED",
        limit: limits.standardDaily,
      },
      { status: 429 }
    );
  }

  const reservationId = crypto.randomUUID();
  const expiresAt = new Date(now + 5 * 60_000).toISOString();
  const created = await base44.entities.Event.create({
    event_name: RESERVATION_EVENT,
    properties: {
      source: "server_ai_guard",
      plan,
      bucket: isPremium ? "premium" : "standard",
      feature: premiumFeature || eventName,
      expires_at: expiresAt,
      reservation_id: reservationId,
      status: "reserved",
    },
    occurred_at: nowIso(),
  });

  const verification = await loadPlanAndEvents(base44, Date.now());
  const verificationCompleted = verification.completed;
  const verificationReservations = verification.reservations;
  const verifyNow = Date.now();
  const verifyMinute = verifyNow - 60_000;
  const verifyTen = verifyNow - 10 * 60_000;
  const verifyDay = new Date();
  verifyDay.setUTCHours(0, 0, 0, 0);
  const verifyDayMs = verifyDay.getTime();
  const verifyPremiumMs = getPremiumPeriodStart(new Date(verifyNow), plan).getTime();

  const sameType = (e) => e.event_name === countedEvent;
  const allRecent = countWindow(verificationCompleted, (e, ms) => sameType(e) && ms >= verifyMinute);
  const allToday = countWindow(verificationCompleted, (e, ms) => sameType(e) && ms >= verifyDayMs);
  const allPremium = countWindow(verificationCompleted, (e, ms) => sameType(e) && ms >= verifyPremiumMs);
  const bucket = isPremium ? "premium" : "standard";
  const liveReserved = verificationReservations.filter(
    (e) => String(e?.properties?.bucket || "") === bucket
  );
  const reservedRecent2 = liveReserved.filter((e) => safeEventDate(e) >= verifyMinute).length;
  const reservedTen2 = liveReserved.filter((e) => safeEventDate(e) >= verifyTen).length;
  const reservedToday2 = liveReserved.filter((e) => safeEventDate(e) >= verifyDayMs).length;
  const reservedPremium2 = liveReserved.filter((e) => safeEventDate(e) >= verifyPremiumMs).length;

  const overMinute = allRecent + reservedRecent2 > limits.aiPerMinute;
  const overPremium = isPremium
    ? allPremium + reservedPremium2 > limits.premiumAllowance || allRecent + reservedTen2 > limits.premiumPerTenMinutes
    : false;
  const overStandard = !isPremium && allToday + reservedToday2 > limits.standardDaily;

  if (overMinute || overPremium || overStandard) {
    await releaseReservation(base44, created.id || "", "refunded");
    return Response.json(
      {
        error: "Too many AI requests are already in progress. Please try again shortly.",
        code: "QUOTA_BUSY",
      },
      { status: 429 }
    );
  }

  return {
    reservationId: created.id || "",
    reservationKey: reservationId,
    countedEvent,
    premiumFeature: premiumFeature || "",
  };
}

export async function commitAIQuota(base44, reservation) {
  if (!reservation?.reservationId) return;
  await base44.asServiceRole.entities.Event.update(reservation.reservationId, {
    event_name: reservation.countedEvent || "ai_request_started",
    properties: {
      source: "server_ai_guard",
      status: "committed",
      bucket: reservation.premiumFeature ? "premium" : "standard",
      feature: reservation.premiumFeature || reservation.countedEvent || "ai_request_started",
      committed_at: nowIso(),
    },
  });
}

export async function refundAIQuota(base44, reservation) {
  if (!reservation?.reservationId) return;
  await releaseReservation(base44, reservation.reservationId, "refunded");
}

// Backward-compatible helper for any legacy caller. New code should use
// reserveAIQuota + commitAIQuota/refundAIQuota.
export async function enforceAIQuota(base44, eventName = "ai_request_started", premiumFeature = "") {
  return reserveAIQuota(base44, eventName, premiumFeature);
}
