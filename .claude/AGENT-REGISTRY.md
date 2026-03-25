# AXON — Agent Registry (Master Index)

> **Purpose:** Single source of truth for ALL agents. The Architect agent consults this index to select which agents to spawn per session.
> **Updated:** 2026-03-25 (v2 — post-audit)
> **Total agents:** 74 (organized in 12 sections + cross-cutting)

## Implicit Rules

1. **IF-01 is transitive:** ALL agents that use service files (which import `lib/api.ts`) implicitly depend on IF-01. This is NOT listed per-agent to avoid noise — it's assumed.
2. **AS-02 is transitive:** ALL frontend agents that render authenticated UI implicitly depend on AS-02 (AuthContext). Same rule.
3. **Protected files:** `App.tsx`, `routes.tsx`, `*Layout.tsx` are owned by NO agent. They are protected and require manual changes.
4. **shadcn/ui (48 files):** `components/ui/*` are library primitives — no agent owns them. They should never be modified.
5. **Deprecated agents:** `admin-dev`, `study-dev`, `summaries-frontend` (old), `summaries-backend` (old) are LEGACY. Use the new specialized agents instead.

---

## How This Index Works

Each agent has:
- **ID:** Unique identifier (`section-role-number`)
- **Section:** Which part of the codebase it owns
- **Scope:** 1-line description
- **Files owned:** Explicit file list (zero overlap)
- **Depends on:** Other agents that must run first
- **Definition:** Path to the `.md` agent file

The **Architect agent** reads this index and selects agents based on:
1. What the user wants to do (feature, bugfix, refactor, etc.)
2. Which files are affected
3. Dependency graph between agents

---

## Section Map

| # | Section | Agents | IDs |
|---|---------|--------|-----|
| 1 | Quiz | 6 | QZ-01 to QZ-06 |
| 2 | Flashcards | 6 | FC-01 to FC-06 |
| 3 | Summaries & Content | 6 | SM-01 to SM-06 |
| 4 | Study & Spaced Repetition | 5 | ST-01 to ST-05 |
| 5 | Dashboard & Gamification | 5 | DG-01 to DG-05 |
| 6 | Admin & Owner | 5 | AO-01 to AO-05 |
| 7 | Auth & Security | 5 | AS-01 to AS-05 |
| 8 | AI & RAG | 6 | AI-01 to AI-06 |
| 9 | 3D Viewer | 4 | 3D-01 to 3D-04 |
| 10 | Infrastructure & DevOps | 5 | IF-01 to IF-05 |
| 11 | Messaging (Telegram/WhatsApp) | 4 | MG-01 to MG-04 |
| 12 | Billing & Stripe | 4 | BL-01 to BL-04 |
| — | Cross-cutting | 9 | XX-01 to XX-09 |
| | **TOTAL** | **70** | |

---

## 1. Quiz (QZ)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| QZ-01 | quiz-frontend | Quiz UI components (student + professor) | `components/content/Quiz*.tsx`, `components/student/Quiz*.tsx`, `components/professor/Quiz*.tsx`, `routes/quiz-student-routes.ts` | QZ-02, SM-04, DG-04 | `agents/quiz-frontend.md` |
| QZ-02 | quiz-backend | Quiz API routes + DB queries | `supabase/functions/server/routes/quiz*.ts`, `quiz-service.ts` | AS-01 | `agents/quiz-backend.md` |
| QZ-03 | quiz-tester | Quiz integration + unit tests | `tests/quiz/**`, `tests/e2e/quiz*` | QZ-01, QZ-02 | `agents/quiz-tester.md` |
| QZ-04 | quiz-adaptive | Adaptive quiz engine (BKT integration) | `lib/bkt-v4.ts`, `hooks/useAdaptiveQuiz*.ts`, `services/bktApi.ts` | QZ-01 | `agents/quiz-adaptive.md` |
| QZ-05 | quiz-questions | Question CRUD + renderers | `components/student/renderers/*.tsx`, `hooks/queries/useQuestion*.ts` | QZ-01, AS-02 | `agents/quiz-questions.md` |
| QZ-06 | quiz-analytics | Quiz analytics & reporting | `components/professor/QuizAnalytics*.tsx`, `services/quizAnalyticsApi.ts` | QZ-02, DG-01 | `agents/quiz-analytics.md` |

## 2. Flashcards (FC)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| FC-01 | flashcards-frontend | Flashcard UI (reviewer, cards) | `components/content/Flashcard*.tsx`, `components/student/Flashcard*.tsx` | FC-02, SM-04, DG-04 | `agents/flashcards-frontend.md` |
| FC-02 | flashcards-backend | Flashcard API routes + DB | `routes/flashcard*.ts`, `flashcard-service.ts` | AS-01 | `agents/flashcards-backend.md` |
| FC-03 | flashcards-tester | Flashcard tests | `tests/flashcard/**` | FC-01, FC-02 | `agents/flashcards-tester.md` |
| FC-04 | flashcards-fsrs | FSRS v4 spaced repetition engine | `lib/fsrs-engine.ts`, `lib/mastery-helpers.ts`, `hooks/useFlashcardEngine.ts` | FC-01 | `agents/flashcards-fsrs.md` |
| FC-05 | flashcards-keywords | Keyword popup + tagging system | `components/content/KeywordPopup.tsx` (split), `services/keywordApi.ts` | FC-01 | `agents/flashcards-keywords.md` |
| FC-06 | flashcards-generation | AI-generated flashcards | `services/flashcardGenerationApi.ts`, `components/professor/FlashcardGenerator*.tsx` | FC-02, AI-01 | `agents/flashcards-generation.md` |

## 3. Summaries & Content (SM)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| SM-01 | summaries-frontend | Summary viewer + editor UI | `components/content/Summary*.tsx`, `pages/student/SummaryPage.tsx` | SM-02 | `agents/summaries-frontend.md` |
| SM-02 | summaries-backend | Summary API routes + DB | `routes/summaries*.ts`, `summary-service.ts` | AS-01 | `agents/summaries-backend.md` |
| SM-03 | summaries-tester | Summary tests | `tests/summaries/**` | SM-01, SM-02 | `agents/summaries-tester.md` |
| SM-04 | content-tree | Content hierarchy (Institution→Course→Topic) | `context/ContentTreeContext.tsx`, `hooks/useContentTree.ts`, `services/content.ts` | SM-02 | `agents/content-tree.md` |
| SM-05 | video-player | Mux video player + professor upload | `components/content/VideoPlayer.tsx` (split), `services/videoApi.ts` | SM-02 | `agents/video-player.md` |
| SM-06 | text-highlighter | Text highlighting + annotation | `components/content/TextHighlighter.tsx` (split) | SM-01 | `agents/text-highlighter.md` |

## 4. Study & Spaced Repetition (ST)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| ST-01 | study-hub | Study hub browsing UI | `components/content/StudyHubView.tsx`, `components/content/StudyView.tsx` | SM-04 | `agents/study-hub.md` |
| ST-02 | study-sessions | Study session flow + API | `services/studySessionApi.ts`, `hooks/useStudySession.ts` | ST-01 | `agents/study-sessions.md` |
| ST-03 | study-queue | Study queue + review scheduling | `services/studyQueueApi.ts`, `hooks/useStudyQueue.ts` | ST-02 | `agents/study-queue.md` |
| ST-04 | study-plans | Study plan management | `pages/student/StudyPlanPage.tsx`, `services/studyPlanApi.ts` | ST-02 | `agents/study-plans.md` |
| ST-05 | study-progress | Progress tracking + mastery display | `pages/student/ProgressPage.tsx`, `context/StudentDataContext.tsx` | ST-02, FC-04 | `agents/study-progress.md` |

## 5. Dashboard & Gamification (DG)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| DG-01 | dashboard-student | Student dashboard UI | `pages/student/DashboardPage.tsx`, `components/dashboard/*.tsx` | ST-05 | `agents/dashboard-student.md` |
| DG-02 | dashboard-professor | Professor dashboard UI | `pages/professor/DashboardPage.tsx`, `components/professor/Dashboard*.tsx` | SM-02 | `agents/dashboard-professor.md` |
| DG-03 | gamification-engine | XP, streaks, badges, leaderboard | `services/gamificationApi.ts`, `hooks/useGamification.ts`, `components/shared/Badge*.tsx` | AS-01 | `agents/gamification-engine.md` |
| DG-04 | gamification-backend | Gamification API + triggers | `routes/gamification*.ts`, `gamification-service.ts` | AS-01 | `agents/gamification-backend.md` |
| DG-05 | leaderboard | Leaderboard UI + API | `components/student/Leaderboard*.tsx`, `services/leaderboardApi.ts` | DG-04 | `agents/leaderboard.md` |

## 6. Admin & Owner (AO)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| AO-01 | admin-frontend | Admin pages (institution mgmt) | `pages/admin/*.tsx`, `components/admin/*.tsx`, `routes/admin-routes.ts` | AO-02 | `agents/admin-frontend.md` |
| AO-02 | admin-backend | Admin API routes | `routes/admin*.ts`, `admin-service.ts` | AS-01 | `agents/admin-backend.md` |
| AO-03 | owner-frontend | Owner pages (plans, billing, members) | `pages/owner/*.tsx`, `components/owner/*.tsx`, `routes/owner-routes.ts` | AO-04 | `agents/owner-frontend.md` |
| AO-04 | owner-backend | Owner API routes | `routes/owner*.ts`, `owner-service.ts` | AS-01 | `agents/owner-backend.md` |
| AO-05 | admin-dev | Combined admin+owner dev (legacy compat) | Union of AO-01 to AO-04 files | AS-01 | `agents/admin-dev.md` |

## 7. Auth & Security (AS)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| AS-01 | auth-backend | Auth routes, JWT, RLS | `routes/auth*.ts`, `lib/auth.ts`, `middleware/auth.ts` | — | `agents/auth-backend.md` |
| AS-02 | auth-frontend | AuthContext, login/register UI | `context/AuthContext.tsx`, `pages/auth/*.tsx`, `components/auth/*.tsx` | AS-01 | `agents/auth-frontend.md` |
| AS-03 | rls-auditor | RLS policy auditing + fixes | `database/rls-*.sql`, `database/RLS_CONSOLIDATED.sql` | — | `agents/rls-auditor.md` |
| AS-04 | security-scanner | Security vulnerability scanner | Read-only across all files | — | `agents/security-scanner.md` |
| AS-05 | cors-headers | CORS, CSP, XSS hardening | `middleware/cors.ts`, `middleware/security.ts` | AS-01 | `agents/cors-headers.md` |

## 8. AI & RAG (AI)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| AI-01 | rag-pipeline | RAG ingest: PDF→chunks→embeddings | `lib/rag/*.ts`, `services/ragApi.ts` | AS-01 | `agents/rag-pipeline.md` |
| AI-02 | rag-chat | RAG chat interface (streaming) | `components/content/RagChat*.tsx`, `hooks/useRagChat.ts` | AI-01 | `agents/rag-chat.md` |
| AI-03 | ai-generation | AI content generation (summaries, quizzes, flashcards) | `lib/ai-generation/*.ts`, `services/aiGenerationApi.ts` | AI-01 | `agents/ai-generation.md` |
| AI-04 | embeddings | Embedding management + vector search | `lib/embeddings.ts`, `services/embeddingsApi.ts` | — | `agents/embeddings.md` |
| AI-05 | ai-backend | AI route handlers | `routes/ai*.ts`, `ai-service.ts` | AS-01 | `agents/ai-backend.md` |
| AI-06 | ai-prompts | Prompt engineering + templates | `lib/prompts/*.ts`, `lib/ai-config.ts` | — | `agents/ai-prompts.md` |

## 9. 3D Viewer (3D)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| 3D-01 | viewer3d-frontend | 3D viewer UI (Three.js) | `components/viewer3d/*.tsx`, `pages/student/Model3DPage.tsx` | 3D-02 | `agents/viewer3d-frontend.md` |
| 3D-02 | viewer3d-backend | 3D model API routes | `routes/models*.ts`, `models-service.ts` | AS-01 | `agents/viewer3d-backend.md` |
| 3D-03 | viewer3d-upload | Model upload for professor | `pages/professor/ProfessorModelsPage.tsx`, `services/models3dApi.ts` | 3D-02 | `agents/viewer3d-upload.md` |
| 3D-04 | viewer3d-annotations | Pin/note annotations on 3D models | `components/viewer3d/Annotations*.tsx`, `hooks/useModel3D.ts` | 3D-01 | `agents/viewer3d-annotations.md` |

## 10. Infrastructure & DevOps (IF)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| IF-01 | infra-plumbing | Shared libs (apiClient, config, logger) | `lib/api.ts`, `lib/config.ts`, `lib/logger.ts`, `lib/supabase.ts` | — | `agents/infra-plumbing.md` |
| IF-02 | infra-ui | Shared UI components (ErrorBoundary, Loading, Layout) | `components/shared/*.tsx`, `*Layout.tsx` | — | `agents/infra-ui.md` |
| IF-03 | infra-ai | AI/RAG infrastructure | `lib/ai-config.ts`, `lib/rag/config.ts` | — | `agents/infra-ai.md` |
| IF-04 | infra-database | DB migrations + schema management | `supabase/migrations/*.sql`, `database/schema-*.md` | — | `agents/infra-database.md` |
| IF-05 | infra-ci | CI/CD, GitHub Actions, deploy | `.github/workflows/*.yml`, `vercel.json` | — | `agents/infra-ci.md` |

## 11. Messaging (MG)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| MG-01 | telegram-bot | Telegram bot integration | `lib/telegram/*.ts`, `routes/telegram*.ts` | AS-01 | `agents/telegram-bot.md` |
| MG-02 | whatsapp-bot | WhatsApp Cloud API integration | `lib/whatsapp/*.ts`, `routes/whatsapp*.ts` | AS-01 | `agents/whatsapp-bot.md` |
| MG-03 | notifications | In-app notification system | `services/notificationsApi.ts`, `components/shared/Notification*.tsx` | AS-01 | `agents/notifications.md` |
| MG-04 | messaging-backend | Shared messaging backend logic | `lib/messaging/*.ts`, `messaging-service.ts` | AS-01 | `agents/messaging-backend.md` |

## 12. Billing & Stripe (BL)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| BL-01 | stripe-checkout | Stripe checkout + portal | `routes/stripe*.ts`, `lib/stripe.ts` | AS-01 | `agents/stripe-checkout.md` |
| BL-02 | stripe-webhooks | Stripe webhook handlers | `routes/webhooks/stripe*.ts` | BL-01 | `agents/stripe-webhooks.md` |
| BL-03 | billing-frontend | Billing UI (plans, invoices) | `pages/owner/BillingPage.tsx`, `components/owner/Billing*.tsx` | BL-01 | `agents/billing-frontend.md` |
| BL-04 | billing-plans | Plan management (CRUD, limits) | `services/plansApi.ts`, `components/owner/Plans*.tsx` | BL-01 | `agents/billing-plans.md` |

## Cross-Cutting (XX)

| ID | Agent Name | Scope | Files Owned | Depends On | Definition |
|----|-----------|-------|-------------|------------|------------|
| XX-01 | architect | Session orchestrator — reads this index, selects agents | Read-only (this file + all agent defs) | — | `agents/architect.md` |
| XX-02 | quality-gate | Post-execution auditor | Read-only across all files | — | `agents/quality-gate.md` |
| XX-03 | docs-writer | Documentation generator | `axon-docs/**/*.md` (non-agent docs) | — | `agents/docs-writer.md` |
| XX-04 | type-guardian | TypeScript type system guardian | `types/platform.ts`, `types/ui.ts`, `types/*.ts` | — | `agents/type-guardian.md` |
| XX-05 | migration-writer | SQL migration generator | `supabase/migrations/*.sql` | IF-04 | `agents/migration-writer.md` |
| XX-06 | test-orchestrator | Runs all tests, reports failures | `tests/**` (read), runs test commands | — | `agents/test-orchestrator.md` |
| XX-07 | refactor-scout | Identifies dead code, duplication, tech debt | Read-only across all files | — | `agents/refactor-scout.md` |
| XX-08 | design-system | UI/UX consistency enforcer | Read-only across `components/**` | — | `agents/design-system.md` |
| XX-09 | api-contract | API contract validator (request/response shapes) | Read-only across `routes/**`, `services/**` | — | `agents/api-contract.md` |

---

## Dependency Graph (Simplified)

```
                    ┌─────────────┐
                    │  XX-01      │
                    │  Architect  │
                    └──────┬──────┘
                           │ selects
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Section A   │ │ Section B   │ │ Section C   │
    │ agents      │ │ agents      │ │ agents      │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐
    │  XX-02      │
    │ Quality Gate│ (runs after EACH agent)
    └─────────────┘
```

## Critical Paths (agents that block others)

1. **IF-01** (infra-plumbing) → implicit dependency for ALL agents using services (lib/api.ts has 74 importers)
2. **AS-01** (auth-backend) → blocks ALL backend agents
3. **AS-02** (auth-frontend) → implicit dependency for ALL frontend agents (AuthContext has 42 importers)
4. **SM-04** (content-tree) → blocks QZ-01, FC-01, ST-01, DG-01 (ContentTreeContext has 28 importers)
5. **DG-04** (gamification-backend) → blocks QZ-01, FC-01 (useSessionXP integration)
6. **FC-04** (flashcards-fsrs) → blocks ST-05

**Longest execution chain:** DG-01 → ST-05 → ST-02 → ST-01 → SM-04 → SM-02 → AS-01 (7 levels)

## Deprecated Agents (DO NOT USE)

| Agent | Replaced By | Reason |
|-------|------------|--------|
| admin-dev | AO-01 to AO-04 | Too broad, overlaps 9+ agents |
| study-dev | ST-01 to ST-05 | Too broad, replaced by specialized agents |
| summaries-frontend | summaries-frontend-v2 (SM-01) | Updated with real file inventory |
| summaries-backend | summaries-backend-v2 (SM-02) | Updated with real file inventory |

---

## Selection Tags

The Architect uses these tags to quickly filter agents by task type:

| Tag | Agents |
|-----|--------|
| `#frontend` | QZ-01, FC-01, SM-01, ST-01, DG-01, DG-02, AO-01, AO-03, AS-02, AI-02, 3D-01, 3D-03, IF-02, MG-03, BL-03, BL-04 |
| `#backend` | QZ-02, FC-02, SM-02, AO-02, AO-04, AS-01, AI-05, 3D-02, IF-04, MG-01, MG-02, MG-04, BL-01, BL-02, DG-04 |
| `#testing` | QZ-03, FC-03, SM-03, XX-06 |
| `#ai-rag` | AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, FC-06 |
| `#security` | AS-01, AS-02, AS-03, AS-04, AS-05 |
| `#infra` | IF-01, IF-02, IF-03, IF-04, IF-05 |
| `#audit` | XX-02, XX-04, XX-07, XX-08, XX-09 |
| `#billing` | BL-01, BL-02, BL-03, BL-04 |
| `#messaging` | MG-01, MG-02, MG-03, MG-04 |
| `#3d` | 3D-01, 3D-02, 3D-03, 3D-04 |
| `#study` | ST-01, ST-02, ST-03, ST-04, ST-05 |
| `#gamification` | DG-03, DG-04, DG-05 |
