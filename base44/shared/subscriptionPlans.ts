// Server-side subscription configuration for StudyOS.
// Plan IDs stay stable for future RevenueCat mapping: free / pro / elite.
// Display names can be more student-friendly on the frontend.

export const PLAN_LIMITS = {
  free: {
    standardDaily: 10,
    premiumAllowance: 15,
    premiumReset: "monthly",
    aiPerMinute: 3,
    premiumPerTenMinutes: 1,
  },
  pro: {
    standardDaily: 50,
    premiumAllowance: 12,
    premiumReset: "weekly",
    aiPerMinute: 6,
    premiumPerTenMinutes: 3,
  },
  elite: {
    standardDaily: 120,
    premiumAllowance: 36,
    premiumReset: "weekly",
    aiPerMinute: 10,
    premiumPerTenMinutes: 5,
  },
} as const;

export type StudyOSPlan = keyof typeof PLAN_LIMITS;

export const PREMIUM_FEATURES = {
  studylens: "StudyLens",
  lecturemind: "LectureMind",
  weakness_ai: "Weakness AI",
  essay_check: "EssayCheck",
  adaptive_exam: "Adaptive Exam",
} as const;

function validPlan(value: string): value is StudyOSPlan {
  return value === "free" || value === "pro" || value === "elite";
}

// Display names live in one place so the access-code path and the RevenueCat
// path can never show two names for the same tier.
export const PLAN_DISPLAY_NAMES: Record<StudyOSPlan, string> = {
  free: "Free",
  pro: "Plus",
  elite: "Pro",
};

const PLAN_RANK: Record<StudyOSPlan, number> = { free: 0, pro: 1, elite: 2 };

// A grant with no usable expiry is treated as open-ended. An unparseable value
// is treated the same way it always has been (not expired).
function expiryMs(value: any): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

type EntitlementGrant = { plan: StudyOSPlan; expiresAt: number };

/**
 * The base grant — the plan/status/expires_at fields written by access-code
 * redemption. Semantics unchanged: active or trialing, unexpired, and a paid
 * tier. Free is the absence of a grant, not a grant.
 */
function baseGrant(sub: any, now: number): EntitlementGrant | null {
  if (!sub || !validPlan(sub.plan) || sub.plan === "free") return null;
  if (!["active", "trialing"].includes(sub.status || "active")) return null;
  if (expiryMs(sub.expires_at) <= now) return null;
  if (sub.status === "trialing" && expiryMs(sub.trial_ends_at) <= now) return null;
  return { plan: sub.plan, expiresAt: expiryMs(sub.expires_at) };
}

/**
 * The RevenueCat grant — the rc_* fields, written only by the server-side
 * purchase verification and the RevenueCat webhook. Valid while its status is
 * active or trialing and its own expiry has not passed.
 */
function revenueCatGrant(sub: any, now: number): EntitlementGrant | null {
  if (!sub || !validPlan(sub.rc_plan) || sub.rc_plan === "free") return null;
  if (!["active", "trialing"].includes(sub.rc_status || "")) return null;
  if (expiryMs(sub.rc_expires_at) <= now) return null;
  return { plan: sub.rc_plan, expiresAt: expiryMs(sub.rc_expires_at) };
}

/**
 * Deterministic entitlement resolution — no AI, no guessing. Both grants on the
 * record are evaluated independently: the valid grant with the furthest expiry
 * wins, ties go to the higher tier, and no valid grant means free. A lapsed
 * RevenueCat subscription therefore never downgrades a learner who still holds
 * a valid access-code grant, and a lapsed access code never cancels a paid
 * subscription.
 */
export function resolveEntitlement(sub: any, now = Date.now()): {
  plan: StudyOSPlan;
  source: "access_code" | "revenuecat" | "none";
  expires_at: string | null;
} {
  const candidates: Array<{ source: "access_code" | "revenuecat"; grant: EntitlementGrant }> = [];
  const base = baseGrant(sub, now);
  if (base) candidates.push({ source: "access_code", grant: base });
  const rc = revenueCatGrant(sub, now);
  if (rc) candidates.push({ source: "revenuecat", grant: rc });

  if (!candidates.length) return { plan: "free", source: "none", expires_at: null };

  candidates.sort((a, b) => {
    if (b.grant.expiresAt !== a.grant.expiresAt) return b.grant.expiresAt - a.grant.expiresAt;
    return PLAN_RANK[b.grant.plan] - PLAN_RANK[a.grant.plan];
  });

  const winner = candidates[0];
  return {
    plan: winner.grant.plan,
    source: winner.source,
    expires_at: Number.isFinite(winner.grant.expiresAt)
      ? new Date(winner.grant.expiresAt).toISOString()
      : null,
  };
}

export function resolveEffectivePlan(sub: any, now = Date.now()): StudyOSPlan {
  return resolveEntitlement(sub, now).plan;
}

// ---------------------------------------------------------------------------
// Demo Mode — the existing admin-only Shipathon demo state.
//
// There is exactly ONE demo state: the server-written `demo_mode` flag on the
// caller's own SubscriptionState record. This shared predicate is the only
// place that decides whether the override is active, so every credit and
// subscription gate reads the same status. Nothing here is client-writable:
// the flag is written only by the admin-only adminDemoMode function.
// ---------------------------------------------------------------------------

/**
 * True only when the demo override is genuinely active: the flag is present AND
 * the entitlement it sits on is still active and unexpired. A missing, invalid,
 * cancelled, expired or tampered state resolves to false, so the normal
 * production credit and subscription rules always apply unless the demo state
 * is valid.
 */
export function isDemoModeActive(sub: any, now = Date.now()): boolean {
  return sub?.demo_mode === true && resolveEffectivePlan(sub, now) !== "free";
}

// Reported and enforced ceilings while the demo override is active. The credit
// ceilings are reported for display only — during a demo no credit is ever
// counted. The per-minute ceiling is the one limit actually kept, because it
// protects backend and provider availability rather than demo usage.
export const DEMO_LIMITS = {
  standardDaily: 1_000_000,
  premiumAllowance: 1_000_000,
  premiumReset: "weekly",
  aiPerMinute: 60,
  premiumPerTenMinutes: 20,
} as const;

export function getNextUtcReset(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}

export function getPremiumPeriodStart(now = new Date(), plan: StudyOSPlan = "free") {
  if (PLAN_LIMITS[plan].premiumReset === "monthly") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  // Paid premium credits restock on a server-defined UTC week (Monday 00:00).
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = start.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

export function getNextPremiumReset(now = new Date(), plan: StudyOSPlan = "free") {
  if (PLAN_LIMITS[plan].premiumReset === "monthly") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }

  const start = getPremiumPeriodStart(now, plan);
  start.setUTCDate(start.getUTCDate() + 7);
  return start;
}