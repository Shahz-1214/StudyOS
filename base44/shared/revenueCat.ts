// RevenueCat protocol helpers — deterministic, no AI anywhere in this file.
//
// This module is the ONE place that knows how a RevenueCat entitlement id, a
// RevenueCat webhook event and a RevenueCat customer record map onto a StudyOS
// plan and grant state. A plan value is never read out of a webhook payload:
// only the mapped entitlement id decides the tier, exactly as the access-code
// path decides its own.

import type { StudyOSPlan } from './subscriptionPlans.ts';

// RevenueCat entitlement id -> StudyOS plan id. The entitlement identifiers
// created in RevenueCat must be exactly these two names.
export const REVENUECAT_ENTITLEMENT_PLANS: Record<string, StudyOSPlan> = {
  pro: "pro",
  elite: "elite",
};

// Highest tier first — used to pick the strongest entitlement a customer holds.
export const TIER_ORDER: StudyOSPlan[] = ["elite", "pro", "free"];

export type RevenueCatGrantStatus = "active" | "expired";

// Access keeps running until the grant's own expiration timestamp. This covers
// auto-renew turned off, a failed charge RevenueCat is still retrying, and a
// scheduled pause — RevenueCat's own guidance is to revoke access only on
// EXPIRATION, so none of these downgrade a learner early.
const ACCESS_CONTINUING_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
  "REFUND_REVERSED",
  "CANCELLATION",
  "BILLING_ISSUE",
  "SUBSCRIPTION_PAUSED",
]);

// Access has ended.
const ACCESS_ENDING_EVENTS = new Set(["EXPIRATION"]);

/**
 * Grant status implied by a RevenueCat event type, or null when the event must
 * not change any grant (RevenueCat's own TEST event and any type we do not
 * recognise — a new event type must never silently move a learner's plan).
 */
export function grantStatusForEvent(type: unknown): RevenueCatGrantStatus | null {
  const value = String(type || "");
  if (ACCESS_ENDING_EVENTS.has(value)) return "expired";
  if (ACCESS_CONTINUING_EVENTS.has(value)) return "active";
  return null;
}

/** The strongest StudyOS tier among the mapped RevenueCat entitlement ids. */
export function planFromEntitlementIds(ids: unknown): StudyOSPlan | null {
  const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
  let best: StudyOSPlan | null = null;
  for (const id of list) {
    const plan = REVENUECAT_ENTITLEMENT_PLANS[String(id)];
    if (!plan) continue;
    if (!best || TIER_ORDER.indexOf(plan) < TIER_ORDER.indexOf(best)) best = plan;
  }
  return best;
}

function laterOf(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function isFuture(iso: string | null, now: number): boolean {
  if (!iso) return true;
  const ms = new Date(iso).getTime();
  return !Number.isFinite(ms) || ms > now;
}

/**
 * The grant a completed purchase verification yields, read from RevenueCat's
 * own customer record. Returns null when the customer holds no active mapped
 * entitlement. Never invents a tier: an unrecognised entitlement id is ignored.
 */
export function grantFromSubscriber(subscriber: any, now = Date.now()): {
  plan: StudyOSPlan;
  status: RevenueCatGrantStatus;
  expires_at: string | null;
  product_id: string;
} | null {
  const entitlements = subscriber?.entitlements || {};
  let best: { plan: StudyOSPlan; expires_at: string | null; product_id: string } | null = null;

  for (const [entitlementId, info] of Object.entries(entitlements)) {
    const plan = REVENUECAT_ENTITLEMENT_PLANS[entitlementId];
    if (!plan) continue;
    // A grace period keeps access alive after the paid period ends.
    const expiresAt = laterOf(info?.expires_date || null, info?.grace_period_expires_date || null);
    if (!isFuture(expiresAt, now)) continue;
    const candidate = { plan, expires_at: expiresAt, product_id: String(info?.product_identifier || "") };
    if (!best) {
      best = candidate;
      continue;
    }
    const stronger = TIER_ORDER.indexOf(plan) < TIER_ORDER.indexOf(best.plan);
    const sameButLonger =
      plan === best.plan &&
      new Date(candidate.expires_at || "9999-12-31").getTime() >
        new Date(best.expires_at || "9999-12-31").getTime();
    if (stronger || sameButLonger) best = candidate;
  }

  if (!best) return null;
  return { plan: best.plan, status: "active", expires_at: best.expires_at, product_id: best.product_id };
}

/**
 * The RevenueCat grant fields to persist for a verified grant. Only these
 * fields are ever written by the RevenueCat paths — the base grant
 * (plan/status/expires_at) belongs to access-code redemption alone.
 */
export function revenueCatGrantFields(grant: {
  plan: StudyOSPlan;
  status: RevenueCatGrantStatus;
  expires_at: string | null;
  product_id: string;
  app_user_id: string;
}) {
  return {
    rc_plan: grant.plan,
    rc_status: grant.status,
    rc_expires_at: grant.expires_at,
    rc_product_id: grant.product_id || "",
    rc_app_user_id: grant.app_user_id,
  };
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

/**
 * Constant-time comparison of the incoming webhook authorization header against
 * the configured secret. Both sides are hashed first so the comparison never
 * depends on the caller's input length, and a missing secret always fails
 * closed.
 */
export async function isWebhookAuthorized(provided: string, expected: string): Promise<boolean> {
  if (!provided || !expected) return false;
  const [a, b] = await Promise.all([sha256Bytes(provided), sha256Bytes(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * RevenueCat's own customer record for an app user id. The app user id is
 * always the authenticated learner's server-side user id, so verification and
 * webhooks resolve the same learner.
 */
export async function fetchRevenueCatSubscriber(appUserId: string, secretApiKey: string) {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretApiKey}`,
        Accept: "application/json",
      },
    }
  );
  if (!response.ok) {
    return { ok: false as const, status: response.status };
  }
  const data = await response.json().catch(() => null);
  return { ok: true as const, subscriber: data?.subscriber ?? null };
}