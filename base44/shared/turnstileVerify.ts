// Server-side Cloudflare Turnstile verification utility. ONE canonical
// implementation shared by the `verifyTurnstile` endpoint (auth flows) and
// any backend function that enforces Turnstile directly (e.g. the upload
// security gate). Never duplicated.
//
// Security rules:
//   - The secret is read from secrets and NEVER returned, logged, or sent
//     anywhere except to Cloudflare's Siteverify endpoint.
//   - Raw tokens are never logged.
//   - All failures return a generic user-facing message; internal codes are
//     returned for server-side logging/branching only.
//   - A client-provided boolean (e.g. turnstilePassed=true) is never trusted;
//     only a real token validated via Siteverify is accepted.
//
// Enforcement activates ONLY when BOTH TURNSTILE_SITE_KEY and TURNSTILE_SECRET
// are configured. While either is unset the gate bypasses ({ ok: true }) so
// the app stays usable during initial setup; once both are set, every
// protected request must present a valid token.

import { secrets } from 'base44:runtime';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const GENERIC_FAIL = 'Verification failed. Please try again.';
const GENERIC_UNAVAILABLE = 'Verification is unavailable right now. Please try again.';

function getSecret(name) {
  try {
    return secrets.get(name) || '';
  } catch {
    return '';
  }
}

function isConfigured() {
  return !!(getSecret('TURNSTILE_SECRET') && getSecret('TURNSTILE_SITE_KEY'));
}

export function turnstileConfigStatus() {
  return { enabled: isConfigured() };
}

// Returns { ok: boolean, error?: string, code?: string }.
// ok=true with code NOT_CONFIGURED means the feature is inactive (bypass).
export async function verifyTurnstileToken(token, expectedAction, remoteIp) {
  if (!isConfigured()) {
    return { ok: true, code: 'NOT_CONFIGURED' };
  }
  if (!token || typeof token !== 'string' || token.length < 16 || token.length > 4096) {
    return { ok: false, error: GENERIC_FAIL, code: 'TOKEN_MISSING_OR_MALFORMED' };
  }
  if (!expectedAction || typeof expectedAction !== 'string') {
    return { ok: false, error: GENERIC_FAIL, code: 'ACTION_MISSING' };
  }
  const secret = getSecret('TURNSTILE_SECRET');
  const authorizedRaw = getSecret('TURNSTILE_AUTHORIZED_HOSTNAMES').toLowerCase();
  const authorized = authorizedRaw
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (remoteIp) form.append('remoteip', remoteIp);
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!res.ok) {
      return { ok: false, error: GENERIC_UNAVAILABLE, code: 'SITEVERIFY_HTTP_ERROR' };
    }
    const data = await res.json();
    // success === false covers: expired token, already-used token, malformed,
    // and any error-codes Cloudflare returns. Never trust a client boolean.
    if (!data || data.success !== true) {
      return { ok: false, error: GENERIC_FAIL, code: 'SITEVERIFY_FAILED' };
    }
    if (data.action && String(data.action) !== expectedAction) {
      return { ok: false, error: GENERIC_FAIL, code: 'ACTION_MISMATCH' };
    }
    if (
      data.hostname &&
      authorized.length &&
      !authorized.includes(String(data.hostname).toLowerCase())
    ) {
      return { ok: false, error: GENERIC_FAIL, code: 'HOSTNAME_NOT_AUTHORIZED' };
    }
    return { ok: true, code: 'OK' };
  } catch {
    return { ok: false, error: GENERIC_UNAVAILABLE, code: 'SITEVERIFY_ERROR' };
  }
}