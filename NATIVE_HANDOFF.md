# StudyOS — Native Android/Galaxy Handoff Spec

The Base44 web/PWA is the production-ready foundation: all business logic (mastery math, scheduling, scoring, entitlements), AI service interfaces, data model, and UI. The native Android/Galaxy client wraps this foundation and adds only what the web environment cannot provide.

## 1. What the native client adds

| Capability | Why native | Contract |
|---|---|---|
| RevenueCat purchases | Shipaton requires RevenueCat; the web/PWA cannot host the native SDK | Maps purchases → `SubscriptionState` entity (below) |
| Galaxy Store packaging | Distribution | Standard AAB/APK |
| Foldable / hinge-aware layouts | Spanning window-size-class | The web already uses responsive split layouts; native maps window-size-class to the same breakpoints |
| S Pen handwriting capture | StudyLens input | Captured strokes → image → existing `studyLensExtract` function |
| Camera capture | StudyLens input | Photo → `UploadPublicFile` → existing `studyLensExtract` flow |
| Android notifications & widgets | Study-block reminders | Read `StudyPlan` + `Event` entities; schedule locally |
| Multi-window | Productivity | The split layouts already support side-by-side |

## 2. Entitlement mapping (RevenueCat ↔ StudyOS)

The web app owns the entitlement abstraction so the native client only translates:

- **Entity:** `SubscriptionState` (`plan`: `free` | `pro` | `elite`, `status`, `expires_at`) — one record per user, RLS-anchored on `created_by_id`.
- **Backend function:** `checkEntitlement` → returns `{ plan, is_pro, ai_used_today, ai_limit, remaining }`. Both web and native call this.
- **Native flow:** RevenueCat purchase succeeds → native writes the entitlement to the **same** `SubscriptionState` entity via the Base44 SDK (update `plan` + `expires_at`). No app-side business logic changes — `checkEntitlement` already reads it.
- **RevenueCat offering IDs** (recommended): `studyos_free`, `studyos_pro_monthly`, `studyos_elite_monthly`.

The web Subscription page performs mock plan changes for demo/QA; the native client replaces that button with the real RevenueCat purchase flow and writes the result to `SubscriptionState`.

## 3. AI service interfaces (unchanged on native)

All AI runs server-side behind backend functions — the native client calls them via the same Base44 SDK (`base44.functions.invoke`), never embedding keys:

- `studyLensExtract`, `homeworkCoach`, `generateQuizFromNotes`, `generateAdaptiveExam`, `generateStudyPlan`, `analyzeWeaknesses`, `processLecture`, `askLecture`, `analyzeEssay`, `checkEntitlement`.

## 4. Galaxy/foldable readiness

The web uses responsive split layouts (e.g. Homework Coach: problem | hints) that map to foldable spanning windows. The `galaxy_mode` flag on `LearnerProfile` is reserved for native-only hinge-aware behavior (e.g. forcing split across the fold). No web change required.

## 5. What is explicitly NOT faked

- Real RevenueCat purchases are **not** simulated in the web build — the entitlement layer is real and the purchase is documented as the native step.
- The web build is **not** itself a Galaxy Store app — it is the foundation the native client wraps.

## 6. Data the native client reads/writes

Same Base44 entities, same RLS — no separate schema. The native client authenticates via the Base44 platform auth and operates on the current user's records only.