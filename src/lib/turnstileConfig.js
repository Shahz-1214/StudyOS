// Cloudflare Turnstile (Managed mode) — public client configuration.
//
// TURNSTILE_SITE_KEY is PUBLIC by design (Cloudflare embeds it in client
// bundles). It is safe to ship to the browser; only TURNSTILE_SECRET is secret.
//
// NEEDS VERIFICATION: replace the placeholder below with your Cloudflare
// Turnstile site key (Cloudflare dashboard → Turnstile → your widget).
// Until a real key is set, TURNSTILE_ENABLED is false and the widget renders
// nothing, so protected forms cannot be submitted (fail-closed).

export const TURNSTILE_SITE_KEY = "0x4XXXXXXXXXXXXXXXXX"; // PLACEHOLDER — replace before use

export const TURNSTILE_ENABLED =
  !!TURNSTILE_SITE_KEY && !TURNSTILE_SITE_KEY.startsWith("0x4XXX");

// Canonical action identifiers. Each protected surface renders the widget
// with exactly one action; the server rejects tokens whose returned action
// does not match the expected one for that endpoint.
export const TURNSTILE_ACTIONS = {
  login: "login",
  signup: "signup",
  password_reset: "password_reset",
  otp: "otp",
  upload: "upload",
  ai_request: "ai_request",
  contact: "contact",
};