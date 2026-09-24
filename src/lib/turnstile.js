// Client helper for Turnstile verification on auth flows.
// Used only by login / registration / password-reset / OTP screens, which call
// platform-owned auth endpoints that cannot be gated directly. The token is
// validated server-side by the verifyTurnstile backend function (real
// Cloudflare Siteverify) before the caller proceeds.
//
// AI and upload flows do NOT use this: they pass the token in their payload
// and the receiving backend function validates it inline, so each token is
// verified exactly once.

import { base44 } from "@/api/base44Client";
import { TURNSTILE_ENABLED } from "@/lib/turnstileConfig";

export async function verifyTurnstileClient(token, action) {
  if (!TURNSTILE_ENABLED) return false;
  if (!token || !action) return false;
  try {
    const res = await base44.functions.invoke("verifyTurnstile", { token, action });
    return !!res?.data?.ok;
  } catch {
    return false;
  }
}