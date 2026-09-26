import {
  PLAN_LIMITS,
  resolveEffectivePlan,
  getPremiumPeriodStart,
  getNextPremiumReset,
} from './subscriptionPlans.ts';

export async function enforceAIQuota(base44, eventName = "ai_request_started", premiumFeature = "") {
  const subs = await base44.entities.SubscriptionState.list("-created_date", 1);
  const sub = subs[0];
  const now = Date.now();
  const plan = resolveEffectivePlan(sub, now);
  const limits = PLAN_LIMITS[plan];
  const isPremium = Boolean(premiumFeature);
  const countedEvent = isPremium ? "premium_ai_action" : eventName;

  const events = await base44.entities.Event.filter(
    { event_name: countedEvent },
    "-occurred_at",
    150
  );
  const minuteAgo = now - 60_000;
  const tenMinutesAgo = now - 10 * 60_000;
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const todayStartMs = dayStart.getTime();
  const premiumPeriodStartMs = getPremiumPeriodStart(new Date(now), plan).getTime();

  const recent = (events || []).filter(
    (e) => e.event_name === countedEvent && new Date(e.occurred_at).getTime() >= minuteAgo
  );
  const today = (events || []).filter(
    (e) => e.event_name === countedEvent && new Date(e.occurred_at).getTime() >= todayStartMs
  );
  const premiumPeriod = (events || []).filter(
    (e) => e.event_name === countedEvent && new Date(e.occurred_at).getTime() >= premiumPeriodStartMs
  );

  if (recent.length >= limits.aiPerMinute) {
    return Response.json(
      { error: "Too many AI requests right now. Please wait a minute and try again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  if (isPremium) {
    if (premiumPeriod.length >= limits.premiumAllowance) {
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
    const premiumRecent = (events || []).filter(
      (e) => e.event_name === countedEvent && new Date(e.occurred_at).getTime() >= tenMinutesAgo
    );
    if (premiumRecent.length >= limits.premiumPerTenMinutes) {
      return Response.json(
        { error: "Premium AI is cooling down briefly. Please try again soon.", code: "PREMIUM_RATE_LIMITED" },
        { status: 429 }
      );
    }
  } else if (today.length >= limits.standardDaily) {
    return Response.json(
      {
        error: "You've reached today's standard AI limit. It refreshes at the next daily reset.",
        code: "DAILY_LIMIT_REACHED",
        limit: limits.standardDaily,
      },
      { status: 429 }
    );
  }

  await base44.entities.Event.create({
    event_name: countedEvent,
    properties: {
      source: "server_ai_guard",
      plan,
      bucket: isPremium ? "premium" : "standard",
      feature: premiumFeature || eventName,
    },
    occurred_at: new Date().toISOString(),
  });
  return null;
}
