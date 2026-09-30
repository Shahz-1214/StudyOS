# RevenueCat purchase integration

This document covers the RevenueCat integration in StudyOS: what is wired up in the
code, what must exist in the RevenueCat dashboard, and how to verify it end to end.

## What the integration does

- The existing **Subscription** page hosts the purchase action inside the existing plan
  cards. There is no new page, no new navigation entry and no new entitlement endpoint.
- RevenueCat's **web SDK** (`@revenuecat/purchases-js`, pinned to `^1.67.0`) powers the
  purchase. It is loaded lazily, only when the purchase action is used on the
  subscription surface, and it is initialised with the learner's **StudyOS user id as the
  RevenueCat app user id**, so verification and webhooks identify the same learner.
- A completed purchase is **verified server-side** against RevenueCat's REST API using the
  secret API key. Nothing the client claims about a purchase is trusted.
- Subscription events are written to the recorded **RevenueCat grant** by a webhook that
  authenticates its caller and is idempotent and monotonic.
- Plan resolution is **deterministic** (no AI): the valid grant with the furthest expiry
  wins, ties go to the higher tier, and no valid grant means free. The access-code grant
  and the RevenueCat grant are stored separately, so neither can overwrite the other.

### Where the code lives

| Concern | File |
| --- | --- |
| RevenueCat protocol mapping, REST lookup, webhook auth | `base44/shared/revenueCat.ts` |
| Deterministic grant resolution + plan limits | `base44/shared/subscriptionPlans.ts` |
| Server-side verification of a completed purchase | `base44/functions/verifyRevenueCatPurchase/entry.ts` |
| RevenueCat subscription webhook | `base44/functions/revenueCatWebhook/entry.ts` |
| Entitlement read (also delivers the purchase configuration) | `base44/functions/checkEntitlement/entry.ts` |
| Purchase action on the subscription surface | `src/components/subscription/PlanPurchaseButton.jsx` |

## 1. RevenueCat project setup

These steps can only be done by the project owner in the RevenueCat dashboard.

1. Create a **project** (record its project id — the submission form asks for it).
2. Connect a billing provider and create a **Web** configuration in the project
   dashboard. RevenueCat Billing requires a Stripe account; Stripe Billing and
   Paddle Billing are also supported by the web SDK.
3. Create **two entitlements**, using these exact identifiers:
   - `pro`
   - `elite`

   These two ids are what `base44/shared/revenueCat.ts` maps onto StudyOS plan ids. An
   entitlement named anything else (for example "Plus" or "Pro") does **not** map, and a
   purchase of it grants nothing.
4. Create a product for each tier (monthly, and optionally annual) and attach it to an
   **offering** as a package. The current offering (`current`) is the one the app presents.

   **Naming requirement — this is how a package is attached to a plan card.** The
   RevenueCat web SDK does not expose a product's entitlements to the browser, so a
   package is matched to a plan when its **package identifier or product identifier
   contains the entitlement id as a separate word**: for example product
   `studyos_pro_monthly`, or package identifiers `pro_monthly` and `elite_monthly`. Give
   each tier its own custom package identifier rather than relying on the predefined
   types. A plan whose package cannot be matched shows the honest unavailable state
   instead of a purchase button, and the tier that is actually granted always comes from
   the server's verification of the RevenueCat entitlement — never from this match.
5. For a demo without real payment: enable the **Test Store** for the project and use its
   API key. Test purchases behave like real purchases (they trigger entitlements and are
   verified by the same server path). Test Store requires web SDK 1.15.0 or later; this
   repository pins 1.67.0 or later.
   - Note for demos: a Test Store monthly subscription renews every 5 minutes and renews
     up to 5 times before it cancels, so a long-running demo can show a renewal or an
     expiry quickly.

## 2. App secrets

Set these three secrets in the app's dashboard (Settings → Secrets / environment
variables). They are never returned to the client; only the publishable key leaves the
server, delivered as configuration from the entitlement read.

| Secret | Where it comes from | Used by |
| --- | --- | --- |
| `REVENUECAT_PUBLIC_WEB_KEY` | RevenueCat → Project settings → API keys → the **publishable** web key (or the Test Store key for a Test Store demo) | `checkEntitlement` (delivered to the browser) |
| `REVENUECAT_SECRET_API_KEY` | RevenueCat → Project settings → API keys → **secret** API key | `verifyRevenueCatPurchase` |
| `REVENUECAT_WEBHOOK_AUTH_SECRET` | A value **you choose**. Paste the same value into the RevenueCat webhook's Authorization header | `revenueCatWebhook` |

If `REVENUECAT_PUBLIC_WEB_KEY` is unset, the subscription page shows its honest
unavailable state and the access-code path keeps working exactly as before.

## 3. Webhook

In RevenueCat → Integrations → Webhooks, create a webhook pointing at the app's
`revenueCatWebhook` endpoint.

- **Endpoint URL**: take the public URL of the `revenueCatWebhook` function from the app
  dashboard (Code → Functions → `revenueCatWebhook`) **after the app is published**.
  The function URL does not exist until the app has a published domain.
- **Authorization header**: paste exactly the value you set as
  `REVENUECAT_WEBHOOK_AUTH_SECRET`. The value is compared literally — if you include a
  `Bearer ` prefix in RevenueCat, include the same prefix in the secret.
- **NEEDS VERIFICATION**: the webhook cannot receive real events until the app is
  published, because RevenueCat needs a reachable public URL. Until then, entitlements
  stay correct through server-side verification, which runs after a purchase and once
  when the subscription page is opened.

The webhook writes only the recorded RevenueCat grant fields
(`rc_plan`, `rc_status`, `rc_expires_at`, `rc_product_id`, `rc_app_user_id`,
`rc_last_event_id`, `rc_last_event_at`). It never writes `plan`, `status` or
`expires_at` — those belong to access-code redemption.

Event handling: purchase, renewal, product change, uncancellation, extension, a
reversed refund, an auto-renew cancellation, a billing issue and a scheduled pause all
keep access running until RevenueCat's own expiration timestamp; `EXPIRATION` ends it.
RevenueCat's `TEST` event and any unrecognised event type change nothing.

## 4. Verifying it works

1. Set the three secrets.
2. Open the Subscription page while signed in as the account you are testing.
3. Choose a paid plan. If RevenueCat is configured and an offering is available, the plan
   card shows the price from RevenueCat and the purchase action opens the RevenueCat
   purchase flow.
4. Complete the purchase (Test Store shows a modal with simulate-success / failure /
   cancel).
5. The page verifies the purchase server-side and then shows the paid plan and its
   credits. A cancelled or failed purchase grants nothing and surfaces the reason inline.
6. To check the webhook, use RevenueCat's "send test event": the documented response for
   `TEST` is `{"ok":true,"ignored":true,...}` — a test event intentionally changes no
   grant.

## 5. Submission notes

- The submission requires a **visible open-source licence** in the repository. The licence
  is the owner's choice and has deliberately **not** been assumed here; the licence file
  still needs to be added.
- Judge access to premium features can reuse the existing access-code path
  (`base44/functions/redeemStudyOSCode/entry.ts`) — no RevenueCat access is needed for
  that, and access-code grants are unaffected by RevenueCat events.
- RevenueCat's native SDKs and RevenueCat Ads are intentionally **not** part of this
  integration: this runtime has no native layer, and the web purchase is what the rules
  accept.