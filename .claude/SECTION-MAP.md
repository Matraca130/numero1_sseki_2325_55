# AXON Frontend — Section Map (Código Real)

> **Source:** Escaneo real de `numero1_sseki_2325_55/src/app/` (624 archivos)
> **Updated:** 2026-03-25
> **Purpose:** Saber qué hace cada sección para elegir agentes rápidamente

---

## Cómo usar este mapa

1. Usuario dice qué quiere hacer
2. Buscar la sección relevante abajo
3. Ver los agentes asignados
4. Lanzar solo esos agentes

---

## 1. QUIZ — Evaluaciones adaptativas

**Qué hace:** Quizzes con preguntas MCQ, True/False, Open-ended. Generación AI de preguntas. BKT para knowledge tracing. Sesión con timer, backup localStorage, recovery. Resultados con mastery por keyword.

**Archivos:** 62 files (~8,500 LOC)
- `components/content/QuizView.tsx` — orquestador (selection ↔ taker)
- `components/content/QuizSelection.tsx` (749L) — sidebar tree + filtros
- `components/student/QuizTaker.tsx` (490L) — sesión activa
- `components/student/QuizResults.tsx` (443L) — resultados + mastery
- `components/student/renderers/` — McqRenderer, TrueFalseRenderer, OpenRenderer
- `components/professor/QuizQuestionsEditor.tsx` — CRUD preguntas
- `components/professor/QuizFormModal.tsx` — crear/editar quiz
- `components/professor/QuizExportImport.tsx` — export/import JSON
- `components/student/useQuizSession.ts` (393L) — lifecycle sesión
- `components/student/useQuizNavigation.ts` (256L) — navegación preguntas
- `components/student/useQuizBackup.ts` (202L) — localStorage recovery
- `components/student/useQuizBkt.ts` — BKT fire-and-forget
- `components/student/useQuizGamificationFeedback.ts` — XP post-quiz
- `components/student/AdaptiveQuizModal.tsx` — quiz AI adaptativo
- `services/quizQuestionsApi.ts`, `quizzesEntityApi.ts`, `quizAttemptsApi.ts`
- `services/quizConstants.ts`, `quizDesignTokens.ts`
- `lib/quiz-utils.ts` — normalización, checkAnswer
- `routes/quiz-student-routes.ts`

**Agentes:** QZ-01 (frontend), QZ-02 (backend), QZ-03 (tester), QZ-04 (adaptive/BKT), QZ-05 (questions/renderers), QZ-06 (analytics)

**Dependencias:** ContentTreeContext (SM-04), BKT states (ST-05), Gamification (DG-03)

---

## 2. FLASHCARDS — Tarjetas con repetición espaciada

**Qué hace:** 6 tipos de tarjetas (text, image, cloze). Review con FSRS v4. Sesiones adaptativas multi-round con AI. Bulk import CSV/JSON. Keyword mastery tracking. Professor CRUD con image upload.

**Archivos:** 45 files (~8,200 LOC)
- `components/content/FlashcardView.tsx` — orquestador screens
- `components/content/flashcard/` (24 files) — Hub, Section, Deck, Session, Summary screens + adaptive/
- `components/student/FlashcardCard.tsx` (209L) — tarjeta 3D flip
- `components/student/FlashcardReviewer.tsx` (369L) — review session
- `components/professor/FlashcardFormModal.tsx` (523L) — crear/editar
- `components/professor/FlashcardBulkImport.tsx` (723L) — import masivo
- `components/professor/FlashcardPreview.tsx` — preview live
- `components/professor/FlashcardImageUpload.tsx` — drag-drop images
- `components/ai/SmartFlashcardGenerator.tsx` (403L) — generación AI
- `hooks/useFlashcardNavigation.ts` (567L) — state machine + LRU cache
- `hooks/useFlashcardEngine.ts` (318L) — session lifecycle + FSRS
- `hooks/useAdaptiveSession.ts` (479L) — multi-round AI sessions
- `hooks/useReviewBatch.ts` (256L) — batch queue + localStorage
- `services/flashcardApi.ts`, `flashcardMappingApi.ts`, `reviewsApi.ts`
- `lib/flashcard-utils.ts`, `lib/flashcard-export.ts`
- `routes/flashcard-student-routes.ts`

**Agentes:** FC-01 (frontend), FC-02 (backend), FC-03 (tester), FC-04 (FSRS engine), FC-05 (keywords), FC-06 (AI generation)

**Dependencias:** FSRS states (studySessionApi), BKT (bktApi), ContentTree (SM-04), Gamification (useSessionXP)

---

## 3. SUMMARIES & CONTENT — Lectura y navegación de contenido

**Qué hace:** Visor de resúmenes con paginación HTML. Highlighting de keywords inline. Text annotations. Video player con notas timestamped. Content tree (Institution→Course→Topic). Professor: editor TipTap WYSIWYG.

**Archivos:** 47 files (~6,800 LOC)
- `components/content/StudentSummaryReader.tsx` (443L) — reader principal
- `components/content/SummaryView.tsx` (381L) — entry point prof/student
- `components/content/StudentSummariesView.tsx` (329L) — browser summaries
- `components/content/TopicSummariesView.tsx` (393L) — summaries por topic
- `components/student/TextHighlighter.tsx` (422L) — highlighting
- `components/student/KeywordHighlighterInline.tsx` (380L) — keywords inline
- `components/student/ReaderKeywordsTab.tsx` (515L) — tab keywords
- `components/student/ReaderAnnotationsTab.tsx` (222L) — tab annotations
- `components/student/VideoPlayer.tsx` (500L) — Mux player + notas
- `components/summary/ChunkRenderer.tsx`, `SummaryHeader.tsx`
- `components/tiptap/TipTapEditor.tsx` (861L) — editor WYSIWYG
- `components/video/MuxVideoPlayer.tsx`, `MuxUploadPanel.tsx`
- `context/ContentTreeContext.tsx` (242L) — árbol de contenido
- `hooks/useContentTree.ts`, `useSummaryPersistence.ts`, `useSummaryTimer.ts`
- `hooks/queries/useSummaryReaderQueries.ts`, `useSummaryReaderMutations.ts`
- `services/contentTreeApi.ts`, `summariesApi.ts`, `studentSummariesApi.ts`
- `lib/summary-content-helpers.tsx`, `content-tree-helpers.ts`
- `routes/summary-student-routes.ts`

**Agentes:** SM-01 (frontend viewer), SM-02 (backend), SM-03 (tester), SM-04 (content tree), SM-05 (video/Mux), SM-06 (text highlighter)

**Dependencias:** AuthContext (AS-02), lib/api.ts (IF-01), sanitize.ts (AS-05)

---

## 4. STUDY & SPACED REPETITION — Hub de estudio y planificación

**Qué hace:** Study Hub con secciones/topics/progreso. Study Plans con wizard 6 pasos. Schedule con calendario y AI recommendations. Study Queue con NeedScore ranking. Mastery dashboard. FSRS + BKT engine.

**Archivos:** 52 files (~12,300 LOC)
- `components/content/StudyHubView.tsx` (340L) — hub principal
- `components/content/StudyHubHero.tsx` (588L) — hero greeting
- `components/content/StudyHubSectionCards.tsx` (594L) — cards secciones
- `components/content/StudyOrganizerWizard.tsx` (1268L) — wizard 6 pasos
- `components/content/StudyDashboardsView.tsx` (599L) — multi-dashboard
- `components/content/MasteryDashboardView.tsx` (235L) — mastery calendar
- `components/content/KnowledgeHeatmapView.tsx` (288L) — heatmap actividad
- `components/content/StudyView.tsx` (12L) — delegator a summaries
- `components/schedule/StudyPlanDashboard.tsx` (881L) — plan dashboard
- `components/schedule/WeekMonthViews.tsx` (687L) — vistas semana/mes
- `components/schedule/DailyRecommendationCard.tsx` — AI recomendaciones
- `components/schedule/WeeklyInsightCard.tsx` — AI insights semanales
- `hooks/useStudyPlans.ts` (735L) — CRUD plans + tasks
- `hooks/useStudyTimeEstimates.ts` (453L) — estimaciones tiempo
- `hooks/useStudyQueueData.ts` (292L) — shared queue provider
- `hooks/useTopicMastery.ts` (241L) — mastery por topic
- `hooks/useKeywordMastery.ts` (155L) — mastery por keyword
- `hooks/useScheduleAI.ts` (221L) — AI schedule actions
- `services/studySessionApi.ts` (245L), `bktApi.ts`, `keywordMasteryApi.ts` (529L)
- `lib/studyQueueApi.ts` — NeedScore algorithm
- `lib/mastery-helpers.ts` — Delta Mastery Scale
- `lib/grade-mapper.ts` — SM-2 → FSRS → float
- `context/StudyPlansContext.tsx`, `TopicMasteryContext.tsx`, `StudyTimeEstimatesContext.tsx`
- `utils/rescheduleEngine.ts`, `planSchedulingUtils.ts`, `studyPlanMapper.ts`

**Agentes:** ST-01 (study hub), ST-02 (sessions), ST-03 (queue), ST-04 (plans), ST-05 (progress/mastery)

**Dependencias:** ContentTree (SM-04), FSRS/BKT (FC-04), Gamification (DG-03), AI schedule (AI-05)

---

## 5. DASHBOARD & GAMIFICATION — Métricas y motivación

**Qué hace:** Dashboard student con KPIs, charts, heatmap. Gamification: XP (12 niveles, cap 500/día), streaks, 39 badges, leaderboard semanal. GamificationView premium. Professor dashboard (métricas).

**Archivos:** 32+ files (~5,700 LOC)
- `components/content/DashboardView.tsx` (224L) — dashboard principal
- `components/content/WelcomeView.tsx` (648L) — welcome premium
- `components/content/GamificationView.tsx` (574L) — gamification hub
- `components/dashboard/` (12 files) — StatsCards, MasteryOverview, ActivityHeatMap, StudyStreakCard, DashboardCharts, KeywordRow
- `components/gamification/` (11 files) — XPPopup, BadgeShowcase, LevelProgressBar, SessionXPSummary, ComboIndicator, DailyGoalWidget
- `components/gamification/pages/` — BadgesPage, LeaderboardPage, XpHistoryPage
- `components/student/gamification/` (5 files) — BadgeShowcase, LeaderboardCard, StreakPanel, StudyQueueCard, XpHistoryFeed
- `pages/DashboardPage.tsx` — page wrapper
- `hooks/useSessionXP.ts` (265L) — XP optimistic tracking
- `hooks/useGamification.ts` (128L) — React Query wrappers
- `services/gamificationApi.ts` (377L) — 13 endpoints
- `types/gamification.ts` (177L) — XP_TABLE, LEVEL_THRESHOLDS
- `context/GamificationContext.tsx` (238L)
- `lib/xp-constants.ts` — mirror backend

**Agentes:** DG-01 (dashboard student), DG-02 (dashboard professor), DG-03 (gamification engine), DG-04 (gamification backend), DG-05 (leaderboard)

**Dependencias:** StudentDataContext, BKT/FSRS states, study sessions

---

## 6. ADMIN & OWNER — Gestión institucional

**Qué hace:** Owner: dashboard, miembros (1276L!), planes, subscripciones, access rules, reportes. Admin: settings, AI health, messaging (Telegram/WhatsApp). Membership CRUD, role management.

**Archivos:** 18 files (~5,200 LOC)
- `components/roles/pages/owner/OwnerMembersPage.tsx` (1276L) — GIGANTE
- `components/roles/pages/owner/OwnerPlansPage.tsx` (844L)
- `components/roles/pages/owner/OwnerDashboardPage.tsx` (602L)
- `components/roles/pages/owner/OwnerSubscriptionsPage.tsx` (373L)
- `components/roles/pages/owner/OwnerAccessRulesPage.tsx` (363L)
- `components/roles/pages/owner/OwnerReportsPage.tsx` (301L)
- `components/roles/pages/admin/AdminMessagingSettingsPage.tsx` (521L)
- `components/roles/pages/admin/AdminAIHealthPage.tsx` (345L)
- `components/roles/pages/admin/AdminSettingsPage.tsx` (271L)
- `components/roles/pages/admin/` — 5 más (placeholders pequeños)
- `services/platform-api/pa-admin.ts` (223L)
- `services/platform-api/pa-plans.ts` (127L)
- `services/platform-api/pa-institutions.ts` (161L)
- `routes/admin-routes.ts`, `owner-routes.ts`

**Agentes:** AO-01 (admin frontend), AO-02 (admin backend), AO-03 (owner frontend), AO-04 (owner backend), AO-05 (admin-dev legacy)

**Dependencias:** PlatformDataContext, AuthContext

---

## 7. AUTH & SECURITY — Autenticación y seguridad

**Qué hace:** Login/signup con Supabase. Dual token (ANON_KEY + JWT). Role routing (owner/admin/professor/student). Session restore. Multi-institution selection. RequireAuth/RequireRole guards.

**Archivos:** 10 files (~1,500 LOC)
- `context/AuthContext.tsx` (487L) — estado auth completo
- `components/auth/LoginPage.tsx` (267L) — login/signup tabs
- `components/auth/RequireAuth.tsx` (32L) — guard autenticación
- `components/auth/RequireRole.tsx` (26L) — guard por rol
- `components/auth/PostLoginRouter.tsx` (65L) — redirect por rol
- `components/auth/SelectRolePage.tsx` (156L) — picker institución
- `components/auth/AuthLayout.tsx` (29L) — root wrapper
- `lib/api.ts` (308L) — apiCall + token management
- `lib/supabase.ts` (29L) — singleton client
- `routes.tsx` (120L) — route tree completo

**Agentes:** AS-01 (auth backend), AS-02 (auth frontend), AS-03 (RLS auditor), AS-04 (security scanner), AS-05 (CORS/CSP)

**Dependencias:** Supabase client, lib/api.ts

---

## 8. AI & RAG — Inteligencia artificial

**Qué hace:** RAG chat con streaming SSE. Generación smart (flashcards, quiz questions) con NeedScore. PDF ingestion → chunks → embeddings. Voice calls (OpenAI Realtime). AI reports quality. Schedule AI agent.

**Archivos:** 20+ files (~5,500 LOC)
- `components/ai/AxonAIAssistant.tsx` (1106L) — panel flotante AI
- `components/ai/SmartFlashcardGenerator.tsx` (403L) — gen flashcards
- `components/ai/VoiceCallPanel.tsx` — voice realtime
- `services/ai-service/` (10 files) — as-chat, as-generate, as-generate-smart, as-analytics, as-reports, as-ingest, as-schedule, as-realtime, as-types, as-legacy
- `services/aiApi.ts` (263L) — quiz-scoped AI
- `services/aiFlashcardGenerator.ts` — wrapper keyword-aware
- `services/aiReportApi.ts` (205L) — quality reports
- `services/smartGenerateApi.ts`, `adaptiveGenerationApi.ts`
- `hooks/useSmartGeneration.ts` (279L), `useAdminAiTools.ts` (200L)
- `hooks/usePdfIngest.ts` (171L), `useRealtimeVoice.ts` (309L)
- `hooks/useAiReports.ts` (244L), `useRagAnalytics.ts` (142L)
- `hooks/useScheduleAI.ts` (221L)
- `lib/sanitize.ts` — DOMPurify (XSS defense)

**Agentes:** AI-01 (RAG pipeline), AI-02 (RAG chat), AI-03 (generation), AI-04 (embeddings), AI-05 (backend), AI-06 (prompts)

**Dependencias:** lib/api.ts (streaming), sanitize.ts, AuthContext

---

## 9. 3D VIEWER — Modelos anatómicos interactivos

**Qué hace:** Visor Three.js para modelos GLB. Pins con keywords. Student notes espaciales. Layers/parts con visibility toggle. Animations, clipping planes, explode view. Capture → flashcard.

**Archivos:** 19 files (~4,700 LOC)
- `components/viewer3d/PinSystem.tsx` (440L) — CRUD pins + raycasting
- `components/viewer3d/StudentNotes3D.tsx` (450L) — notas espaciales
- `components/viewer3d/ModelPartMesh.tsx` (402L) — carga parts GLB
- `components/viewer3d/MultiPointPlacer.tsx` (342L) — line/area pins
- `components/viewer3d/PinEditor.tsx` (282L) — panel edición pins
- `components/viewer3d/LayerPanel.tsx` (269L) — toggle capas
- `components/viewer3d/CaptureViewDialog.tsx` (267L) — screenshot → flashcard
- `components/viewer3d/ClippingPlaneControls.tsx` (248L) — cortes anatómicos
- `components/viewer3d/ExplodeControl.tsx` (228L) — vista explosionada
- `components/viewer3d/AnimationControls.tsx` (202L) — GLTF animations
- `components/content/ModelViewer3D.tsx` (620L) — viewer principal
- `components/content/ThreeDView.tsx` (421L) — 3-level navigation
- `components/content/AtlasScreen.tsx` (225L) — grid modelos
- `components/professor/ModelManager.tsx` (666L) — CRUD modelos
- `components/professor/ModelUploadZone.tsx` (258L) — upload GLB
- `lib/model3d-api.ts` (329L) — upload + validation
- `hooks/usePinData.ts`, `useNoteData.ts`
- `routes/threed-student-routes.ts`

**Agentes:** 3D-01 (viewer frontend), 3D-02 (backend), 3D-03 (upload), 3D-04 (annotations)

**Dependencias:** Three.js (vendor chunk), Supabase storage, lib/model3d-api

---

## 10. INFRASTRUCTURE — Shared libs y plumbing

**Qué hace:** API client (apiCall + dedup + SSE), Supabase singleton, logger, queryClient, ErrorBoundary, shared components (28), design system tokens, layouts (Student/Professor/Admin/Owner).

**Archivos:** ~130 files
- `lib/api.ts` (308L, 74 importers) — **MÁS IMPORTADO del codebase**
- `lib/logger.ts` (87L, 34 importers)
- `lib/supabase.ts`, `lib/config.ts`, `lib/queryClient.ts`
- `lib/error-utils.ts`, `lib/api-helpers.ts`, `lib/concurrency.ts`
- `lib/sanitize.ts`, `lib/withBoundary.tsx`
- `components/shared/` (28 files) — ErrorBoundary, ContentTree, FadeIn, KPICard, etc.
- `components/ui/` (48 files shadcn) — button, dialog, sidebar, chart, etc.
- `components/layout/` (18 files) — StudentLayout, RoleShell, Sidebar, TopicSidebar
- `components/design-kit/` (9 files) — dk-tokens, dk-primitives, dk-feedback, etc.
- `design-system/` (14 files) — colors, typography, shapes, animation, components
- `types/platform.ts` (255L, 30 importers) — tipos canónicos DB

**Agentes:** IF-01 (plumbing), IF-02 (UI shared), IF-03 (AI infra), IF-04 (database), IF-05 (CI/CD)

**Dependencias:** Ninguna — ES la dependencia de todos

---

## 11. MESSAGING — Telegram y WhatsApp

**Qué hace:** Telegram bot linking (code generation, link status, unlink). WhatsApp Cloud API (feature-flagged). Admin messaging settings page.

**Archivos:** ~5 files
- `components/roles/pages/admin/AdminMessagingSettingsPage.tsx` (521L)
- `components/student/StudentSettingsPage.tsx` (360L) — Telegram linking
- `services/student-api/sa-telegram.ts` (38L)
- `services/platform-api/pa-messaging.ts` (78L)

**Agentes:** MG-01 (telegram), MG-02 (whatsapp), MG-03 (notifications), MG-04 (messaging backend)

**Dependencias:** AuthContext, platform settings

---

## 12. BILLING — Stripe

**Qué hace:** Checkout sessions, customer portal, subscription status. Webhook handling.

**Archivos:** Integrado en owner pages
- `components/roles/pages/owner/OwnerSubscriptionsPage.tsx` (373L)
- `components/roles/pages/owner/OwnerPlansPage.tsx` (844L)
- `services/platform-api/pa-plans.ts` (127L)

**Agentes:** BL-01 (checkout), BL-02 (webhooks), BL-03 (billing frontend), BL-04 (plans)

**Dependencias:** Stripe.js, Owner routes

---

## 13. PROFESSOR — Panel de gestión de contenido

**Qué hace:** CRUD completo para quizzes, flashcards, keywords, subtopics, connections, videos, 3D models. AI generation panel. Analytics. Bulk operations.

**Archivos:** 49 files (~10,900 LOC)
- `components/professor/` — QuizQuestionsEditor, QuestionFormModal, FlashcardFormModal, FlashcardBulkImport, KeywordsManager, ConnectionForm, SubtopicsPanel, ModelManager, AiGeneratePanel, EditorSidebar, CascadeSelector, BulkEditToolbar, etc.
- `components/roles/pages/professor/` — ProfessorFlashcardsPage, ProfessorQuizzesPage, QuizzesManager, SummaryDetailView, SummaryFormDialog, ProfessorCurriculumPage, ProfessorGamificationPage
- `routes/professor-routes.ts`

**Agentes:** Los agentes de cada sección cubren professor (QZ-01, FC-01, SM-01 incluyen la parte professor)

---

## Quick Reference: "Quiero hacer X → usa estos agentes"

| Quiero... | Agentes |
|-----------|---------|
| Arreglar bug en quiz | QZ-01 o QZ-02 (según front/back) |
| Nuevo tipo de flashcard | FC-01, FC-04 |
| Cambiar diseño del dashboard | DG-01, IF-02 |
| Arreglar auth/login | AS-02 |
| Nuevo endpoint API | El *-02 (backend) de la sección |
| Refactor de tipos | XX-04 (type-guardian) |
| Arreglar seguridad XSS | AS-04, AS-05 |
| Nuevo modelo 3D feature | 3D-01, 3D-04 |
| Mejorar AI chat | AI-02 |
| Agregar gamification a algo | DG-03, DG-04 |
| Cambiar layout/sidebar | IF-02 |
| Bug en study plans | ST-04 |
| Optimizar bundle | IF-05 |
| Crear migration SQL | XX-05 |
| Correr tests | XX-06 |
| Auditar código | XX-02 (quality-gate) o XX-07 (refactor-scout) |
| Actualizar design system | XX-08 |
| Full section overhaul | Arquitecto (XX-01) selecciona todos |
