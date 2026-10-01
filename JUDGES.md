# StudyOS — Judge / Reviewer Testing Guide

## Fastest way to evaluate the project

StudyOS is submitted to the Shipaton **Next Gen Award**, so evaluation is based on the demonstration video and public open-source repository.

For the live application:

1. Create or sign in to a StudyOS account.
2. Complete onboarding so subjects and learner state are initialized.
3. Start with the Dashboard and then try the learning workflow:
   - StudyLens
   - Homework Coach
   - Note → Quiz
   - LectureMind
   - EssayCheck
   - ExamPilot
   - Weakness AI
   - Tasks
   - StudySync
   - FocusStudy
4. Use the resource surfaces for board-specific textbooks, past papers, exam dates, and subject resources.
5. Visit **Subscription** to inspect Free, Plus, and Pro plan behavior and the RevenueCat purchase configuration when available.

## Premium testing

StudyOS resolves paid access only from server-verified sources.

- A configured RevenueCat purchase is verified server-side before the StudyOS entitlement is recorded.
- The Subscription page also supports server-issued StudyOS access codes.
- Any free-trial or Test Store duration is controlled by the RevenueCat dashboard configuration; it is not hardcoded into the application source.

For a formal reviewer session that needs every premium feature without waiting for a purchase, the project owner can provide a valid server-issued access code separately.

## Admin-only Demo Mode

**Demo Mode is intentionally not a public-user feature.**

It requires an authenticated StudyOS account with the admin role plus the administrator demo access code. It provides the controlled owner/demo environment with unlimited demo AI usage and no credit deductions while preserving the underlying learner data.

Do not publish the administrator demo code in this repository.

## Local development

See README.md for the complete Base44 local-development setup.

Important:

- base44 link connects a clone to the StudyOS Base44 project.
- base44 dev runs the local Base44 backend and frontend together.
- .env files and base44/.app.jsonc are intentionally gitignored.
- Production secrets belong in Base44 secrets, never in source control.

## Validation

Run:

npm run lint
npm run typecheck
npm run build
npm run security:scan

All four checks pass on the current submission source.
