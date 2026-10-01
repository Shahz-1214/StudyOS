import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  PLAN_LIMITS,
  DEMO_LIMITS,
  PLAN_DISPLAY_NAMES,
  resolveEntitlement,
  isDemoModeActive,
  getNextUtcReset,
  getPremiumPeriodStart,
  getNextPremiumReset,
  PREMIUM_FEATURES,
} from '../../shared/subscriptionPlans.ts';
import { REVENUECAT_ENTITLEMENT_PLANS } from '../../shared/revenueCat.ts';
import { findLearnerSubscription } from '../../shared/subscriptionRecord.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // SubscriptionState is server-managed. The absence of a record, a cancelled
    // state, or an expired entitlement always resolves to the free plan.
    // The caller's own record is resolved by their learner key (with a legacy
    // owner-scoped record as the fallback), so a grant written by a server path
    // that cannot set record ownership is still found — and only the
    // authenticated caller's own record is ever read.
    const sub = await findLearnerSubscription(base44, user.id);
    const now = Date.now();
    // The publishable web key is the ONLY RevenueCat key the browser ever
    // receives. It is delivered as configuration from here rather than
    // hardcoded in the repository; the secret API key and the webhook secret
    // stay server-side.
    const publicWebKey = (secrets.get("REVENUECAT_PUBLIC_WEB_KEY") || "").trim();
    // One deterministic resolution over both grants on the record — the
    // access-code base grant and the RevenueCat grant. The valid grant with the
    // furthest expiry wins, so a lapsed RevenueCat subscription cannot downgrade
    // a learner who still holds a valid access-code grant (and vice versa).
    const resolved = resolveEntitlement(sub, now);
    const plan = resolved.plan;
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
      plan_display_name: PLAN_DISPLAY_NAMES[plan],
      plan_source: resolved.source,
      plan_expires_at: resolved.expires_at,
      demo_mode: demoMode,
      // Display-only demo mastery override (null unless the demo administrator
      // has set one). Read-only surface: the app renders it while Demo Mode is
      // active and never writes it back into learner records.
      demo_mastery: demoMode && typeof sub?.demo_mastery === "number" ? sub.demo_mastery : null,
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
      // Purchase configuration for the existing subscription surface. Absent or
      // false here means the purchase action must stay honestly unavailable
      // rather than offer a button that cannot complete.
      purchase: {
        provider: "revenuecat",
        configured: Boolean(publicWebKey),
        public_api_key: publicWebKey || null,
        // Delivered from the server so the RevenueCat entitlement -> StudyOS
        // plan mapping has exactly one source of truth.
        entitlement_map: REVENUECAT_ENTITLEMENT_PLANS,
      },
      // The RevenueCat grant as recorded, for display and diagnosis only. The
      // effective plan above is what every gate reads.
      revenuecat_grant: sub?.rc_plan && sub.rc_plan !== "free"
        ? {
            plan: sub.rc_plan,
            status: sub.rc_status || "expired",
            expires_at: sub.rc_expires_at || null,
            product_id: sub.rc_product_id || "",
          }
        : null,
    });
  } catch {
    return Response.json({ error: "Could not load subscription state. Please try again.", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}