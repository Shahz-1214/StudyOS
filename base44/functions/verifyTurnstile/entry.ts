import { secrets } from 'base44:runtime';
import { verifyTurnstileToken, turnstileConfigStatus } from '../../shared/turnstileVerify.ts';

// Public Cloudflare Turnstile endpoint. Serves two responsibilities so no
// duplicate endpoints exist:
//   1. { config: true }  -> returns the public site key + enabled flag (used
//      by the frontend widget; the site key is public by design).
//   2. { token, action } -> server-side Siteverify validation for auth flows
//      (login / signup / password_reset / otp) whose platform endpoints we
//      cannot modify.
//
// This endpoint is intentionally unauthenticated: login/signup occur before
// a session exists. It grants nothing on its own — it only validates a
// single-use token; the real protected action is still performed by the
// platform auth SDK / the gated backend function.

function getRemoteIp(req) {
  try {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
  } catch {
    /* ignore */
  }
  return '';
}

export default async function (req) {
  try {
    const body = await req.json();

    // Config request — return public site key + enabled flag.
    if (body && body.config === true) {
      const enabled = turnstileConfigStatus().enabled;
      let siteKey = '';
      try {
        siteKey = secrets.get('TURNSTILE_SITE_KEY') || '';
      } catch {
        siteKey = '';
      }
      return Response.json({ enabled, siteKey });
    }

    // Verification request — validate the token server-side.
    const token = String((body && body.token) || '');
    const action = String((body && body.action) || '');
    const result = await verifyTurnstileToken(token, action, getRemoteIp(req));
    if (result.ok) {
      return Response.json({ ok: true });
    }
    return Response.json(
      { ok: false, error: result.error || 'Verification failed. Please try again.' },
      { status: 400 }
    );
  } catch {
    return Response.json(
      { ok: false, error: 'Verification failed. Please try again.' },
      { status: 400 }
    );
  }
}