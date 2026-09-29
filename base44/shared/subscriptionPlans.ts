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

export function resolveEffectivePlan(sub: any, now = Date.now()): StudyOSPlan {
  if (!sub || !validPlan(sub.plan)) return "free";
  if (!["active", "trialing"].includes(sub.status || "active")) return "free";
  if (sub.expires_at && Number.isFinite(new Date(sub.expires_at).getTime()) && new Date(sub.expires_at).getTime() <= now) return "free";
  if (sub.trial_ends_at && sub.status === "trialing" && Number.isFinite(new Date(sub.trial_ends_at).getTime()) && new Date(sub.trial_ends_at).getTime() <= now) return "free";
  return sub.plan;
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