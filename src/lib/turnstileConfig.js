// Cloudflare Turnstile — client-side configuration and API helpers.
//
// The SITE KEY is public by design (it is embedded in the page so the
// Turnstile widget can render). It is served from the backend
// `verifyTurnstile` config endpoint (which reads the TURNSTILE_SITE_KEY
// secret) so that changing keys never requires a frontend code edit and
// dev/prod hostnames can both be allow-listed under one key in the
// Cloudflare dashboard.
//
// The SECRET is stored ONLY in backend secrets and never reaches the
// client, logs, or API responses. Server-side validation happens in
// `base44/shared/turnstileVerify.ts` against Cloudflare's canonical
// Siteverify endpoint.
//
// Turnstile enforcement activates ONLY when BOTH TURNSTILE_SITE_KEY and
// TURNSTILE_SECRET are configured. While either is unset, the gate
// bypasses (no protection) so the app stays usable during setup.

import { base44 } from "@/api/base44Client";

// Distinct action identifiers per protected endpoint (requirement #8).
export const TURNSTILE_ACTIONS = {
  login: "login",
  signup: "signup",
  password_reset: "password_reset",
  otp: "otp",
  upload: "upload",
  ai_request: "ai_request",
  contact: "contact",
};

// Module-level cache so the config endpoint is hit at most once per session.
let configPromise = null;

export function getTurnstileConfig() {
  if (!configPromise) {
    configPromise = base44.functions
      .invoke("verifyTurnstile", { config: true })
      .then((res) => ({
        enabled: !!res?.data?.enabled,
        siteKey: res?.data?.siteKey || "",
      }))
      .catch(() => ({ enabled: false, siteKey: "" }));
  }
  return configPromise;
}

// Verify a Turnstile token server-side. Returns true only when Siteverify
// succeeds, the action matches, and the hostname is authorized.
export async function verifyTurnstileToken(token, action) {
  if (!token || token === "") return false;
  try {
    const res = await base44.functions.invoke("verifyTurnstile", { token, action });
    return !!res?.data?.ok;
  } catch {
    return false;
  }
}