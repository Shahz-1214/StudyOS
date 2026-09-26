// Server-side subscription configuration for StudyOS.
// Plan IDs stay stable for future RevenueCat mapping: free / pro / elite.
// Display names can be more student-friendly on the frontend.

export const PLAN_LIMITS = {
  free: {
    standardDaily: 10,
    premiumDaily: 5,
    aiPerMinute: 3,
    premiumPerTenMinutes: 1,
  },
  pro: {
    standardDaily: 50,
    premiumDaily: 20,
    aiPerMinute: 6,
    premiumPerTenMinutes: 3,
  },
  elite: {
    standardDaily: 120,
    premiumDaily: 60,
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
