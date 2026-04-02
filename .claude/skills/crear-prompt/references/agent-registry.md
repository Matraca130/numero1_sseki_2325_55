# Registro Completo de Agentes AXON — 74 Agentes Activos

**Fecha generada:** 29 de marzo de 2026
**Fuente:** `.claude/agents/` (76 archivos: 74 activos + 2 legacy)
**Propósito:** Referencia exhaustiva para mapear planes a agentes ejecutores

---

## Tabla de Contenidos
1. [Tabla Maestra de 74 Agentes](#tabla-maestra)
2. [Búsqueda por Sección de Dominio](#búsqueda-por-sección)
3. [Búsqueda por Ruta de Archivo](#búsqueda-por-ruta)
4. [Grafo de Dependencias](#grafo-de-dependencias)
5. [Caminos Críticos y Profundidad de Ejecución](#caminos-críticos)
6. [Agrupación por Complejidad de Modelo](#complejidad-modelo)
7. [Reglas de Conflictos y Aislamiento](#reglas-aislamiento)

---

## Tabla Maestra

| # | ID | Nombre Agente | Dominio | Zona (Archivos Dueños) | Dependencias | Complejidad | Modelo |
|---|----|----|---------|---------|---------|---------|---------|
| 1 | QZ-01 | quiz-frontend | Quiz | `components/content/Quiz*.tsx`, `components/student/Quiz*.tsx`, `components/professor/Quiz*.tsx` | AS-02, IF-01, SM-04 | Media | opus |
| 2 | QZ-02 | quiz-backend | Quiz | `routes/quiz*.ts`, `services/quiz*.ts`, `hooks/useQuiz*.ts` | AS-01, IF-01 | Media | opus |
| 3 | QZ-03 | quiz-tester | Quiz | `tests/quiz/**/*.test.ts` | QZ-01, QZ-02 | Media | opus |
| 4 | QZ-04 | quiz-adaptive | Quiz | `lib/bkt-v4.ts`, `services/bktApi.ts`, `hooks/useAdaptiveQuiz*.ts` | IF-01 | Alta | opus |
| 5 | QZ-05 | quiz-questions | Quiz | `components/*/Question*.tsx`, `components/*/renderers/` | AS-02, IF-01 | Media | opus |
| 6 | QZ-06 | quiz-analytics | Quiz | `components/professor/QuizAnalytics*.tsx`, `services/quizAnalyticsApi.ts` | AS-02, IF-01, DG-04 | Media | opus |
| 7 | FC-01 | flashcards-frontend | Flashcards | `components/student/Flashcard*.tsx`, `components/professor/FlashcardManager*.tsx`, `hooks/useFlashcard*.ts` | AS-02, IF-01, SM-04 | Media | opus |
| 8 | FC-02 | flashcards-backend | Flashcards | `routes/flashcards*.ts`, `services/flashcardApi.ts`, `hooks/useFlashcardAPI*.ts` | AS-01, IF-01 | Media | opus |
| 9 | FC-03 | flashcards-tester | Flashcards | `tests/flashcards/**/*.test.ts` | FC-01, FC-02 | Media | opus |
| 10 | FC-04 | flashcards-fsrs | Flashcards | `lib/fsrs-v4.ts`, `services/fsrsApi.ts`, `hooks/useFSRS*.ts` | IF-01 | Alta | opus |
| 11 | FC-05 | flashcards-keywords | Flashcards | `components/shared/KeywordPopup*.tsx`, `services/keywordApi.ts`, `hooks/useKeyword*.ts` | IF-01 | Media | opus |
| 12 | FC-06 | flashcards-generation | Flashcards | `services/flashcardGenerationApi.ts`, `hooks/useGenerateFlashcards*.ts` | AS-02, IF-01, AI-05 | Media | opus |
| 13 | SM-01 | summaries-frontend-v2 | Summaries | `components/content/SummaryEditor*.tsx`, `components/content/SummaryViewer*.tsx`, `components/*/BlockEditor*.tsx` | AS-02, IF-01, SM-04 | Alta | opus |
| 14 | SM-02 | summaries-backend-v2 | Summaries | `routes/summaries*.ts`, `services/summariesApi.ts`, `hooks/useSummary*.ts` | AS-01, IF-01 | Media | opus |
| 15 | SM-03 | summaries-tester | Summaries | `tests/summaries/**/*.test.ts`, `tests/blockEditor/**/*.test.ts` | SM-01, SM-02 | Media | opus |
| 16 | SM-04 | content-tree | Summaries | `context/ContentTreeContext.tsx`, `components/shared/ContentTree.tsx`, `services/contentTreeApi.ts`, `hooks/useContentTree*.ts`, `lib/content-tree-helpers.ts` | AS-02, IF-01, SM-02 | Alta | opus |
| 17 | SM-05 | video-player | Summaries | `components/shared/VideoPlayer*.tsx`, `hooks/useVideoPlayer*.ts`, `lib/mux-*.ts` | AS-02, IF-01 | Media | opus |
| 18 | SM-06 | text-highlighter | Summaries | `components/shared/TextHighlighter*.tsx`, `hooks/useHighlight*.ts`, `lib/highlight-helpers.ts` | AS-02, IF-01 | Media | opus |
| 19 | ST-01 | study-hub | Study | `components/student/StudyHub*.tsx`, `hooks/useStudyHub*.ts` | AS-02, IF-01, SM-04 | Media | opus |
| 20 | ST-02 | study-sessions | Study | `routes/study-sessions*.ts`, `services/sessionApi.ts`, `hooks/useStudySession*.ts` | AS-01, IF-01, ST-01 | Media | opus |
| 21 | ST-03 | study-queue | Study | `services/queueApi.ts`, `hooks/useReviewQueue*.ts`, `lib/queue-scheduler.ts` | IF-01, ST-02 | Media | opus |
| 22 | ST-04 | study-plans | Study | `components/student/StudyPlan*.tsx`, `services/studyPlanApi.ts`, `hooks/useStudyPlan*.ts` | AS-02, IF-01, SM-04 | Media | opus |
| 23 | ST-05 | study-progress | Study | `components/student/ProgressDashboard*.tsx`, `services/progressApi.ts`, `hooks/useProgress*.ts` | AS-02, IF-01, FC-04, ST-02 | Media | opus |
| 24 | DG-01 | dashboard-student | Dashboard | `components/student/Dashboard*.tsx`, `pages/student/DashboardPage.tsx`, `hooks/useDashboard*.ts` | AS-02, IF-01, SM-04, ST-05, DG-04 | Alta | opus |
| 25 | DG-02 | dashboard-professor | Dashboard | `components/professor/Dashboard*.tsx`, `pages/professor/DashboardPage.tsx`, `hooks/useProfDashboard*.ts` | AS-02, IF-01, SM-04, DG-04 | Alta | opus |
| 26 | DG-03 | gamification-engine | Dashboard | `components/gamification/*.tsx`, `context/GamificationContext.tsx`, `hooks/useGameification*.ts`, `lib/xp-constants.ts` | AS-02, IF-01, DG-04 | Media | opus |
| 27 | DG-04 | gamification-backend | Dashboard | `routes/gamification*.ts`, `services/gamificationApi.ts`, `types/gamification.ts` | AS-01, IF-01 | Media | opus |
| 28 | DG-05 | leaderboard | Dashboard | `components/shared/Leaderboard*.tsx`, `services/leaderboardApi.ts`, `hooks/useLeaderboard*.ts` | AS-02, IF-01, DG-04 | Media | opus |
| 29 | AO-01 | admin-frontend | Admin/Owner | `components/admin/*.tsx`, `pages/admin/AdminPages.tsx` | AS-02, IF-01, SM-04 | Alta | opus |
| 30 | AO-02 | admin-backend | Admin/Owner | `routes/admin*.ts`, `services/adminApi.ts` | AS-01, IF-01 | Media | opus |
| 31 | AO-03 | owner-frontend | Admin/Owner | `components/owner/*.tsx`, `pages/owner/OwnerPages.tsx` | AS-02, IF-01 | Alta | opus |
| 32 | AO-04 | owner-backend | Admin/Owner | `routes/owner*.ts`, `services/ownerApi.ts` | AS-01, IF-01 | Media | opus |
| 33 | AO-05 | admin-dev | Admin/Owner | (LEGACY — usar AO-01 a AO-04) | — | — | opus |
| 34 | AS-01 | auth-backend | Auth | `routes/auth*.ts`, `lib/auth.ts`, `middleware/auth*.ts`, `database/rls-*.sql`, `database/policies/*` | IF-01 | Alta | opus |
| 35 | AS-02 | auth-frontend | Auth | `context/AuthContext.tsx`, `components/auth/*.tsx`, `RequireAuth.tsx`, `RequireRole.tsx`, `PostLoginRouter.tsx` | AS-01, IF-01 | Alta | opus |
| 36 | AS-03 | rls-auditor | Auth | (Solo lectura — audita policies sin modificar) | — | Media | opus |
| 37 | AS-04 | security-scanner | Auth | (Solo lectura — audita vulnerabilidades sin modificar) | — | Media | opus |
| 38 | AS-05 | cors-headers | Auth | `middleware/cors*.ts`, `lib/security-headers.ts` | AS-01, IF-01 | Media | opus |
| 39 | AI-01 | rag-pipeline | AI/RAG | `services/ragPipelineApi.ts`, `lib/pdf-parser.ts`, `lib/embeddings-processor.ts` | AS-01, IF-01, AI-04 | Alta | opus |
| 40 | AI-02 | rag-chat | AI/RAG | `components/ai/RagChat*.tsx`, `hooks/useRagChat*.ts`, `services/ragChatApi.ts` | AS-02, IF-01, AI-05 | Alta | opus |
| 41 | AI-03 | ai-generation | AI/RAG | `services/contentGenerationApi.ts`, `hooks/useContentGeneration*.ts`, `lib/prompt-templates.ts` | AS-01, IF-01, AI-05 | Alta | opus |
| 42 | AI-04 | embeddings | AI/RAG | `services/embeddingsApi.ts`, `lib/vector-search.ts`, `lib/embedding-cache.ts` | IF-01 | Alta | opus |
| 43 | AI-05 | ai-backend | AI/RAG | `routes/ai*.ts`, `services/aiApi.ts`, `middleware/ai*.ts` | AS-01, IF-01 | Alta | opus |
| 44 | AI-06 | ai-prompts | AI/RAG | `lib/prompts/*.ts`, `lib/prompt-registry.ts`, `services/promptsApi.ts` | IF-01 | Media | opus |
| 45 | 3D-01 | viewer3d-frontend | 3D Viewer | `components/3d/Viewer3D*.tsx`, `hooks/use3DViewer*.ts` | AS-02, IF-01 | Alta | opus |
| 46 | 3D-02 | viewer3d-backend | 3D Viewer | `routes/3d*.ts`, `services/3dApi.ts` | AS-01, IF-01 | Media | opus |
| 47 | 3D-03 | viewer3d-upload | 3D Viewer | `components/professor/3DUpload*.tsx`, `services/3dUploadApi.ts` | AS-02, IF-01 | Media | opus |
| 48 | 3D-04 | viewer3d-annotations | 3D Viewer | `components/3d/Annotations*.tsx`, `services/3dAnnotationsApi.ts` | AS-02, IF-01, 3D-01 | Media | opus |
| 49 | IF-01 | infra-plumbing | Infrastructure | `server/crud-factory.ts`, `server/db.ts`, `server/auth-helpers.ts`, `server/validate.ts`, `server/rate-limit.ts`, `lib/api.ts`, `lib/config.ts`, `lib/logger.ts`, `lib/supabase.ts` | — | Alta | opus |
| 50 | IF-02 | infra-ui | Infrastructure | `components/shared/*.tsx` (genéricos), `lib/ui-helpers.ts`, `components/ErrorBoundary.tsx`, `components/Loading.tsx` | IF-01, AS-02 | Media | opus |
| 51 | IF-03 | infra-ai | Infrastructure | `lib/ai-config.ts`, `lib/ai-client.ts`, `middleware/ai-init.ts` | IF-01 | Media | opus |
| 52 | IF-04 | infra-database | Infrastructure | `database/migrations/*.sql`, `database/schema.sql`, `database/seed.sql` | — | Alta | opus |
| 53 | IF-05 | infra-ci | Infrastructure | `.github/workflows/*.yml`, `deploy.sh`, `Makefile`, `ci-config.ts` | — | Media | opus |
| 54 | MG-01 | telegram-bot | Messaging | `services/telegramBotApi.ts`, `lib/telegram-client.ts`, `hooks/useTelegramBot*.ts` | AS-01, IF-01 | Media | opus |
| 55 | MG-02 | whatsapp-bot | Messaging | `services/whatsappBotApi.ts`, `lib/whatsapp-client.ts`, `hooks/useWhatsappBot*.ts` | AS-01, IF-01 | Media | opus |
| 56 | MG-03 | notifications | Messaging | `components/shared/Notification*.tsx`, `hooks/useNotification*.ts` | AS-02, IF-01 | Media | opus |
| 57 | MG-04 | messaging-backend | Messaging | `routes/messaging*.ts`, `services/messagingApi.ts` | AS-01, IF-01 | Media | opus |
| 58 | BL-01 | stripe-checkout | Billing | `components/billing/StripeCheckout*.tsx`, `services/stripeCheckoutApi.ts` | AS-02, IF-01 | Media | opus |
| 59 | BL-02 | stripe-webhooks | Billing | `routes/webhooks/stripe*.ts`, `services/stripeWebhookHandler.ts` | AS-01, IF-01 | Media | opus |
| 60 | BL-03 | billing-frontend | Billing | `components/owner/Billing*.tsx`, `pages/owner/BillingPage.tsx` | AS-02, IF-01 | Media | opus |
| 61 | BL-04 | billing-plans | Billing | `services/billingPlansApi.ts`, `lib/plan-definitions.ts`, `types/billing.ts` | IF-01 | Media | opus |
| 62 | XX-01 | architect | Cross-Cutting | (Orquestador — no código) | Todos | Alta | opus |
| 63 | XX-02 | quality-gate | Cross-Cutting | (Auditor — no código) | Todos | Alta | opus |
| 64 | XX-03 | docs-writer | Cross-Cutting | `docs/**/*.md`, `README.md` | — | Media | opus |
| 65 | XX-04 | type-guardian | Cross-Cutting | Audita tipos TS en `types/*.ts`, `**/*.types.ts` | — | Media | opus |
| 66 | XX-05 | migration-writer | Cross-Cutting | `database/migrations/*.sql` | IF-04 | Media | opus |
| 67 | XX-06 | test-orchestrator | Cross-Cutting | Ejecuta y reporta `tests/**/*.test.ts` | Todos los testers | Media | opus |
| 68 | XX-07 | refactor-scout | Cross-Cutting | (Auditor — detecta dead code sin modificar) | — | Media | opus |
| 69 | XX-08 | design-system | Cross-Cutting | Audita consistencia Tailwind, componentes UI, naming | — | Media | opus |
| 70 | XX-09 | api-contract | Cross-Cutting | Audita contratos API, cambios de types/interfaces | — | Media | opus |
| 71 | layout-system | layout-system | Infrastructure | `lib/layout/*.ts`, `context/LayoutContext.tsx`, `components/layout/*.tsx` | IF-01, AS-02 | Media | opus |
| 72 | design-tokens | design-tokens | Infrastructure | `lib/design-tokens.ts`, `tailwind.config.ts`, `lib/token-registry.ts` | — | Media | opus |
| 73 | tiptap-editor | tiptap-editor | Infrastructure | `lib/tiptap/**/*.ts`, `components/shared/RichEditor*.tsx` | IF-01, IF-02 | Alta | opus |

**Legados (deprecated):**
| ID | Nombre | Razón | Usar en lugar |
|----|----|----|----|
| — | admin-dev (AO-05) | Consolidado en AO-01 a AO-04 | AO-01, AO-02, AO-03, AO-04 |
| — | study-dev | Consolidado en ST-01 a ST-05 | ST-01, ST-02, ST-03, ST-04, ST-05 |
| — | summaries-frontend | Reemplazado por v2 | SM-01 (summaries-frontend-v2) |
| — | summaries-backend | Reemplazado por v2 | SM-02 (summaries-backend-v2) |

---

## Búsqueda por Sección

### 1. Quiz (QZ) — 6 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| QZ-01 | quiz-frontend | UI: quiz taking, results, creation | opus | `components/*/Quiz*.tsx`, `components/*/Question*.tsx` |
| QZ-02 | quiz-backend | API: quiz CRUD, quiz-attempts | opus | `routes/quiz*.ts`, `services/quiz*.ts` |
| QZ-03 | quiz-tester | Tests: unit + integration quiz | opus | `tests/quiz/**/*.test.ts` |
| QZ-04 | quiz-adaptive | BKT engine: knowledge tracing | opus | `lib/bkt-v4.ts`, `services/bktApi.ts` |
| QZ-05 | quiz-questions | Question renderers: MCQ, True/False, Open | opus | `components/*/Question*.tsx`, `renderers/` |
| QZ-06 | quiz-analytics | Professor reports: quiz metrics | opus | `components/professor/QuizAnalytics*.tsx` |

**Dependencias de sección:**
- QZ-01 ← AS-02, IF-01, SM-04, QZ-02
- QZ-02 ← AS-01, IF-01, QZ-04
- QZ-04 ← IF-01
- QZ-05 ← AS-02, IF-01, QZ-01
- QZ-06 ← AS-02, IF-01, DG-04

### 2. Flashcards (FC) — 6 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| FC-01 | flashcards-frontend | UI: review, flashcard cards | opus | `components/*/Flashcard*.tsx` |
| FC-02 | flashcards-backend | API: CRUD flashcards | opus | `routes/flashcards*.ts`, `services/flashcardApi.ts` |
| FC-03 | flashcards-tester | Tests: flashcard system | opus | `tests/flashcards/**/*.test.ts` |
| FC-04 | flashcards-fsrs | FSRS v4: spaced repetition | opus | `lib/fsrs-v4.ts`, `services/fsrsApi.ts` |
| FC-05 | flashcards-keywords | Keyword popup + tagging | opus | `components/shared/KeywordPopup*.tsx` |
| FC-06 | flashcards-generation | AI: LLM-generated flashcards | opus | `services/flashcardGenerationApi.ts` |

**Dependencias de sección:**
- FC-01 ← AS-02, IF-01, SM-04, FC-02, FC-04
- FC-02 ← AS-01, IF-01, FC-04
- FC-04 ← IF-01
- FC-05 ← IF-01, FC-01
- FC-06 ← AS-02, IF-01, AI-05

### 3. Summaries & Content (SM) — 6 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| SM-01 | summaries-frontend-v2 | UI: summary viewer + block editor | opus | `components/content/Summary*.tsx`, `BlockEditor*.tsx` |
| SM-02 | summaries-backend-v2 | API: CRUD + publish pipeline | opus | `routes/summaries*.ts`, `services/summariesApi.ts` |
| SM-03 | summaries-tester | Tests: content editor + summary | opus | `tests/summaries/**/*.test.ts` |
| SM-04 | content-tree | Hierarchy: Institution→Course→Topic (28 importadores) | opus | `context/ContentTreeContext.tsx`, `components/shared/ContentTree.tsx` |
| SM-05 | video-player | Mux video streaming | opus | `components/shared/VideoPlayer*.tsx` |
| SM-06 | text-highlighter | Text annotation + highlighting | opus | `components/shared/TextHighlighter*.tsx` |

**Dependencias de sección:**
- SM-01 ← AS-02, IF-01, SM-04, SM-02
- SM-02 ← AS-01, IF-01, IF-04
- SM-04 ← AS-02, IF-01, SM-02 (CRÍTICO: 28 importadores)
- SM-05 ← AS-02, IF-01
- SM-06 ← AS-02, IF-01

### 4. Study & Spaced Repetition (ST) — 5 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| ST-01 | study-hub | UI: study hub browsing | opus | `components/student/StudyHub*.tsx` |
| ST-02 | study-sessions | API: session flow + state | opus | `routes/study-sessions*.ts`, `services/sessionApi.ts` |
| ST-03 | study-queue | Queue: FSRS scheduling | opus | `services/queueApi.ts`, `lib/queue-scheduler.ts` |
| ST-04 | study-plans | UI: study plan management | opus | `components/student/StudyPlan*.tsx` |
| ST-05 | study-progress | UI: mastery dashboard + metrics | opus | `components/student/ProgressDashboard*.tsx` |

**Dependencias de sección:**
- ST-01 ← AS-02, IF-01, SM-04, ST-02
- ST-02 ← AS-01, IF-01, ST-03
- ST-03 ← IF-01, FC-04 (FSRS)
- ST-04 ← AS-02, IF-01, SM-04
- ST-05 ← AS-02, IF-01, FC-04, ST-02

### 5. Dashboard & Gamification (DG) — 5 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| DG-01 | dashboard-student | UI: main student dashboard | opus | `components/student/Dashboard*.tsx`, `pages/student/DashboardPage.tsx` |
| DG-02 | dashboard-professor | UI: professor overview | opus | `components/professor/Dashboard*.tsx`, `pages/professor/DashboardPage.tsx` |
| DG-03 | gamification-engine | Frontend: XP, streaks, badges, leaderboard | opus | `components/gamification/*.tsx`, `context/GamificationContext.tsx` |
| DG-04 | gamification-backend | Backend: XP endpoints (13), triggers | opus | `routes/gamification*.ts`, `services/gamificationApi.ts`, `types/gamification.ts` |
| DG-05 | leaderboard | UI: leaderboard display + API | opus | `components/shared/Leaderboard*.tsx` |

**Dependencias de sección:**
- DG-01 ← AS-02, IF-01, SM-04, ST-05, DG-04 (PROFUNDO: 7 niveles)
- DG-02 ← AS-02, IF-01, SM-04, DG-04
- DG-03 ← AS-02, IF-01, DG-04
- DG-04 ← AS-01, IF-01
- DG-05 ← AS-02, IF-01, DG-04

### 6. Admin & Owner (AO) — 5 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| AO-01 | admin-frontend | UI: institution management | opus | `components/admin/*.tsx`, `pages/admin/AdminPages.tsx` |
| AO-02 | admin-backend | API: admin routes | opus | `routes/admin*.ts`, `services/adminApi.ts` |
| AO-03 | owner-frontend | UI: billing, members | opus | `components/owner/*.tsx`, `pages/owner/OwnerPages.tsx` |
| AO-04 | owner-backend | API: owner routes | opus | `routes/owner*.ts`, `services/ownerApi.ts` |
| AO-05 | admin-dev | LEGACY — no usar | — | (deprecated) |

**Dependencias de sección:**
- AO-01 ← AS-02, IF-01, SM-04, AO-02
- AO-02 ← AS-01, IF-01
- AO-03 ← AS-02, IF-01, AO-04
- AO-04 ← AS-01, IF-01

### 7. Auth & Security (AS) — 5 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| AS-01 | auth-backend | API: JWT, RLS policies | opus | `routes/auth*.ts`, `lib/auth.ts`, `database/policies/*` |
| AS-02 | auth-frontend | UI: login/register, guards, context | opus | `context/AuthContext.tsx`, `components/auth/*.tsx` (42 importadores) |
| AS-03 | rls-auditor | Solo lectura: audita RLS (no modifica) | opus | — |
| AS-04 | security-scanner | Solo lectura: audita seguridad (no modifica) | opus | — |
| AS-05 | cors-headers | API: CORS, CSP, XSS headers | opus | `middleware/cors*.ts`, `lib/security-headers.ts` |

**Dependencias de sección:**
- AS-01 ← IF-01 (bloqueador: todos los backends lo necesitan)
- AS-02 ← AS-01, IF-01 (bloqueador: todos los frontends lo necesitan)
- AS-05 ← AS-01, IF-01

### 8. AI & RAG (AI) — 6 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| AI-01 | rag-pipeline | Ingest: PDF→chunks→embeddings | opus | `services/ragPipelineApi.ts`, `lib/pdf-parser.ts` |
| AI-02 | rag-chat | UI: streaming chat RAG | opus | `components/ai/RagChat*.tsx`, `services/ragChatApi.ts` |
| AI-03 | ai-generation | Backend: content generation | opus | `services/contentGenerationApi.ts` |
| AI-04 | embeddings | Vector DB: search + storage | opus | `services/embeddingsApi.ts`, `lib/vector-search.ts` |
| AI-05 | ai-backend | API: route handlers | opus | `routes/ai*.ts`, `services/aiApi.ts` |
| AI-06 | ai-prompts | Prompt engineering + templates | opus | `lib/prompts/*.ts`, `lib/prompt-registry.ts` |

**Dependencias de sección:**
- AI-01 ← AS-01, IF-01, AI-04
- AI-02 ← AS-02, IF-01, AI-05
- AI-03 ← AS-01, IF-01, AI-05
- AI-04 ← IF-01
- AI-05 ← AS-01, IF-01
- AI-06 ← IF-01

### 9. 3D Viewer (3D) — 4 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| 3D-01 | viewer3d-frontend | UI: Three.js rendering | opus | `components/3d/Viewer3D*.tsx`, `hooks/use3DViewer*.ts` |
| 3D-02 | viewer3d-backend | API: model routes | opus | `routes/3d*.ts`, `services/3dApi.ts` |
| 3D-03 | viewer3d-upload | UI: model upload (professor) | opus | `components/professor/3DUpload*.tsx` |
| 3D-04 | viewer3d-annotations | UI: pin/note annotations | opus | `components/3d/Annotations*.tsx` |

**Dependencias de sección:**
- 3D-01 ← AS-02, IF-01, 3D-02
- 3D-02 ← AS-01, IF-01
- 3D-03 ← AS-02, IF-01
- 3D-04 ← AS-02, IF-01, 3D-01

### 10. Infrastructure & DevOps (IF) — 5 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| IF-01 | infra-plumbing | Libs core: apiClient, config, logger (74 importadores) | opus | `lib/api.ts`, `lib/config.ts`, `lib/logger.ts`, `server/db.ts`, `server/crud-factory.ts` |
| IF-02 | infra-ui | UI genéricos: ErrorBoundary, Loading, shared | opus | `components/shared/*.tsx` (genéricos) |
| IF-03 | infra-ai | AI config: client, middleware | opus | `lib/ai-config.ts`, `lib/ai-client.ts` |
| IF-04 | infra-database | DB: migrations + schema | opus | `database/migrations/*.sql`, `database/schema.sql` |
| IF-05 | infra-ci | DevOps: GitHub Actions, deploy | opus | `.github/workflows/*.yml`, `Makefile`, `deploy.sh` |

**Dependencias de sección:**
- IF-01: SIN DEPENDENCIAS (es la base — todos lo necesitan)
- IF-02 ← IF-01, AS-02
- IF-03 ← IF-01
- IF-04: SIN DEPENDENCIAS (DDL)
- IF-05: SIN DEPENDENCIAS (CI/CD)

### 11. Messaging (MG) — 4 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| MG-01 | telegram-bot | Telegram API integration | opus | `services/telegramBotApi.ts`, `lib/telegram-client.ts` |
| MG-02 | whatsapp-bot | WhatsApp API integration | opus | `services/whatsappBotApi.ts`, `lib/whatsapp-client.ts` |
| MG-03 | notifications | In-app notification UI | opus | `components/shared/Notification*.tsx` |
| MG-04 | messaging-backend | Backend: message routing | opus | `routes/messaging*.ts`, `services/messagingApi.ts` |

**Dependencias de sección:**
- MG-01 ← AS-01, IF-01
- MG-02 ← AS-01, IF-01
- MG-03 ← AS-02, IF-01
- MG-04 ← AS-01, IF-01

### 12. Billing & Stripe (BL) — 4 agentes
| ID | Nombre | Propósito | Modelo | Zona de Archivos |
|----|--------|-----------|--------|------------------|
| BL-01 | stripe-checkout | Stripe checkout + portal | opus | `components/billing/StripeCheckout*.tsx` |
| BL-02 | stripe-webhooks | Webhook handlers | opus | `routes/webhooks/stripe*.ts` |
| BL-03 | billing-frontend | Billing UI: plans, invoices | opus | `components/owner/Billing*.tsx`, `pages/owner/BillingPage.tsx` |
| BL-04 | billing-plans | Plan management: CRUD, limits | opus | `services/billingPlansApi.ts`, `lib/plan-definitions.ts` |

**Dependencias de sección:**
- BL-01 ← AS-02, IF-01, BL-04
- BL-02 ← AS-01, IF-01, BL-04
- BL-03 ← AS-02, IF-01, BL-04
- BL-04 ← IF-01

### Cross-Cutting (XX) — 9 agentes
| ID | Nombre | Tipo | Propósito | Modelo |
|----|--------|------|-----------|--------|
| XX-01 | architect | Orquestador | Session planning + agent selection | opus |
| XX-02 | quality-gate | Auditor | Post-execution verification (6 checks) | opus |
| XX-03 | docs-writer | Implementer | Documentation generation | opus |
| XX-04 | type-guardian | Auditor | TypeScript type validation | opus |
| XX-05 | migration-writer | Implementer | SQL migration generation | opus |
| XX-06 | test-orchestrator | Auditor | Test execution + reporting | opus |
| XX-07 | refactor-scout | Auditor | Dead code + tech debt detection | opus |
| XX-08 | design-system | Auditor | UI/UX consistency enforcement | opus |
| XX-09 | api-contract | Auditor | API contract validation | opus |

---

## Búsqueda por Ruta de Archivo

### Mapping: Archivo → Agente Propietario

```
src/app/
├── components/
│   ├── student/
│   │   ├── Dashboard*.tsx                           → DG-01
│   │   ├── DashboardWidget*.tsx                     → DG-01
│   │   ├── ProgressDashboard*.tsx                   → ST-05
│   │   ├── StudyHub*.tsx                            → ST-01
│   │   ├── StudyPlan*.tsx                           → ST-04
│   │   ├── Quiz*.tsx, Question*.tsx                 → QZ-01, QZ-05
│   │   ├── Flashcard*.tsx                           → FC-01
│   │   └── renderers/                               → QZ-05
│   ├── professor/
│   │   ├── Dashboard*.tsx                           → DG-02
│   │   ├── Quiz*.tsx                                → QZ-01
│   │   ├── QuizAnalytics*.tsx                       → QZ-06
│   │   ├── FlashcardManager*.tsx                    → FC-01
│   │   ├── 3DUpload*.tsx                            → 3D-03
│   │   └── Billing*.tsx                             → BL-03
│   ├── content/
│   │   ├── QuizView*.tsx, QuizSessionView*.tsx     → QZ-01
│   │   ├── SummaryEditor*.tsx, SummaryViewer*.tsx  → SM-01
│   │   ├── BlockEditor*.tsx                         → SM-01
│   │   └── Quiz*.tsx                                → QZ-01
│   ├── shared/
│   │   ├── ContentTree.tsx                          → SM-04
│   │   ├── VideoPlayer*.tsx                         → SM-05
│   │   ├── TextHighlighter*.tsx                     → SM-06
│   │   ├── KeywordPopup*.tsx                        → FC-05
│   │   ├── Leaderboard*.tsx                         → DG-05
│   │   ├── Notification*.tsx                        → MG-03
│   │   ├── RichEditor*.tsx                          → tiptap-editor
│   │   ├── *.tsx (genéricos)                        → IF-02
│   │   └── ErrorBoundary.tsx, Loading.tsx           → IF-02
│   ├── admin/                                        → AO-01
│   ├── owner/                                        → AO-03
│   ├── auth/                                         → AS-02
│   ├── gamification/                                 → DG-03
│   ├── ai/
│   │   ├── RagChat*.tsx                             → AI-02
│   │   └── PromptEditor*.tsx                        → AI-06
│   └── 3d/
│       ├── Viewer3D*.tsx                            → 3D-01
│       └── Annotations*.tsx                         → 3D-04
├── context/
│   ├── AuthContext.tsx                              → AS-02 (42 importadores)
│   ├── ContentTreeContext.tsx                       → SM-04 (28 importadores)
│   ├── GamificationContext.tsx                      → DG-03
│   └── LayoutContext.tsx                            → layout-system
├── hooks/
│   ├── useQuiz*.ts, useBkt*.ts, useAdaptiveQuiz.ts → QZ-01, QZ-04
│   ├── useFlashcard*.ts, useFSRS*.ts                → FC-01, FC-02, FC-04
│   ├── useContentTree*.ts, useTopic*.ts             → SM-04
│   ├── useSummary*.ts                               → SM-02
│   ├── useStudy*.ts, useStudySession*.ts            → ST-01, ST-02, ST-04, ST-05
│   ├── useGameification*.ts, useSessionXP.ts        → DG-03, DG-04
│   ├── useLeaderboard*.ts                           → DG-05
│   ├── useRagChat*.ts                               → AI-02
│   ├── use3DViewer*.ts                              → 3D-01
│   ├── useDashboard*.ts, useProfDashboard*.ts       → DG-01, DG-02
│   ├── useHighlight*.ts                             → SM-06
│   ├── useVideoPlayer*.ts                           → SM-05
│   ├── useKeyword*.ts                               → FC-05
│   ├── useNotification*.ts                          → MG-03
│   ├── useReviewQueue*.ts                           → ST-03
│   └── queries/                                      → section-specific agents
├── services/
│   ├── quiz*.ts                                      → QZ-02
│   ├── bktApi.ts                                     → QZ-04
│   ├── flashcard*.ts, fsrsApi.ts                     → FC-02, FC-04
│   ├── contentTreeApi.ts                             → SM-04
│   ├── summariesApi.ts                               → SM-02
│   ├── gamificationApi.ts                            → DG-04 (tipos: DG-04)
│   ├── leaderboardApi.ts                             → DG-05
│   ├── sessionApi.ts                                 → ST-02
│   ├── progressApi.ts                                → ST-05
│   ├── queueApi.ts                                   → ST-03
│   ├── studyPlanApi.ts                               → ST-04
│   ├── adminApi.ts                                   → AO-02
│   ├── ownerApi.ts                                   → AO-04
│   ├── ragPipelineApi.ts, ragChatApi.ts              → AI-01, AI-02
│   ├── embeddingsApi.ts                              → AI-04
│   ├── contentGenerationApi.ts                       → AI-03
│   ├── 3dApi.ts, 3dAnnotationsApi.ts                 → 3D-02, 3D-04
│   ├── telegramBotApi.ts                             → MG-01
│   ├── whatsappBotApi.ts                             → MG-02
│   ├── stripeCheckoutApi.ts                          → BL-01
│   ├── messagingApi.ts                               → MG-04
│   ├── billingPlansApi.ts                            → BL-04
│   └── flashcardGenerationApi.ts                     → FC-06
├── lib/
│   ├── api.ts                                        → IF-01 (74 importadores)
│   ├── config.ts, logger.ts, supabase.ts             → IF-01
│   ├── bkt-v4.ts                                     → QZ-04
│   ├── fsrs-v4.ts                                    → FC-04
│   ├── xp-constants.ts                               → DG-03
│   ├── queue-scheduler.ts                            → ST-03
│   ├── content-tree-helpers.ts                       → SM-04
│   ├── highlight-helpers.ts                          → SM-06
│   ├── mux-*.ts                                      → SM-05
│   ├── pdf-parser.ts, embeddings-processor.ts        → AI-01
│   ├── vector-search.ts, embedding-cache.ts          → AI-04
│   ├── prompt-*.ts, prompt-registry.ts               → AI-06
│   ├── ai-config.ts, ai-client.ts                    → IF-03
│   ├── telegram-client.ts                            → MG-01
│   ├── whatsapp-client.ts                            → MG-02
│   ├── security-headers.ts                           → AS-05
│   ├── plan-definitions.ts                           → BL-04
│   ├── layout/*.ts                                   → layout-system
│   ├── design-tokens.ts, token-registry.ts           → design-tokens
│   ├── tiptap/**/*.ts                                → tiptap-editor
│   └── ui-helpers.ts                                 → IF-02
├── routes/
│   ├── auth*.ts                                      → AS-01
│   ├── quiz*.ts                                      → QZ-02
│   ├── flashcards*.ts                                → FC-02
│   ├── summaries*.ts                                 → SM-02
│   ├── study-sessions*.ts                            → ST-02
│   ├── gamification*.ts                              → DG-04
│   ├── 3d*.ts                                        → 3D-02
│   ├── admin*.ts                                     → AO-02
│   ├── owner*.ts                                     → AO-04
│   ├── ai*.ts                                        → AI-05
│   ├── messaging*.ts                                 → MG-04
│   └── webhooks/stripe*.ts                           → BL-02
├── types/
│   ├── gamification.ts                               → DG-04 (contrato con DG-03)
│   ├── billing.ts                                    → BL-04
│   ├── content.ts                                    → XX-04 (type-guardian)
│   └── *.types.ts                                    → XX-04
├── middleware/
│   ├── auth*.ts                                      → AS-01
│   ├── cors*.ts                                      → AS-05
│   ├── ai-init.ts                                    → IF-03
│   └── *.ts                                          → IF-01 (genéricos)
├── pages/
│   ├── student/DashboardPage.tsx                     → DG-01
│   ├── professor/DashboardPage.tsx                   → DG-02
│   └── admin/*, owner/*                              → AO-01, AO-03
└── context/
    └── (ver arriba)

database/
├── migrations/                                        → IF-04 (DDL), XX-05 (SQL gen)
├── schema.sql                                         → IF-04
├── seed.sql                                           → IF-04
├── policies/                                          → AS-01
└── rls-*.sql                                          → AS-01

tests/
├── quiz/                                              → QZ-03
├── flashcards/                                        → FC-03
├── summaries/                                         → SM-03
├── blockEditor/                                       → SM-03
├── study/                                             → ST-* testers
└── **/*.test.ts                                       → XX-06 (test-orchestrator)

docs/
└── *.md                                               → XX-03 (docs-writer)

.github/workflows/
└── *.yml                                              → IF-05

supabase/functions/server/
├── crud-factory.ts                                    → IF-01
├── db.ts                                              → IF-01
├── auth-helpers.ts                                    → IF-01, AS-01
├── validate.ts                                        → IF-01
├── rate-limit.ts                                      → IF-01
├── index.ts                                           → IF-01
└── routes/
    └── (backend route files by section)

.tailwind.config.ts                                    → design-tokens
tsconfig.json                                          → XX-04
package.json                                           → IF-05
```

**Archivos críticos sin agente designado → escalar a XX-01 (Arquitecto):**
- Cambios estructurales en `tsconfig.json`, `package.json`, `vite.config.ts`
- Cambios en convenciones de proyecto no contenidas en una zona de agente

---

## Grafo de Dependencias

### Jerarquía: Dependencias Explícitas

```
┌─────────────────────────────────────────────────────────────────┐
│                    NIVEL 0: SIN DEPENDENCIAS                     │
├─────────────────────────────────────────────────────────────────┤
│ IF-01 (infra-plumbing) — 74 importadores (base de todo)          │
│ IF-04 (infra-database) — DDL, migrations, schema                 │
│ IF-05 (infra-ci) — DevOps, no código de negocio                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    NIVEL 1: DEPENDENCIA DE IF                   │
├─────────────────────────────────────────────────────────────────┤
│ AS-01 (auth-backend) — depende IF-01                             │
│ AS-02 (auth-frontend) — depende AS-01, IF-01                     │
│ IF-02 (infra-ui) — depende IF-01, AS-02                          │
│ IF-03 (infra-ai) — depende IF-01                                 │
│ design-tokens — sin dependencias de negocio                      │
│ layout-system — depende IF-01, AS-02                             │
│ tiptap-editor — depende IF-01, IF-02                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              NIVEL 2: BLOQUEADORES DE SECCIONES                  │
├─────────────────────────────────────────────────────────────────┤
│ SM-04 (content-tree) — depende AS-02, IF-01, SM-02              │
│     ↳ 28 importadores — BLOQUEA: QZ-01, FC-01, ST-01, DG-01    │
│                                                                    │
│ QZ-04 (quiz-adaptive) — depende IF-01                            │
│     ↳ BLOQUEA: QZ-02, ST-05 (BKT knowledge tracing)             │
│                                                                    │
│ FC-04 (flashcards-fsrs) — depende IF-01                          │
│     ↳ BLOQUEA: FC-02, ST-03, ST-05 (spaced repetition)          │
│                                                                    │
│ DG-04 (gamification-backend) — depende AS-01, IF-01              │
│     ↳ BLOQUEA: DG-03, DG-05, QZ-06, DG-01, DG-02                │
│                                                                    │
│ SM-02 (summaries-backend-v2) — depende AS-01, IF-01              │
│     ↳ BLOQUEA: SM-04, SM-01, SM-03 (editor + publishing)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           NIVEL 3: SECCIONES (Implementación de Features)        │
├─────────────────────────────────────────────────────────────────┤
│ Quiz (QZ-01 a QZ-06)                                             │
│ Flashcards (FC-01 a FC-06)                                       │
│ Summaries (SM-01, SM-03, SM-05, SM-06)                           │
│ Study (ST-01 a ST-05)                                            │
│ Dashboard (DG-01 a DG-05)                                        │
│ Admin/Owner (AO-01 a AO-04)                                      │
│ AI/RAG (AI-01 a AI-06)                                           │
│ 3D (3D-01 a 3D-04)                                               │
│ Messaging (MG-01 a MG-04)                                        │
│ Billing (BL-01 a BL-04)                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           NIVEL 4: TESTERS Y AUDITORES (Cross-Cutting)          │
├─────────────────────────────────────────────────────────────────┤
│ QZ-03, FC-03, SM-03, XX-06 (test-orchestrator)                   │
│ AS-03, AS-04, XX-04, XX-07, XX-08, XX-09 (auditors — no modif)  │
│ XX-02 (quality-gate) — depende de todos                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│             NIVEL 5: ORQUESTACIÓN (Architect)                    │
├─────────────────────────────────────────────────────────────────┤
│ XX-01 (architect) — lee AGENT-REGISTRY, selecciona agentes       │
└─────────────────────────────────────────────────────────────────┘
```

### Bloqueadores Críticos (No pueden empezar sin estos)

**Tier 1: Bloqueadores Absolutos**
```
IF-01 (infra-plumbing) — TODOS dependen
  ├→ Bloquea: 74 agentes (salvo XX-01, XX-02, XX-03, XX-04, XX-07, XX-08, XX-09)
  └→ 74 importadores de lib/api.ts, lib/config.ts, lib/logger.ts

AS-01 (auth-backend) — Todos los backends
  ├→ Bloquea: QZ-02, FC-02, SM-02, ST-02, DG-04, AO-02, AO-04, AI-05, 3D-02, MG-04, BL-02
  └→ JWT validation, RLS policies

AS-02 (auth-frontend) — Todos los frontends
  ├→ Bloquea: QZ-01, FC-01, SM-01, ST-01, ST-04, ST-05, DG-01, DG-02, DG-03, AO-01, AO-03, AI-02, 3D-01, 3D-03, 3D-04, BL-01, BL-03, MG-03, FC-05, SM-05, SM-06, IF-02
  └→ AuthContext (42 importadores)
```

**Tier 2: Bloqueadores de Dominios**
```
SM-04 (content-tree) — Dominio de Summaries + dependientes
  ├→ Bloquea: QZ-01 (quiz-frontend), FC-01 (flashcards-frontend), ST-01 (study-hub), DG-01 (dashboard-student), DG-02 (dashboard-professor), AO-01 (admin-frontend)
  └→ 28 importadores de ContentTreeContext

SM-02 (summaries-backend-v2) — Requisito para SM-04
  ├→ Bloquea: SM-04, SM-01, SM-03
  └→ API endpoints de contenido

QZ-04 (quiz-adaptive) — Algoritmo BKT
  ├→ Bloquea: QZ-02, ST-05
  └→ lib/bkt-v4.ts — knowledge tracing

FC-04 (flashcards-fsrs) — Algoritmo FSRS
  ├→ Bloquea: FC-02, ST-03, ST-05
  └→ lib/fsrs-v4.ts — spaced repetition

DG-04 (gamification-backend) — Sistema de puntos
  ├→ Bloquea: DG-03, DG-05, QZ-06, DG-01, DG-02
  └→ 13 endpoints XP + badges + leaderboard
```

### Orden de Ejecución Recomendado (Fase de Inicialización)

```
Fase 1 (Paralela):
  - IF-01 (infra-plumbing)
  - IF-04 (infra-database)
  - IF-05 (infra-ci)
  - design-tokens
  - tiptap-editor

Fase 2 (Secuencial - depende Fase 1):
  - AS-01 (auth-backend)
  - IF-02 (infra-ui)
  - IF-03 (infra-ai)
  - layout-system

Fase 3 (Secuencial - depende Fase 2):
  - AS-02 (auth-frontend)

Fase 4 (Paralela - depende Fase 3):
  - QZ-04 (quiz-adaptive)
  - FC-04 (flashcards-fsrs)
  - SM-02 (summaries-backend-v2)
  - XX-05 (migration-writer)

Fase 5 (Secuencial - depende Fase 4):
  - SM-04 (content-tree)

Fase 6 (Paralela - depende Fase 5):
  - QZ-01, QZ-02, QZ-03, QZ-05, QZ-06
  - FC-01, FC-02, FC-03, FC-05, FC-06
  - SM-01, SM-03, SM-05, SM-06
  - ST-01, ST-02, ST-03, ST-04, ST-05
  - DG-01, DG-02, DG-03, DG-04, DG-05
  - AO-01, AO-02, AO-03, AO-04
  - AI-01 a AI-06
  - 3D-01 a 3D-04
  - MG-01 a MG-04
  - BL-01 a BL-04

Fase 7 (Paralela):
  - XX-03 (docs-writer)
  - XX-06 (test-orchestrator)

Fase 8 (Auditores):
  - AS-03, AS-04 (RLS + security audits)
  - XX-04, XX-07, XX-08, XX-09 (type, refactor, design, API audits)

Fase 9 (Post-Ejecución):
  - XX-02 (quality-gate) — después de cada agente de Fases 4-6
```

---

## Caminos Críticos

### Camino Más Largo (Profundidad = 7 niveles)

```
DG-01 (dashboard-student)
  ↓ depende
ST-05 (study-progress)
  ↓ depende
ST-02 (study-sessions)
  ↓ depende
ST-01 (study-hub)
  ↓ depende
SM-04 (content-tree)
  ↓ depende
SM-02 (summaries-backend-v2)
  ↓ depende
AS-01 (auth-backend)
  ↓ depende
IF-01 (infra-plumbing)
  ↓ depende
—— (nada)

Total: 8 niveles (IF-01 → AS-01 → SM-02 → SM-04 → ST-01 → ST-02 → ST-05 → DG-01)
```

**Implicación:** Cualquier cambio en IF-01 o AS-01 requiere cascada de 6-7 agentes.

### Caminos Alternativos (Otros 6+ niveles)

```
DG-02 (dashboard-professor)
  → SM-04 → SM-02 → AS-01 → IF-01
(7 niveles)

AI-02 (rag-chat)
  → AI-05 (ai-backend) → AS-01 → IF-01
(4 niveles)

BL-01 (stripe-checkout)
  → BL-04 (billing-plans) → IF-01
(3 niveles)
```

### Ciclos de Ejecución Típicos

**Ciclo A: Feature pequeña (frontend alone)**
```
IF-01 → AS-02 → [COMPONENT] → XX-02 (QG)
Tiempo: ~30 min, 2-3 agentes máx
```

**Ciclo B: Feature mediana (frontend + backend)**
```
IF-01 → AS-01 → [BACKEND: service/routes]
        ↓ paralela
        AS-02 → [FRONTEND: components/hooks]
        ↓
       XX-02 (QG)
Tiempo: ~60 min, 4-5 agentes
```

**Ciclo C: Feature grande (full stack + cross-section)**
```
IF-01 → AS-01 → [BACKEND FOUNDATION]
  ↓
  AS-02 → SM-04 → [CONTENT HIERARCHY]
  ↓ paralela
  [QZ, FC, SM, ST all start]
  ↓
  [DG depends on all above]
  ↓
  XX-02 (QG) × N agents
Tiempo: ~120 min, 15-20 agentes, 3+ fases
```

---

## Complejidad de Modelo

### Recomendaciones de Modelo por Agente

Los agentes AXON usan `model: "opus"` u `model: "sonnet"` según complejidad. NUNCA Haiku.

| Complejidad | Descripción | Ejemplos | Modelo |
|-----------|-----------|----------|--------|
| **Alta** | Algoritmos complejos, orquestación, multi-archivo, tipos sofisticados | QZ-04, FC-04, SM-01, SM-04, DG-01, DG-02, AI-*, 3D-01, tiptap-editor | opus |
| **Media** | CRUD de 1-3 archivos, servicios estándar, componentes UI | Mayoría (QZ-02, FC-02, ST-02, DG-03, DG-04, etc.) | sonnet |
| **Baja** | Solo lectura (auditors), generadores simples | XX-03, XX-04, XX-07, XX-08, XX-09 | sonnet |

**Regla INVARIABLE:** `model: "opus"` o `model: "sonnet"` only. NEVER haiku.
REGLA: NUNCA usar Haiku. El mínimo modelo es Sonnet.

---

## Reglas de Aislamiento

### Principios Fundamentales

```
1. CERO OVERLAP de archivos entre agentes
   - Cada archivo tiene UN dueño
   - Si archivo X necesita cambios de 2 agentes → asignar a UNO solo
   - Si no está claro → escalar a XX-01 (Architect)

2. Dependencia clara
   - A → B significa B debe terminar antes que A
   - Si A necesita modificar archivo de B → escalar
   - Cross-file imports OK si importador ← importado

3. Aislamiento de Rama
   - 2+ agentes mismo repo → usa worktrees
   - Cada agente: git checkout -b <nombre> main
   - git diff main..<branch> DEBE mostrar SOLO archivos del agente
   - Si hay archivos extra → agent FALLÓ aislamiento

4. Calidad Gate (XX-02) después de CADA agente
   - 6 checks obligatorios:
     1. Zone compliance (¿tocó archivos de otra zona?)
     2. TypeScript (¿no `any`, no errores?)
     3. Spec coherence (¿parámetros == spec?)
     4. Tests (¿coverage happy + error path?)
     5. Git hygiene (¿commit limpio, sin secretos?)
     6. Backward compat (¿no rompió exports?)
   - Verdicts: APPROVE / NEEDS FIX / BLOCK

5. Escalamiento a Arquitecto
   - Si necesitás archivo de otra zona
   - Si encontrás conflicto con otro agente
   - Si decisión técnica impacta >1 sección
   - Si no estás seguro → NO ADIVINES, escala
```

### Detección de Violaciones

**Rojo vivo (BLOCK):**
- Archivos modificados que no son de la zona del agente
- Cambios en interfaces públicas sin coordinar
- Secretos expuestos (.env, API keys)
- Exports removidos que otros importan

**Amarillo (NEEDS FIX):**
- `any` types, console.logs
- Tests faltantes o flaky
- Branch name cosmético
- Commit message poco claro

---

## Conclusión

Este registro es **la fuente de verdad** para mapear requests del usuario → agentes ejecutores. Úsalo:

1. **Lectura inicial:** ¿Qué sección toca la feature? → ver tabla de sección
2. **Búsqueda de archivos:** ¿Qué archivos cambian? → ver búsqueda por ruta
3. **Resolver dependencias:** ¿Qué agentes deben ejecutarse primero? → ver grafo
4. **Orden de ejecución:** ¿Secuencial o paralelo? → ver caminos críticos
5. **Calidad:** ¿Pasó XX-02? → ver reglas de aislamiento

**Mantenimiento:** Actualizar cuando:
- Se agregue agente nuevo
- Se reassigne zona a un agente
- Se elimine archivo o agente (legacy)
- Se descubra nueva dependencia

---

**Documento generado:** 29 de marzo de 2026
**Fuente:** Sistema AXON 74-Agent Architecture
**Próxima actualización:** Tras cambios de arquitectura o adiciones de agentes
