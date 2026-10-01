import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import {
  fetchRevenueCatSubscriber,
  grantFromSubscriber,
  revenueCatGrantFields,
} from '../../shared/revenueCat.ts';
import { PLAN_DISPLAY_NAMES } from '../../shared/subscriptionPlans.ts';
import { findLearnerSubscription, saveLearnerSubscription } from '../../shared/subscriptionRecord.ts';

function json(data: any, status = 200) {
  return Response.json(data, { status });
}

// Verification spends a privileged credential, so one learner cannot hammer
// RevenueCat's API through this endpoint.
const HOURLY_VERIFY_LIMIT = 30;

/**
 * Server-side verification of a completed RevenueCat purchase.
 *
 * The learner is resolved from the authenticated session — never from request
 * input — and the entitlement is confirmed by asking RevenueCat directly with
 * the secret API key. Nothing the client claims about a purchase is trusted.
 *
 * Writes ONLY the rc_* grant fields. The base grant (plan/status/expires_at)
 * belongs to access-code redemption and is never touched here.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

    const secretApiKey = (secrets.get('REVENUECAT_SECRET_API_KEY') || '').trim();
    if (!secretApiKey) {
      return json({
        ok: false,
        verified: false,
        reason: 'not_configured',
        error: 'RevenueCat verification is not configured on this app yet.',
      });
    }

    const attempts = await base44.entities.Event.filter(
      { event_name: 'revenuecat_verify' },
      '-occurred_at',
      HOURLY_VERIFY_LIMIT
    );
    const cutoff = Date.now() - 60 * 60 * 1000;
    const recent = (attempts || []).filter((e) => new Date(e.occurred_at).getTime() >= cutoff);
    if (recent.length >= HOURLY_VERIFY_LIMIT) {
      return json({
        ok: false,
        verified: false,
        reason: 'rate_limited',
        error: 'Too many verification attempts. Please try again later.',
      }, 429);
    }
    await base44.entities.Event.create({
      event_name: 'revenuecat_verify',
      properties: { source: 'server_purchase_verification' },
      occurred_at: new Date().toISOString(),
    });

    const appUserId = user.id;
    const result = await fetchRevenueCatSubscriber(appUserId, secretApiKey);
    if (!result.ok) {
      return json({
        ok: false,
        verified: false,
        reason: 'revenuecat_unavailable',
        error: 'RevenueCat could not be reached to verify this purchase.',
      });
    }

    const current = await findLearnerSubscription(base44, user.id);
    const grant = grantFromSubscriber(result.subscriber);

    if (!grant) {
      // RevenueCat holds nothing active for this learner. A previously recorded
      // RevenueCat grant is marked lapsed; the access-code grant is untouched.
      if (current?.id && current.rc_plan && current.rc_plan !== 'free') {
        await base44.asServiceRole.entities.SubscriptionState.update(current.id, {
          rc_status: 'expired',
        });
      }
      return json({
        ok: true,
        verified: false,
        reason: 'no_active_purchase',
        error: 'No active RevenueCat purchase was found for this account.',
      });
    }

    // Elevation to the service role is required because the entitlement fields
    // are admin-only by design — the learner is authenticated, and only their
    // own record is written.
    const fields = revenueCatGrantFields({ ...grant, app_user_id: appUserId });
    // One record per learner: the learner's existing record is updated in place
    // (stamped with the learner key when it is a legacy record), and a record is
    // created once, keyed to the learner, only when none exists.
    await saveLearnerSubscription(base44, appUserId, fields, {
      plan: 'free',
      status: 'active',
    });

    await base44.entities.Event.create({
      event_name: 'revenuecat_verified',
      properties: {
        source: 'server_purchase_verification',
        plan: grant.plan,
        product_id: grant.product_id,
      },
      occurred_at: new Date().toISOString(),
    }).catch(() => {});

    return json({
      ok: true,
      verified: true,
      plan: grant.plan,
      plan_name: PLAN_DISPLAY_NAMES[grant.plan],
      expires_at: grant.expires_at,
    });
  } catch {
    return json({ error: 'Could not verify this purchase. Please try again.', code: 'INTERNAL_ERROR' }, 500);
  }
}