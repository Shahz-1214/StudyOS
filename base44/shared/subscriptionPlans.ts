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
