// Cloudflare Turnstile — single server-side verification utility.
// Imported by every protected backend function (upload + AI) and by the
// verifyTurnstile auth-flow function. Never imported from client code.
//
// Enforces, in order:
//   1. secret is configured (fail closed otherwise)
//   2. token is present and structurally plausible
//   3. expected action is provided
//   4. Cloudflare Siteverify returns success=true
//   5. returned hostname is an authorized StudyOS hostname
//   6. returned action matches the expected action for this endpoint
//
// Tokens are single-use and expire ~5 minutes after issue; Cloudflare rejects
// reused/expired tokens with success=false. This utility never logs the token
// or the secret; callers receive only a generic { ok, code, status } result.

import { secrets } from "base44:runtime";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function authorizedHostnames() {
  const raw = secrets.get("TURNSTILE_AUTHORIZED_HOSTNAMES") || "";
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

// Cloudflare tokens are opaque ~200–4000 char strings of [A-Za-z0-9._-].
// Reject anything that cannot possibly be a token before making the call.
function isPlausibleToken(token) {
  return (
    typeof token === "string" &&
    token.length >= 20 &&
    token.length <= 4096 &&
    /^[A-Za-z0-9._-]+$/.test(token)
  );
}

// Verify a Turnstile token. Returns { ok: true } or { ok: false, code, status }.
// expectedAction must equal the action the widget was rendered with.
export async function verifyTurnstileToken(token, expectedAction) {
  const secret = secrets.get("TURNSTILE_SECRET");
  if (!secret) {
    return { ok: false, code: "TURNSTILE_NOT_CONFIGURED", status: 503 };
  }
  if (!expectedAction) {
    return { ok: false, code: "TURNSTILE_ACTION_MISSING", status: 400 };
  }
  if (!isPlausibleToken(token)) {
    return { ok: false, code: "TURNSTILE_TOKEN_INVALID", status: 400 };
  }

  let res;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
  } catch {
    return { ok: false, code: "TURNSTILE_VERIFY_UNAVAILABLE", status: 503 };
  }

  if (!res.ok) {
    return { ok: false, code: "TURNSTILE_VERIFY_UNAVAILABLE", status: 503 };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "TURNSTILE_VERIFY_UNAVAILABLE", status: 503 };
  }

  // success === false covers: expired, already-used, invalid, or failed tokens.
  if (!data || data.success !== true) {
    return { ok: false, code: "TURNSTILE_VERIFICATION_FAILED", status: 403 };
  }

  const allowed = authorizedHostnames();
  const returnedHost = typeof data.hostname === "string" ? data.hostname.toLowerCase() : "";
  if (allowed.length === 0 || !returnedHost || !allowed.includes(returnedHost)) {
    return { ok: false, code: "TURNSTILE_HOSTNAME_MISMATCH", status: 403 };
  }

  const returnedAction = typeof data.action === "string" ? data.action : "";
  if (returnedAction !== expectedAction) {
    return { ok: false, code: "TURNSTILE_ACTION_MISMATCH", status: 403 };
  }

  return { ok: true };
}

// Generic, non-revealing error response for a failed verification.
export function turnstileErrorResponse(result) {
  return Response.json(
    {
      error: "Security verification could not be completed. Please refresh and try again.",
      code: result.code || "TURNSTILE_FAILED",
    },
    { status: result.status || 403 }
  );
}