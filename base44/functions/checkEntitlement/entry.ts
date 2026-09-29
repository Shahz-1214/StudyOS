import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  PLAN_LIMITS,
  DEMO_LIMITS,
  resolveEffectivePlan,
  isDemoModeActive,
  getNextUtcReset,
  getPremiumPeriodStart,
  getNextPremiumReset,
  PREMIUM_FEATURES,
} from '../../shared/subscriptionPlans.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // SubscriptionState is server-managed. The absence of a record, a cancelled
    // state, or an expired entitlement always resolves to the free plan.
    const subs = await base44.entities.SubscriptionState.list("-created_date", 1);
    const sub = subs[0];
    const now = Date.now();
    const plan = resolveEffectivePlan(sub, now);
    // One shared demo gate — the same predicate the AI guard uses. It requires
    // the server-written demo flag, a still-valid entitlement, and an
    // administrator; otherwise the normal production limits apply.
    const demoMode = isDemoModeActive(sub, now) && user.role === "admin";
    const limits = demoMode ? DEMO_LIMITS : PLAN_LIMITS[plan];

    // Only server quota events count here. Frontend analytics events do not
    // consume credits and therefore cannot accidentally inflate usage.
    const events = await base44.entities.Event.filter(
      { event_name: { $in: ["ai_request_started", "premium_ai_action"] } },
      "-occurred_at",
      250
    );
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayStartMs = dayStart.getTime();
    const premiumPeriodStart = getPremiumPeriodStart(new Date(now), plan);
    const premiumPeriodStartMs = premiumPeriodStart.getTime();

    const today = (events || []).filter(
      (e) => new Date(e.occurred_at).getTime() >= dayStartMs
    );
    const premiumPeriod = (events || []).filter(
      (e) => new Date(e.occurred_at).getTime() >= premiumPeriodStartMs
    );
    const standardUsed = today.filter((e) => e.event_name === "ai_request_started").length;
    const premiumUsed = premiumPeriod.filter((e) => e.event_name === "premium_ai_action").length;
    const premiumRemaining = Math.max(0, limits.premiumAllowance - premiumUsed);
    const standardRemaining = Math.max(0, limits.standardDaily - standardUsed);

    return Response.json({
      plan,
      demo_mode: demoMode,
      status: sub?.status || "active",
      is_pro: plan !== "free",
      ai_used_today: standardUsed,
      ai_limit: limits.standardDaily,
      remaining: standardRemaining,
      premium_used: premiumUsed,
      premium_limit: limits.premiumAllowance,
      premium_remaining: premiumRemaining,
      premium_reset_type: limits.premiumReset,
      premium_period_start_at: premiumPeriodStart.toISOString(),
      next_premium_reset_at: getNextPremiumReset(new Date(now), plan).toISOString(),
      premium_features: Object.entries(PREMIUM_FEATURES).map(([id, name]) => ({ id, name, cost: 1 })),
      ai_per_minute: limits.aiPerMinute,
      premium_per_ten_minutes: limits.premiumPerTenMinutes,
      next_reset_at: getNextUtcReset(new Date()).toISOString(),
      expires_at: sub?.expires_at || null,
      trial_ends_at: sub?.trial_ends_at || null,
    });
  } catch {
    return Response.json({ error: "Could not load subscription state. Please try again.", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}