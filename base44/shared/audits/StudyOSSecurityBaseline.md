# StudyOS Security Baseline

Updated: 27 September 2026

## Purpose
This document maps the five pre-launch security checks from the supplied AI App Builder Security Prompts guide onto StudyOS. It is an implementation checklist, not proof of a complete penetration test.

## 1. Secret leak prevention
- Application source was swept for common private-key, AWS-key, GitHub-token, browser-exposed-secret, and console-logging patterns.
- `.env` and `.env.*` are ignored by git.
- `.env.example` contains placeholders only.
- Cloudmersive and Turnstile secrets are read server-side; no raw token is logged or returned.
- Do not reuse a production secret that was ever committed to git history; rotate it.

## 2. Personal data flow
- User-owned entities use `created_by_id` ownership rules where applicable.
- `SubscriptionState` and security ledger records cannot be self-modified by ordinary users.
- Raw provider errors are no longer sent to the browser from the audited auth/error paths.
- Auth pages use generic failure messages; password reset keeps account-existence wording non-revealing.
- StudyOS does not add personal data to browser console logs.
- Base44 authentication owns password handling; StudyOS app entities do not store plaintext passwords.
- Account-wide deletion/export remains a platform-integration task and must be completed before a production privacy commitment that promises automated deletion.

## 3. Pre-deploy production audit
- `npm run lint`, `npm run typecheck`, and `npm run build` are required gates.
- `npm run security:scan` is a static source hygiene gate.
- Debug logging in the audited frontend error/auth paths was removed.
- Backend AI and entitlement errors use generic user-facing messages.
- Login has a browser-side additional attempt guard; Base44 remains the server-side auth authority.
- Turnstile is implemented as a server-verified control for login, signup, password reset, OTP and upload-related flows where the platform permits interception.
- Security headers, CORS policy, and database transport/security are Base44 hosting/platform controls rather than Express/Helmet settings in this app. Verify them in the deployed Base44 environment rather than adding incompatible middleware.

## 4. Complex logic
- AI quota now uses reserve/commit/refund events so provider failures and rejected AI output do not count as successful usage.
- AI prompts use the shared untrusted-content rule where user-controlled study material enters the model.
- Generated MCQs, study plans, lecture material, essay analysis, homework hints, weakness analysis, StudyLens output and adaptive exams are schema-validated before being accepted.
- Adaptive-exam concept names must match the supplied weak-concept set.
- Media processing fails closed unless the exact owner/file has an APPROVED MediaSecurityScan record; content type is detected from bytes and a malware scan + sanitization gate precedes AI processing.
- Quiz mastery application is idempotent per quiz completion ID.
- Access-code redemption uses conditional claiming to reduce double-redemption races.

## 5. Attacker perspective
- Protected backend flows authenticate before accessing user data.
- User-controlled media cannot forge approval status.
- User-owned entities are scoped by creator ownership; globally readable board/resource registries are separate from learner data.
- Access-code attempts are rate-limited and redemption codes are not stored in plaintext.
- Unknown/malformed AI output is rejected rather than repaired into plausible content.
- Injection-style study material is explicitly treated as data, not instructions.

## Known platform/verification gaps
- No browser automation/E2E security harness is available in the current development tools. Real tests are still needed for login/signup/OTP/reset, Turnstile, upload scanning, LectureMind, StudyLens, quota exhaustion/refund, two-account isolation, expired credentials, mobile layouts and 404/401/403 flows.
- Cloudmersive's current scanner ceiling is enforced fail-closed at 3.5 MB in the security function; larger files are not allowed to bypass scanning.
- Media retention/cleanup needs a scheduled lifecycle policy.
- A true cross-request transaction primitive is not exposed by the current Base44 entity API; reservation/conditional-claim logic reduces races but does not replace a database transaction.
- Account-wide deletion/export and provider-level AI retention settings require a final operational/legal review.

## Re-run rule
Run the five checks again after major changes to authentication, uploads, AI processing, entitlements/payments, or new data collection.