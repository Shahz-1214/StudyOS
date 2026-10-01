# StudyOS — Architecture & Implementation Plan

> AI academic operating system for Shipaton 2026. One connected learner state machine with ten views on the same data.

## 1. Product model

StudyOS is **not** ten independent AI tools. It is one learner-state machine with ten features that read and update the same canonical data:

```
INPUT → UNDERSTAND → TEACH → PRACTICE → MEASURE → IDENTIFY WEAKNESS → ADAPT PLAN → STUDY → REASSESS → PROGRESS
```

## 2. Layers (kept separate for exportability)

```
UI (React pages/components)
   ↓ uses
Application logic (src/lib/* — deterministic, no AI, no vendor lock-in)
   ↓ calls
Data operations (Base44 entities SDK + RLS)
   ↓ isolated behind
AI operations (backend functions / service interfaces — server-side only)
   ↓ auth
Authentication (Base44 platform auth) + Subscriptions (entitlement abstraction)
```

Business-critical logic (mastery math, scheduling, scoring, validation) lives in `src/lib/` as pure functions — portable to any client. AI never directly mutates mastery.

## 3. Data model (Base44 entities)

Stage 1 (live): `LearnerProfile`, `Subject`, `Concept`, `Event`.
Later stages add: `Exam`, `SyllabusItem`, `Task`, `Note`, `NoteChunk`, `Lecture`, `LectureChunk`, `Essay`, `Question`, `Quiz`, `QuizAttempt`, `AnswerAttempt`, `MasteryRecord`, `StudySession`, `Recommendation`, `NotificationPreference`, `SubscriptionState`, `ConceptPrerequisite`.

**Ownership / authorization:** every user-owned entity has RLS anchored on `created_by_id` — a user can only read/update/delete their own records. No user can query another's notes, quizzes, lectures, or progress.

## 4. Canonical learner state

One `Concept.mastery` per concept, updated **only** by deterministic code in `src/lib/learnerState.js`:

```
mastery = 0.45·recentAccuracy + 0.20·historicalAccuracy + 0.20·difficultyPerformance + 0.15·confidence
```

with exponential smoothing so one question can't swing a score. No feature keeps a hidden "weakness score." Concept states: Critical Weakness / Weak / Developing / Strong / Mastered.

## 5. AI service boundaries

Each AI capability is a server-side backend function behind a service interface — never a generic chatbot, never client-side keys:

- `VisionService` (StudyLens OCR/extraction)
- `TutorService` (Homework Coach guided hints)
- `QuizGenerationService` (Note → Quiz, schema-validated)
- `SpeechService` (LectureMind transcription)
- `EssayAnalysisService` (EssayCheck rubric + LLM feedback)
- `RetrievalService` (lecture/note chunk retrieval)

Every AI output is validated (JSON structure, required fields, answer existence, difficulty range, text limits). Invalid output is retried or rejected — never silently saved.

## 6. Cost control

Deterministic code handles: quiz scoring, mastery, progress, scheduling, timers, streaks, subscription state, simple calculations. AI is used only for language, reasoning, interpretation, summarization, tutoring, image understanding, essay evaluation. Results are cached; identical quiz questions are not regenerated.

## 7. Analytics

Centralized in `src/lib/analytics.js`. `track(event, properties)` fires platform analytics **and** persists an `Event` record so charts derive from immutable events. One place — never scattered.

## 8. Subscriptions / RevenueCat

Shipaton requires RevenueCat. The Base44 web/PWA environment cannot provide the native RevenueCat SDK. Therefore StudyOS implements:

- An **entitlement abstraction** (`SubscriptionState` entity + UI/backend contracts) — stage 6.
- UI for subscription states and paywall.

**Remaining native Android step (documented, not faked):** the exported Android/Galaxy shell integrates the RevenueCat Android SDK, maps entitlements to the same `SubscriptionState`, and handles purchases via RevenueCat. A Base44-only build does **not** satisfy the RevenueCat requirement on its own.

## 9. Galaxy / foldable readiness

The web/PWA uses responsive split layouts (document | tutor, PDF | quiz, lecture | notes) that map naturally to foldable/foldable-spanning windows. A `galaxy_mode` flag is stored on the profile.

**Native Galaxy layer (future, separate from this web build):**
- Galaxy Store release packaging
- Foldable window-size-class layouts (spanning / hinge-aware split)
- S Pen handwriting capture for StudyLens
- Camera capture for StudyLens
- Android notifications & widgets for study blocks
- Multi-window support

This web/PWA is **not** itself a native Galaxy Store app — it is the production-ready foundation and business logic that the native client wraps.

## 10. Build stages

1. **Foundation ✓ FUNCTIONAL:** auth, LearnerProfile, subjects, concepts, Event analytics, dashboard, onboarding, profile, read-only progress.
2. **Learning engine ✓ FUNCTIONAL:** questions, quizzes, attempts, deterministic mastery updates, progress charts.
3. **Core AI ✓ FUNCTIONAL:** StudyLens, Homework Coach, Note → Quiz.
4. **Adaptive planning ✓ FUNCTIONAL:** Weakness AI, ExamPilot, FocusStudy, Tasks, and StudySync.
5. **Advanced content ✓ FUNCTIONAL:** LectureMind (transcribe → chunks → flashcards → Q&A), EssayCheck (rubric, no rewrite).
6. **Subscriptions ✓ FUNCTIONAL:** `SubscriptionState` entity + `checkEntitlement` function + paywall UI. RevenueCat purchase is the native step (see NATIVE_HANDOFF.md).
7. **Polish ✓ FUNCTIONAL:** global ErrorBoundary, Galaxy/foldable split layout (Homework Coach), loading/empty states, centralized analytics.
8. **Export ✓ FUNCTIONAL:** GitHub sync, this document, native Android/Galaxy handoff spec (NATIVE_HANDOFF.md).

## 11. Status legend

- **FUNCTIONAL** — works end to end on real persisted data.
- **DEMO FALLBACK** — deterministic stand-in, clearly labelled, used only when AI is unavailable.
- **NOT YET IMPLEMENTED** — planned for a later stage; shown via an honest status page, never faked.

Stages 1–7 are FUNCTIONAL end to end on real persisted data. The ten core modules — StudyLens, Homework Coach, Note → Quiz, LectureMind, EssayCheck, ExamPilot, Weakness AI, FocusStudy, Tasks, and StudySync — are represented in the current application and share the learner workflow. The web/PWA is the production-ready foundation; the native Android/Galaxy client wraps it and adds RevenueCat purchases + Galaxy-specific capabilities (NATIVE_HANDOFF.md).