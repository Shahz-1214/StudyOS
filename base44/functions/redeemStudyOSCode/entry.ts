import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(data: any, status = 200) {
  return Response.json(data, { status });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const normalizedCode = String(body?.code || '').trim().toUpperCase();

    if (!/^[A-Z0-9-]{12,64}$/.test(normalizedCode)) {
      return json({ error: 'Enter a valid StudyOS access code.', code: 'INVALID_CODE' }, 400);
    }

    // Protect the redemption endpoint from brute-force guessing.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const attempts = await base44.entities.Event.filter(
      { event_name: 'promo_code_attempt' },
      '-occurred_at',
      20
    );
    const recentAttempts = (attempts || []).filter(
      (event) => new Date(event.occurred_at).getTime() >= new Date(hourAgo).getTime()
    );
    if (recentAttempts.length >= 10) {
      return json({
        error: 'Too many code attempts. Please try again later.',
        code: 'PROMO_RATE_LIMITED',
      }, 429);
    }

    await base44.entities.Event.create({
      event_name: 'promo_code_attempt',
      properties: { source: 'server_promo_redemption' },
      occurred_at: new Date().toISOString(),
    });

    const codeHash = await sha256Hex(normalizedCode);
    const matches = await base44.asServiceRole.entities.PromoCode.filter(
      { code_hash: codeHash },
      '-created_date',
      1
    );
    const promo = matches?.[0];

    // Never reveal whether a particular code existed or was previously redeemed.
    if (!promo || promo.used_at) {
      return json({ error: 'That access code is invalid or has already been used.', code: 'INVALID_OR_USED_CODE' }, 400);
    }

    const now = Date.now();
    const durationMs = Math.max(1, Number(promo.duration_days || 30)) * 24 * 60 * 60 * 1000;

    const subscriptions = await base44.entities.SubscriptionState.list('-created_date', 1);
    const current = subscriptions?.[0];
    const currentExpiry = current?.expires_at ? new Date(current.expires_at).getTime() : 0;
    const nextExpiry = new Date(Math.max(now, Number.isFinite(currentExpiry) ? currentExpiry : 0) + durationMs).toISOString();

    const nextPlan = current?.plan === 'elite' ? 'elite' : promo.grant_plan;
    const payload = {
      plan: nextPlan,
      status: 'active',
      expires_at: nextExpiry,
      trial_ends_at: null,
    };

    if (current?.id) {
      await base44.asServiceRole.entities.SubscriptionState.update(current.id, payload);
    } else {
      await base44.asServiceRole.entities.SubscriptionState.create({
        ...payload,
        created_by_id: user.id,
      });
    }

    await base44.asServiceRole.entities.PromoCode.update(promo.id, {
      used_at: new Date().toISOString(),
      redeemed_by_id: user.id,
    });

    const displayPlan = nextPlan === 'elite' ? 'Pro' : 'Plus';
    return json({
      ok: true,
      plan: nextPlan,
      plan_name: displayPlan,
      expires_at: nextExpiry,
      message: `${displayPlan} access activated for ${promo.duration_days || 30} days.`,
    });
  } catch (error) {
    return json({ error: error?.message || 'Could not redeem this access code.' }, 500);
  }
}
