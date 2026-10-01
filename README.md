# StudyOS

**StudyOS** is a connected AI study workspace that brings understanding, practice, exam preparation, resources, and planning into one student workflow.

Instead of switching between separate websites and tools, students can use StudyOS to work through difficult questions, turn notes into quizzes, process lectures, improve essays, prepare for exams, review past papers and textbooks, identify weak concepts, and organize what to study next.

## Why StudyOS exists

StudyOS was created around a practical student problem: useful school and board-exam resources are often scattered, difficult to find, restricted by paywalls or geography, or separated across different platforms. The product aims to reduce that resource-hunting overhead and give students one connected place to learn.

## Core features

- **StudyLens** — guided understanding of difficult questions, including extraction, reasoning, and hints.
- **Homework Coach** — step-by-step help that guides students without simply replacing the work.
- **Note → Quiz** — turns study notes into interactive practice.
- **LectureMind** — processes lecture material into searchable study resources, summaries, flashcards, concepts, and Q&A.
- **EssayCheck** — rubric-based feedback on writing quality, structure, argument, grammar, and readability.
- **ExamPilot** — exam information, planning, adaptive practice, and past-paper preparation.
- **Weakness AI** — surfaces concepts that need more attention using learner performance data.
- **Tasks / StudySync / FocusStudy** — connect daily study actions and focus sessions to the larger plan.
- **Resources** — board-specific textbooks, past papers, exam dates, subjects, and other study material.
- **Mastery tracking** — shared learner state connects learning activity, practice results, weaknesses, and planning.

## Tech stack

- React + Vite + JavaScript
- Base44 backend, entities, authentication, storage, and server functions
- RevenueCat Web SDK for the purchase flow
- TanStack Query
- Tailwind CSS
- Framer Motion
- Recharts
- React Router
- Cloudflare Turnstile
- Cloudmersive media-security scanning
- GitHub for version control and synchronization

## Architecture

The application is designed as one connected learner-state system rather than a collection of unrelated AI pages:

```
INPUT
  ↓
UNDERSTAND → TEACH → PRACTICE → MEASURE
  ↓
IDENTIFY WEAKNESS → ADAPT PLAN → STUDY → REASSESS → PROGRESS
```

Business-critical calculations such as scoring, mastery updates, scheduling, and validation are kept deterministic. AI capabilities are isolated behind server-side functions, and user-owned data uses row-level security.

The `base44/` directory contains the exported backend configuration, entities, shared services, and server functions. The `src/` directory contains the React application.

## Repository structure

```
src/                    React UI, pages, components, shared client logic
base44/entities/        Base44 data models
base44/functions/       Server-side application functions
base44/shared/          Shared server utilities, security, subscriptions, learner logic
scripts/                Local validation and security checks
ARCHITECTURE.md         Detailed system architecture
REVENUECAT_SETUP.md     RevenueCat purchase configuration and verification
NATIVE_HANDOFF.md       Native Android/Galaxy integration notes
```

## Run locally

### Prerequisites

- Node.js
- npm
- Base44 CLI
- Deno

### Setup

```bash
git clone https://github.com/Shahz-1214/Studyos.git
cd Studyos

npm install
npm install -g base44@latest

base44 login
base44 link
base44 dev
```

Open the URL printed by `base44 dev`.

For frontend work against the hosted Base44 backend:

```bash
base44 dev --remote
```

Do not commit secrets. Environment files such as `.env` are excluded by `.gitignore`.

## Validation

The repository includes these checks:

```bash
npm run lint
npm run typecheck
npm run build
npm run security:scan
```

The current exported code passes all four checks. The security scan checks application source for common private-key, cloud-token, public-secret, and logging patterns.

## RevenueCat

StudyOS includes a RevenueCat-powered web purchase flow and server-side verification. Configuration details, entitlements, webhook setup, test-store instructions, and the end-to-end verification flow are documented in [REVENUECAT_SETUP.md](./REVENUECAT_SETUP.md).

The Next Gen submission is evaluated from the demo video and public source repository; no app-store release is required for this category.

## License

StudyOS is released under the MIT License. See [LICENSE](./LICENSE).
