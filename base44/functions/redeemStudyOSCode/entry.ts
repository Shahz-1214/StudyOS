import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Only hashes live in backend source; plaintext access codes are never shipped to the client.
const CODE_DEFINITIONS: Record<string, { plan: 'pro' | 'elite'; duration: number; hint: string }> = {"3a9a176063203f78f6e8b3dce84a5a8267b8310be0e6f204dc5fb8d11b095224":{"plan":"elite","duration":30,"hint":"AE5"},"fdccf5c3cd9b820574f0e1e73970bb6fdb7efc4d14401de6f4aa84624349f6ef":{"plan":"elite","duration":30,"hint":"4D1"},"d151626ba69e33c5db73cecb5e5ac30eab6efd3b5ad2b6b9134f7c257e17cd5f":{"plan":"elite","duration":30,"hint":"6E3"},"418ca09befef7b824ca88b5bdf06c9ae6595abebc6032529690c6bf7a07968ce":{"plan":"elite","duration":30,"hint":"1B4"},"c07f89d333df0aa29e6a60d7579649c6c8d8340e851e88ae36fbec5efc543408":{"plan":"elite","duration":30,"hint":"9E3"},"72693dfe5fc04f603627ee59c515d6b98f0d6aa9b378695667a4c8a7c1b79115":{"plan":"elite","duration":30,"hint":"719"},"aa14d5bac1ec964db29937ce41249ff86a40851d95da0dd195a36fe55e716b9c":{"plan":"elite","duration":30,"hint":"FDF"},"425f697eec5bb3b0736173cf9ba1ed8bc483a557a502a6052e1e612cb52b77c8":{"plan":"elite","duration":30,"hint":"705"},"60f8ad8a9866673581b263dba36be94bf18be9f992bbfa6560e7255c0f0baaab":{"plan":"elite","duration":30,"hint":"77D"},"3d2d8817d2d50bfd80f48bf5fa2f3627f1aa8f3470c680ba5ff92d1dee2d7ead":{"plan":"elite","duration":30,"hint":"F48"}};

function json(data: any, status = 200) {
  return Response.json(data, { status });
}

const CLAIM_TTL_MS = 10 * 60 * 1000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

    const body = await req.json().catch(() => ({}));
    const normalizedCode = String(body?.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{12,64}$/.test(normalizedCode)) {
      return json({ error: 'Enter a valid StudyOS access code.', code: 'INVALID_CODE' }, 400);
    }

    const attempts = await base44.entities.Event.filter(
      { event_name: 'promo_code_attempt' },
      '-occurred_at',
      30
    );
    const cutoff = Date.now() - 60 * 60 * 1000;
    const recentAttempts = (attempts || []).filter((event) => new Date(event.occurred_at).getTime() >= cutoff);
    if (recentAttempts.length >= 10) {
      return json({ error: 'Too many code attempts. Please try again later.', code: 'PROMO_RATE_LIMITED' }, 429);
    }
    await base44.entities.Event.create({
      event_name: 'promo_code_attempt',
      properties: { source: 'server_promo_redemption' },
      occurred_at: new Date().toISOString(),
    });

    const codeHash = await sha256Hex(normalizedCode);
    const definition = CODE_DEFINITIONS[codeHash];
    if (!definition) {
      return json({ error: 'That access code is invalid or has already been used.', code: 'INVALID_OR_USED_CODE' }, 400);
    }

    const matches = await base44.asServiceRole.entities.PromoCode.filter(
      { code_hash: codeHash },
      '-created_date',
      10
    );
    if (!matches?.length) {
      // Codes are provisioned ahead of time so redemption itself never races
      // on first-use database initialization.
      return json({ error: 'That access code is invalid or has already been used.', code: 'INVALID_OR_USED_CODE' }, 400);
    }
    if (matches.some((item) => item.used_at)) {
      return json({ error: 'That access code is invalid or has already been used.', code: 'INVALID_OR_USED_CODE' }, 400);
    }

    const promo = matches[0];
    const claimId = crypto.randomUUID();
    const claimNow = new Date();
    const staleBefore = new Date(Date.now() - CLAIM_TTL_MS).toISOString();

    // Reclaim only a stale, unused claim, then atomically claim exactly one
    // record. updateMany uses a conditional filter so two concurrent redemptions
    // cannot both own the same code.
    await base44.asServiceRole.entities.PromoCode.updateMany(
      { id: promo.id, used_at: null, claimed_at: { $lt: staleBefore } },
      { $set: { claimed_at: null, claim_id: "" } }
    ).catch(() => {});

    const claimed = await base44.asServiceRole.entities.PromoCode.updateMany(
      { id: promo.id, used_at: null, claimed_at: null },
      { $set: { claimed_at: claimNow.toISOString(), claim_id: claimId } }
    );

    const claimedCount = Number(claimed?.count ?? claimed?.updated ?? claimed?.matched ?? 0);
    if (claimedCount !== 1) {
      const current = (await base44.asServiceRole.entities.PromoCode.filter({ id: promo.id }, '-updated_date', 1))?.[0];
      if (current?.used_at) {
        return json({ error: 'That access code is invalid or has already been used.', code: 'INVALID_OR_USED_CODE' }, 400);
      }
      return json({ error: 'That access code is currently being redeemed. Please try again shortly.', code: 'PROMO_BUSY' }, 409);
    }

    try {
      const durationDays = Math.max(1, Math.min(365, Number(promo.duration_days || definition.duration || 30)));
      const durationMs = durationDays * 24 * 60 * 60 * 1000;
      const subscriptions = await base44.entities.SubscriptionState.list('-created_date', 1);
      const current = subscriptions?.[0];
      const currentExpiry = current?.expires_at ? new Date(current.expires_at).getTime() : 0;
      const safeCurrentExpiry = Number.isFinite(currentExpiry) ? currentExpiry : 0;
      const nextExpiry = new Date(Math.max(Date.now(), safeCurrentExpiry) + durationMs).toISOString();

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

      const finalized = await base44.asServiceRole.entities.PromoCode.updateMany(
        { id: promo.id, claim_id: claimId, used_at: null },
        { $set: { used_at: new Date().toISOString(), redeemed_by_id: user.id, claimed_at: claimNow.toISOString() } }
      );
      const finalCount = Number(finalized?.count ?? finalized?.updated ?? finalized?.matched ?? 0);
      if (finalCount !== 1) {
        throw new Error('PROMO_FINALIZE_FAILED');
      }

      const displayPlan = nextPlan === 'elite' ? 'Pro' : 'Plus';
      return json({
        ok: true,
        plan: nextPlan,
        plan_name: displayPlan,
        expires_at: nextExpiry,
        message: displayPlan + ' access activated for ' + durationDays + ' days.',
      });
    } catch {
      // Release only our claim; this cannot consume a code if entitlement
      // activation failed.
      await base44.asServiceRole.entities.PromoCode.updateMany(
        { id: promo.id, claim_id: claimId, used_at: null },
        { $set: { claimed_at: null, claim_id: "" } }
      ).catch(() => {});
      return json({ error: 'Could not redeem this access code. Please try again.', code: 'REDEMPTION_FAILED' }, 500);
    }
  } catch {
    return json({ error: 'Could not redeem this access code. Please try again.', code: 'INTERNAL_ERROR' }, 500);
  }
}
