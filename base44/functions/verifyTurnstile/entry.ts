// Public Turnstile verification endpoint for client auth flows (login,
// registration, password-reset, OTP) that call platform-owned auth endpoints
// the app cannot gate directly. The client obtains a Turnstile token, calls
// this function to validate it server-side, and only proceeds to the platform
// auth call when ok === true. Does not require an authenticated session.
//
// This performs ONE Siteverify call; AI/upload functions validate their token
// inline via the shared utility instead of calling this function, so no
// request is verified twice.

import { verifyTurnstileToken, turnstileErrorResponse } from '../../shared/turnstile.ts';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token || '').trim();
    const action = (body.action || '').trim();

    const result = await verifyTurnstileToken(token, action);
    if (!result.ok) return turnstileErrorResponse(result);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: "Security verification could not be completed. Please refresh and try again.", code: "TURNSTILE_FAILED" },
      { status: 503 }
    );
  }
}