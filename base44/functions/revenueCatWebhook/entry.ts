import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import {
  isWebhookAuthorized,
  grantStatusForEvent,
  planFromEntitlementIds,
} from '../../shared/revenueCat.ts';

function json(data: any, status = 200) {
  return Response.json(data, { status });
}

/**
 * RevenueCat subscription webhook.
 *
 * RevenueCat cannot authenticate as an app user, so authenticity is established
 * first: the Authorization header must equal the configured webhook secret
 * (constant-time, fail closed when no secret is set). Anyone can reach this
 * endpoint, so nothing is processed before that check passes.
 *
 * Writes ONLY the rc_* grant fields on the matching learner's record. The base
 * grant (plan/status/expires_at) belongs to access-code redemption and is never
 * touched here. The plan tier comes only from the mapped entitlement id — never
 * from a plan value in the payload.
 */
export default async function(req) {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const expectedSecret = (secrets.get('REVENUECAT_WEBHOOK_AUTH_SECRET') || '').trim();
    const provided = (req.headers.get('authorization') || '').trim();
    if (!(await isWebhookAuthorized(provided, expectedSecret))) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => null);
    const event = body?.event;
    if (!event) return json({ error: 'Malformed event' }, 400);

    const type = String(event.type || '');
    const status = grantStatusForEvent(type);
    if (!status) {
      // RevenueCat's own TEST event (a sample payload) and any event type this
      // app does not recognise change nothing. A 200 stops RevenueCat retrying
      // an event that was intentionally skipped.
      return json({ ok: true, ignored: true, type, reason: 'event_type_ignored' });
    }

    const appUserId = String(event.app_user_id || '').trim();
    if (!appUserId) return json({ error: 'Missing app_user_id' }, 400);

    const base44 = createClientFromRequest(req);

    // The learner is the app user whose Base44 user id is the RevenueCat app
    // user id. An aliased id is only a fallback lookup, never the write target.
    const candidates = [appUserId];
    const original = String(event.original_app_user_id || '').trim();
    if (original && original !== appUserId) candidates.push(original);

    let current = null;
    for (const candidate of candidates) {
      const found = await base44.asServiceRole.entities.SubscriptionState.filter(
        { created_by_id: candidate },
        '-created_date',
        1
      );
      if (found?.length) {
        current = found[0];
        break;
      }
    }

    const eventId = String(event.id || '');
    const eventMs = Number(event.event_timestamp_ms || 0);

    // Idempotent and monotonic: a replay of the last applied event, or an event
    // older than the last applied one, is ignored so a retried or delayed
    // webhook can never roll the grant backwards.
    if (eventId && current?.rc_last_event_id === eventId) {
      return json({ ok: true, ignored: true, reason: 'duplicate_event' });
    }
    const lastMs = current?.rc_last_event_at ? new Date(current.rc_last_event_at).getTime() : 0;
    if (eventMs && Number.isFinite(lastMs) && lastMs && eventMs < lastMs) {
      return json({ ok: true, ignored: true, reason: 'out_of_order_event' });
    }

    const mapped = planFromEntitlementIds(event.entitlement_ids ?? event.entitlement_id);
    const plan = mapped || (current?.rc_plan && current.rc_plan !== 'free' ? current.rc_plan : null);
    if (!plan) {
      // No entitlement could be mapped onto a tier. The tier is never guessed
      // from the payload, so nothing is written.
      return json({ ok: true, ignored: true, reason: 'no_mapped_entitlement' });
    }

    if (!current) {
      // Never create an orphan record for an app user id that is not a learner
      // of this app.
      const owners = await base44.asServiceRole.entities.User.filter({ id: appUserId }, '-created_date', 1);
      if (!owners?.length) {
        return json({ ok: true, ignored: true, reason: 'unknown_learner' });
      }
    }

    const expirationMs = Number(event.expiration_at_ms || 0);
    const fields = {
      rc_plan: plan,
      rc_status: status,
      rc_expires_at: expirationMs
        ? new Date(expirationMs).toISOString()
        : current?.rc_expires_at || null,
      rc_product_id: String(event.product_id || current?.rc_product_id || ''),
      rc_app_user_id: appUserId,
      rc_last_event_id: eventId,
      rc_last_event_at: eventMs ? new Date(eventMs).toISOString() : new Date().toISOString(),
    };

    // Service role is required: the entitlement fields are admin-only by design,
    // and this endpoint has no app-user session to act under.
    if (current?.id) {
      await base44.asServiceRole.entities.SubscriptionState.update(current.id, fields);
    } else {
      await base44.asServiceRole.entities.SubscriptionState.create({
        plan: 'free',
        status: 'active',
        created_by_id: appUserId,
        ...fields,
      });
    }

    // Append-only audit trail in the existing event ledger.
    await base44.asServiceRole.entities.Event.create({
      event_name: 'revenuecat_subscription_event',
      properties: {
        source: 'revenuecat_webhook',
        type,
        plan,
        status,
        event_id: eventId,
        product_id: fields.rc_product_id,
      },
      occurred_at: new Date().toISOString(),
    }).catch(() => {});

    return json({ ok: true, applied: true, type, plan, status });
  } catch {
    return json({ error: 'Could not process this webhook.', code: 'INTERNAL_ERROR' }, 500);
  }
}