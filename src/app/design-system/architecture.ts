/**
 * @AxonPlataforma — Architecture Reference
 *
 * Complemento del design-system/index.ts.
 * Mientras index.ts define COMO SE VE el app,
 * este archivo define COMO FUNCIONA: estructura, datos, estado,
 * convenciones de codigo y patrones de backend.
 *
 * USO:
 *   import { architecture, dataModels, apiEndpoints } from '@/app/design-system/architecture';
 *
 * Este archivo es DOCUMENTACION EJECUTABLE: los tipos son reales,
 * los endpoints son reales, las convenciones son las que usamos.
 *
 * UPDATED v4.4.5: PATH B migration complete. All spaced repetition
 * (FSRS v4 + BKT v4 + NeedScore v4.2) runs server-side.
 * Frontend files spacedRepetition.ts, keywordManager.ts, tracking.ts,
 * fsrs-engine.ts, bkt-engine.ts, fsrs-helpers.ts were DELETED.
 */

// ─────────────────────────────────────────────
// 1. FILE STRUCTURE — Mapa completo del proyecto
// ─────────────────────────────────────────────

export const fileStructure = {
  /** Punto de entrada — SIEMPRE tiene default export */
  entrypoint: '/src/app/App.tsx',

  /** Estilos globales */
  styles: {
    entry:    '/src/styles/index.css',      // importa fonts + tailwind + theme
    fonts:    '/src/styles/fonts.css',       // Google Fonts (@import url)
    tailwind: '/src/styles/tailwind.css',    // Tailwind v4 + tw-animate-css
    theme:    '/src/styles/theme.css',       // @theme, @layer base, custom utilities
  },

  /** Contextos de estado global */
  contexts: {
    app:         '/src/app/context/AppContext.tsx',         // Navegacion, curso actual, tema, planes de estudio
    studentData: '/src/app/context/StudentDataContext.tsx', // Datos del estudiante via Supabase
  },

  /** Datos estaticos (cursos, contenido, lecciones) */
  data: {
    courses:      '/src/app/data/courses.ts',       // Cursos, semestres, secciones, topicos, flashcards, quizzes, modelos 3D
    lessons:      '/src/app/data/lessonData.ts',    // Datos de lecciones por topico
    studyContent: '/src/app/data/studyContent.ts',  // Contenido medico detallado (markdown)
    keywords:     '/src/app/data/keywords.ts',      // Palabras clave con mastery levels
    images:       '/src/app/data/sectionImages.ts', // URLs de imagenes por seccion
  },

  /** Servicios (comunicacion con backend) */
  services: {
    studentApi:     '/src/app/services/studentApi.ts',          // CRUD completo: perfil, stats, progreso, sesiones, flashcards, resumos, keywords
    aiService:      '/src/app/services/aiService.ts',           // Chat RAG, generacion de flashcards/quiz (POST /ai/generate, /ai/rag-chat)
    aiFlashcards:   '/src/app/services/aiFlashcardGenerator.ts', // Generacion inteligente de flashcards via IA (backward compat wrapper)
    studySessionApi:'/src/app/services/studySessionApi.ts',     // Study sessions, review-batch, FSRS/BKT state reads
    // DELETED (PATH B): spacedRepetition.ts, keywordManager.ts — backend computes FSRS v4 + BKT v4
  },

  /** Tipos TypeScript */
  types: {
    student:  '/src/app/types/student.ts',  // StudentProfile, StudentStats, CourseProgress, FlashcardReview, StudySession, DailyActivity, StudySummary, KeywordState
    keywords: '/src/app/types/keywords.ts', // KeywordCollection, KeywordData, MasteryLevel, masteryConfig
  },

  /** Hooks personalizados */
  hooks: {
    useSmartPopup:          '/src/app/hooks/useSmartPopupPosition.ts',
    flashcardTypes:         '/src/app/hooks/flashcard-types.ts',          // Types, constants, pure utils for flashcards
    useFlashcardNavigation: '/src/app/hooks/useFlashcardNavigation.ts',   // View state machine (hub/section/deck)
    useFlashcardEngine:     '/src/app/hooks/useFlashcardEngine.ts',       // Session logic + backend persistence (PATH B: batch)
    useReviewBatch:         '/src/app/hooks/useReviewBatch.ts',           // Batch queue + submission hook
    useSummaryPersistence:  '/src/app/hooks/useSummaryPersistence.ts',    // Summary save/load persistence
    useSummaryTimer:        '/src/app/hooks/useSummaryTimer.ts',          // Timer for study sessions
    useSummaryViewer:       '/src/app/hooks/useSummaryViewer.ts',         // Summary viewer state
    useTextAnnotations:     '/src/app/hooks/useTextAnnotations.ts',       // Text annotation/highlight system
    useKeywordMastery:      '/src/app/hooks/useKeywordMastery.ts',       // Keyword mastery tracking
    useStudentNav:          '/src/app/hooks/useStudentNav.ts',           // Navigation hook for student views
  },

  /** Componentes — layout */
  layout: {
    StudentLayout:       '/src/app/components/roles/StudentLayout.tsx',   // Shell estudiante: providers + sidebar + header + <Outlet />
    Sidebar:             '/src/app/components/layout/Sidebar.tsx',            // Navegacion lateral oscura
    CourseSwitcher:      '/src/app/components/layout/CourseSwitcher.tsx',     // Dropdown de cursos en el header
    TopicSidebar:        '/src/app/components/layout/TopicSidebar.tsx',       // Panel lateral de topicos (study views)
    UserProfileDropdown: '/src/app/components/layout/UserProfileDropdown.tsx', // Menu de usuario top-right
  },

  /** Componentes — shared (reutilizables) */
  shared: {
    AxonLogo:       '/src/app/components/shared/AxonLogo.tsx',       // Logo + Badge + Brand + Watermark
    AxonPageHeader: '/src/app/components/shared/AxonPageHeader.tsx', // Header consistente para todas las paginas
  },

  /** Componentes — content views (una por vista) */
  views: {
    WelcomeView:          '/src/app/components/content/WelcomeView.tsx',          // Home: disciplinas + atalhos + performance
    DashboardView:        '/src/app/components/content/DashboardView.tsx',        // KPIs, graficos, progreso
    StudyHubView:         '/src/app/components/content/StudyHubView.tsx',         // Hub de estudio: navegacion por curso
    StudyView:            '/src/app/components/content/StudyView.tsx',            // Vista de estudio de un topico
    FlashcardView:        '/src/app/components/content/FlashcardView.tsx',        // Sesion de flashcards con FSRS v4 (backend)
    QuizView:             '/src/app/components/content/QuizView.tsx',             // Quiz: multiple choice + write-in + fill-blank
    ThreeDView:           '/src/app/components/content/ThreeDView.tsx',           // Atlas 3D: modelos anatomicos
    ScheduleView:         '/src/app/components/content/ScheduleView.tsx',         // Cronograma de estudio
    ReviewSessionView:    '/src/app/components/content/ReviewSessionView.tsx',    // Sesion de revision espaciada
    StudyDashboardsView:  '/src/app/components/content/StudyDashboardsView.tsx',  // Dashboards de estudio
    KnowledgeHeatmapView: '/src/app/components/content/KnowledgeHeatmapView.tsx', // Heatmap de conocimiento
    MasteryDashboardView: '/src/app/components/content/MasteryDashboardView.tsx', // Dashboard de dominio
    StudentDataPanel:     '/src/app/components/content/StudentDataPanel.tsx',     // Panel de datos del estudiante
    StudyOrganizerWizard: '/src/app/components/content/StudyOrganizerWizard.tsx', // Wizard para organizar estudio
    ModelViewer3D:        '/src/app/components/content/ModelViewer3D.tsx',        // Viewer 3D (three.js/R3F) — sub-componente de ThreeDView
    LessonGridView:       '/src/app/components/content/LessonGridView.tsx',      // Grid de lecciones — sub-componente de StudyView
  },

  /** Componentes — AI */
  ai: {
    AxonAIAssistant:        '/src/app/components/ai/AxonAIAssistant.tsx',         // Chat panel flotante (Gemini)
    SmartFlashcardGenerator: '/src/app/components/ai/SmartFlashcardGenerator.tsx', // Generador de flashcards con IA
  },

  /** Componentes — UI primitivos (shadcn/radix) */
  ui: '/src/app/components/ui/',

  /** Design System */
  designSystem: {
    barrel:       '/src/app/design-system/index.ts',         // Barrel re-export (backward compatible)
    brand:        '/src/app/design-system/brand.ts',         // Identidad de marca, logo
    colors:       '/src/app/design-system/colors.ts',        // Paleta completa
    typography:   '/src/app/design-system/typography.ts',    // Familias, reglas, headingStyle
    shapes:       '/src/app/design-system/shapes.ts',        // Border radius
    shadows:      '/src/app/design-system/shadows.ts',       // Niveles de sombra
    components:   '/src/app/design-system/components.ts',    // Recetas Tailwind + helpers
    sectionColors:'/src/app/design-system/section-colors.ts',// Paletas de acento
    navigation:   '/src/app/design-system/navigation.ts',   // Vistas, sidebar items
    layout:       '/src/app/design-system/layout.ts',        // Dimensiones, spacing
    animation:    '/src/app/design-system/animation.ts',     // Presets Motion
    rules:        '/src/app/design-system/rules.ts',         // Reglas obligatorias/prohibidas
    architecture: '/src/app/design-system/architecture.ts',  // Este archivo
  },
} as const;

// ─────────────────────────────────────────────
// 2. STATE MANAGEMENT — Como fluye el estado
// ────────────────────────────────────────────

export const stateManagement = {
  /** AppContext — estado de navegacion y UI (React Context + useState) */
  appContext: {
    file: '/src/app/context/AppContext.tsx',
    provider: 'AppProvider',
    hook: 'useApp()',
    state: {
      currentCourse:        'Course — el curso seleccionado en el CourseSwitcher',
      currentTopic:         'Topic | null — topico activo en el study view',
      isSidebarOpen:        'boolean — sidebar expandido o colapsado',
      isStudySessionActive: 'boolean — true cuando hay sesion de estudio activa',
      studyPlans:           'StudyPlan[] — planes de estudio creados por el usuario',
      quizAutoStart:        'boolean — iniciar quiz automaticamente al entrar',
      flashcardAutoStart:   'boolean — iniciar flashcards automaticamente al entrar',
      theme:                "'dark' | 'light' — tema visual (actualmente solo light)",
    },
    actions: [
      'setCurrentCourse(course) — cambia el curso activo (trigger: CourseSwitcher)',
      'setCurrentTopic(topic)   — cambia el topico activo (trigger: TopicSidebar click)',
      'setSidebarOpen(bool)     — abre/cierra sidebar',
      'addStudyPlan(plan)       — agrega un plan de estudio al array',
      'toggleTaskComplete(planId, taskId) — marca tarea como completada',
    ],
    note: 'Navegacion se maneja con useStudentNav() hook, NO con AppContext. ViewType se re-exporta desde useStudentNav.ts por backward-compat.',
  },

  /** StudentDataContext — datos del estudiante desde Supabase */
  studentDataContext: {
    file: '/src/app/context/StudentDataContext.tsx',
    provider: 'StudentDataProvider',
    hook: 'useStudentDataContext()',
    state: {
      profile:        'StudentProfile | null',
      stats:          'StudentStats | null',
      courseProgress:  'CourseProgress[]',
      dailyActivity:  'DailyActivity[]',
      sessions:       'StudySession[]',
      reviews:        'FlashcardReview[]',
      loading:        'boolean',
      error:          'string | null',
      isConnected:    'boolean — true si hay perfil cargado de Supabase',
    },
    actions: [
      'refresh()             — recarga todos los datos del backend',
      'seedAndLoad()         — siembra datos demo y recarga',
      'updateProfile(data)   — actualiza perfil parcialmente',
      'updateStats(data)     — actualiza estadisticas',
      'logSession(data)      — registra una sesion de estudio',
      'saveReviews(reviews)  — guarda revisiones de flashcards',
    ],
    autoSeed: 'Si no hay datos en el DB al cargar, auto-siembra datos demo',
  },

  /** Patron de Provider wrapping — React Router Data Mode */
  providerTree: "\n    App.tsx\n      \u2514\u2500 AuthProvider\n          \u2514\u2500 RouterProvider (createBrowserRouter)\n              \u2514\u2500 RequireAuth                    \u2190 auth guard\n                  \u251c\u2500 StudentLayout              \u2190 /student/*\n                  \u2502   \u2514\u2500 AppProvider\n                  \u2502       \u2514\u2500 StudentDataProvider\n                  \u2502           \u2514\u2500 StudentShell (sidebar + header + <Outlet />)\n                  \u251c\u2500 OwnerLayout                \u2190 /owner/*\n                  \u2502   \u2514\u2500 PlatformDataProvider\n                  \u2502       \u2514\u2500 RoleShell (sidebar + header + <Outlet />)\n                  \u251c\u2500 AdminLayout                \u2190 /admin/*\n                  \u2502   \u2514\u2500 PlatformDataProvider\n                  \u2502       \u2514\u2500 RoleShell\n                  \u2514\u2500 ProfessorLayout            \u2190 /professor/*\n                      \u2514\u2500 PlatformDataProvider\n                          \u2514\u2500 RoleShell\n  ",
} as const;

// ─────────────────────────────────────────────
// 3. NAVIGATION — Como funciona la navegacion
// ─────────────────────────────────────────────

export const navigationFlow = {
  /** Navegacion usa React Router (Data Mode) + useStudentNav hook */
  method: 'React Router (createBrowserRouter) + useStudentNav() hook (NO AppContext bridge)',

  routeFiles: {
    assembler:  '/src/app/routes.tsx',                  // Thin assembler — imports sub-files
    student:    '/src/app/routes/student-routes.ts',    // /student/* children
    owner:      '/src/app/routes/owner-routes.ts',      // /owner/* children
    admin:      '/src/app/routes/admin-routes.ts',      // /admin/* children
    professor:  '/src/app/routes/professor-routes.ts',  // /professor/* children
  },

  /** Todas las vistas de estudiante disponibles (ViewType definido en hooks/useStudentNav.ts) */
  viewTypes: [
    'home',               // WelcomeView — pagina principal (index route)
    'dashboard',          // DashboardView — KPIs y graficos
    'study-hub',          // StudyHubView — navegacion por curso
    'study',              // StudyView — vista de estudio de un topico
    'flashcards',         // FlashcardView — sesion de flashcards
    'quiz',               // QuizView — quiz interactivo
    '3d',                 // ThreeDView — atlas 3D
    'schedule',           // ScheduleView — cronograma
    'organize-study',     // StudyOrganizerWizard — wizard
    'review-session',     // ReviewSessionView — revision espaciada
    'study-dashboards',   // StudyDashboardsView
    'knowledge-heatmap',  // KnowledgeHeatmapView
    'mastery-dashboard',  // MasteryDashboardView
    'student-data',       // StudentDataPanel
  ],

  /** Layout rendering: StudentLayout > StudentShell > <Outlet /> renderiza la ruta activa */
  renderFlow: 'React Router <Outlet /> renderiza el componente que matchea la ruta actual',

  addingNewView: 'Solo editar routes/student-routes.ts + (opcional) useStudentNav ViewType + Sidebar NavLink item',

  /** TopicSidebar se muestra solo en study-hub y study (cuando no hay sesion activa) */
  topicSidebarCondition: "isView('study-hub', 'study') && !isStudySessionActive — via useStudentNav().isView()",

  /** Cada vista se anima con Motion al entrar */
  pageAnimation: '{ opacity: 0, y: 10 } -> { opacity: 1, y: 0 } en 0.2s',
} as const;

// ─────────────────────────────────────────────
// 4. DATA MODELS — Tipos principales
// ─────────────────────────────────────────────

export const dataModels = {
  /** Modelo del curso (estatico, en courses.ts) */
  courseHierarchy: "\n    Course\n    \u251c\u2500\u2500 id, name, color (bg-*), accentColor (text-*)\n    \u2514\u2500\u2500 semesters: Semester[]\n        \u251c\u2500\u2500 id, title\n        \u2514\u2500\u2500 sections: Section[]\n            \u251c\u2500\u2500 id, title, imageUrl?\n            \u2514\u2500\u2500 topics: Topic[]\n                \u251c\u2500\u2500 id, title, summary, videoUrl?\n                \u251c\u2500\u2500 flashcards?: Flashcard[] \u2014 { id, question, answer, mastery (1-5), image? }\n                \u251c\u2500\u2500 quizzes?: QuizQuestion[] \u2014 { id, type, question, options?, correctAnswer?, etc. }\n                \u251c\u2500\u2500 model3D?: Model3D \u2014 { id, name, description, available }\n                \u2514\u2500\u2500 lessons?: Lesson[] \u2014 { id, title, duration, completed, hasVideo, hasSummary }\n  ",

  /** Quiz question types */
  quizTypes: [
    "multiple-choice — options[] + correctAnswer (index)",
    "write-in       — correctText + acceptedVariations[]",
    "fill-blank     — blankSentence (con ___) + blankAnswer",
  ],

  /** Flashcard rating scale (5 buttons: Again/Hard/Good/Easy/Perfect) */
  ratingScale: {
    "1": 'Again   — repetir imediatamente (rose-500)',
    "2": 'Hard    — repetir em breve (orange-500)',
    "3": 'Good    — intervalo curto (yellow-400)',
    "4": 'Easy    — intervalo medio (lime-500)',
    "5": 'Perfect — intervalo largo (emerald-500)',
  },

  /** Student data types (en /src/app/types/student.ts) */
  studentTypes: [
    'StudentProfile     — perfil: nome, email, avatar, universidade, semestre, preferencias',
    'StudentStats       — agregados: minutos, sessoes, cards revisados, streak, media diaria',
    'CourseProgress      — por curso: mastery%, lecciones, flashcards, quiz score, topic progress',
    'TopicProgress       — por topico: mastery%, flashcards pendientes, keywords',
    'FlashcardReview     — log individual: rating 1-5, tempo, response_time_ms',
    'StudySession        — sesion: tipo, duracion, cards revisados, quiz score',
    'DailyActivity       — por dia: minutos, sessoes, cards, retencao',
    'StudySummary        — resumo: contenido markdown, anotaciones, keywords, tags',
    'KeywordState        — keyword mastery: mastery (0-1), stability_days, due_at, color (5-scale)',
  ],

  /** Keyword state — mastery computed server-side */
  keywordState: {
    fields: 'keyword, mastery (0-1), stability_days, due_at, lapses, exposures, card_coverage, color (5-color scale)',
    algorithm: 'PATH B: Backend computes FSRS v4 Petrick + BKT v4 Recovery + NeedScore v4.2. Frontend only sends {item_id, grade, subtopic_id, response_time_ms}.',
  },
} as const;

// ─────────────────────────────────────────────
// 5. BACKEND / API — Supabase Edge Functions
// ─────────────────────────────────────────────

export const apiEndpoints = {
  /** All calls go through apiCall() in lib/api.ts */
  serviceFile: '/src/app/lib/api.ts',

  /** Base URL */
  baseUrl: 'https://xdnciktarvxyhkrokbng.supabase.co/functions/v1/server',

  /** Auth: double-token convention */
  auth: {
    authorization: 'Authorization: Bearer <ANON_KEY> — ALWAYS (fixed, Supabase gateway)',
    accessToken:   'X-Access-Token: <user_jwt> — when user is authenticated',
    note:          'NEVER put user JWT in Authorization. It ALWAYS goes in X-Access-Token.',
  },

  /** Real backend routes (flat, JWT-scoped) */
  endpoints: {
    'POST   /signup':             'Register new user',
    'GET    /me':                 'Get profile (from JWT)',
    'PUT    /me':                 'Update profile',
    'GET    /study-sessions':     'List sessions (JWT-scoped)',
    'POST   /study-sessions':     'Create session',
    'PUT    /study-sessions/:id': 'Close session (completed_at, total_reviews, correct_reviews)',
    'POST   /review-batch':       'Submit batch of reviews (PATH B)',
    'GET    /fsrs-states':        'Read FSRS states',
    'GET    /bkt-states':         'Read BKT states',
    'GET    /study-queue':        'Get study queue (due cards)',
    'GET    /topic-progress':     'Topic-level progress',
    'GET    /student-stats':      'Aggregated student stats',
    'POST   /student-stats':      'Upsert student stats',
    'GET    /daily-activities':   'Daily activity log',
    'POST   /daily-activities':   'Upsert daily activity',
    'CRUD   /courses, /semesters, /sections, /topics, /summaries, /keywords, /subtopics': 'Content tree CRUD',
    'GET    /content-tree':       'Full content tree',
    'PUT    /reorder':            'Reorder content items',
    'CRUD   /flashcards':         'Flashcard CRUD',
    'CRUD   /quiz-questions':     'Quiz question CRUD',
    'CRUD   /quizzes':            'Quiz CRUD',
    'CRUD   /quiz-attempts':      'Quiz attempt CRUD',
  },

  /** AI Service endpoints (via aiService.ts) — CORRECTED v4.4.5 */
  aiEndpoints: {
    'POST   /ai/generate':          'Generate flashcard or quiz_question (action + summary_id required)',
    'POST   /ai/generate-smart':    'Smart generation with gap analysis (Fase 8A)',
    'POST   /ai/rag-chat':          'RAG-enhanced chat (message + optional summary_id, history, strategy)',
    'POST   /ai/report':            'Content quality reports',
    'POST   /ai/pre-generate':      'Pre-generation queue',
    'POST   /ai/ingest-embeddings': 'Embedding ingestion',
    'POST   /ai/re-chunk':          'Re-chunking',
    'POST   /ai/ingest-pdf':        'PDF upload + extraction',
    'GET    /ai/list-models':       'Available AI models',
    'PATCH  /ai/rag-feedback':      'Feedback on RAG responses',
    'GET    /ai/rag-analytics':     'RAG analytics dashboard',
    'GET    /ai/embedding-coverage': 'Embedding coverage stats',
  },
} as const;

// ─────────────────────────────────────────────
// 6. THIRD-PARTY DEPENDENCIES
// ─────────────────────────────────────────────

export const dependencies = {
  /** Framework */
  react: '18.3.1',

  /** Styling */
  tailwindcss: '4.x (v4, JIT, no tailwind.config.js)',
  clsx: 'Composicion condicional de clases',
  tailwindMerge: 'Merge de clases Tailwind sin conflictos',

  /** Animation */
  motion: "12.x — import { motion } from 'motion/react' (NO framer-motion)",

  /** Icons */
  lucideReact: "0.487 — icono por icono: import { Home } from 'lucide-react'",

  /** Charts */
  recharts: '2.15 — BarChart, PieChart, AreaChart, ResponsiveContainer',

  /** 3D */
  three: '0.182 — raw Three.js (no @react-three/fiber or drei; ModelViewer3D uses vanilla three + OrbitControls)',

  /** Dates */
  dateFns: "3.6 — format, subDays, etc. Locale: ptBR from 'date-fns/locale'",

  /** UI Primitives */
  radixUi: 'Accordion, Dialog, Dropdown, Popover, Select, Tabs, Tooltip, etc.',
  shadcnUi: 'Componentes en /src/app/components/ui/ basados en Radix',

  /** Backend */
  supabase: 'Edge Functions — no hay client SDK directo, todo via fetch + Bearer token',

  /** Drag & Drop */
  reactDnd: '16.x + react-dnd-html5-backend',

  /** Forms */
  reactHookForm: '7.55',
} as const;

// ─────────────────────────────────────────────
// 7. CODE CONVENTIONS
// ─────────────────────────────────────────────

export const conventions = {
  /** Naming */
  naming: {
    components:    'PascalCase — WelcomeView.tsx, AxonLogo.tsx',
    hooks:         'camelCase con "use" prefix — useStudentData.ts',
    services:      'camelCase — studentApi.ts, aiService.ts',
    types:         'PascalCase interfaces — StudentProfile, CourseProgress',
    dataFiles:     'camelCase — courses.ts, keywords.ts',
    cssFiles:      'kebab-case — fonts.css, theme.css',
    viewSuffix:    'Siempre termina en "View" — DashboardView, FlashcardView',
    contextSuffix: 'Siempre termina en "Context" — AppContext, StudentDataContext',
  },

  /** Imports */
  imports: {
    pathAlias:    "@/ -> src/ (configurado en tsconfig, vite)",
    react:        "import React, { useState, useEffect } from 'react'",
    motion:       "import { motion, AnimatePresence } from 'motion/react'",
    lucide:       "import { Home, BookOpen, Layers } from 'lucide-react'",
    designSystem: "import { colors, components, headingStyle } from '@/app/design-system'",
    designSystemModular: "import { colors } from '@axon/design-system/colors' — para proyectos externos que instalan el paquete",
    context:      "import { useApp } from '@/app/context/AppContext'",
  },

  /** Component patterns */
  componentPatterns: {
    pageStructure: "function MyView() { return (<div className='h-full overflow-y-auto bg-surface-dashboard'><AxonPageHeader title='...' subtitle='...' /><div className='px-6 py-6 space-y-6'>{/* content */}</div></div>); }",
    headingStyle: "style={headingStyle} — nunca hardcodear fontFamily: 'Georgia, serif' directamente",
    surfaceDashboard: "bg-surface-dashboard — registrado en theme.css como --color-surface-dashboard: #f5f2ea",
    iconPattern:  "bg-teal-50 + text-teal-500 en un div rounded-xl de w-10 h-10",
    cardPattern:  "bg-white rounded-2xl border border-gray-200 p-5 shadow-sm",
    buttonPattern: "bg-teal-600 hover:bg-teal-700 text-white rounded-xl (action) o rounded-full (pill)",
  },

  /** Migration status — 26/27 componentes migrados al design system (solo ModelViewer3D no aplica: es codigo Three.js puro) */
  migrationStatus: 'COMPLETE — todos los componentes importan de @/app/design-system',

  /** Deep token usage — componentes que usan helpers del design system */
  deepTokenUsage: {
    iconClasses: ['ThreeDView', 'FlashcardView'],
    ctaButtonClasses: ['ThreeDView', 'FlashcardView'],
    kpiCardClasses: ['ReviewSessionView'],
    iconBadgeClasses: ['ReviewSessionView', 'QuizView', 'StudyHubView'],
    cardClasses: ['ThreeDView', 'StudyOrganizerWizard'],
    headingStyle: 'ALL views — 0 instancias de fontFamily hardcodeado',
    surfaceDashboard: '8 archivos, 20 instancias migradas de bg-[#f5f2ea] -> bg-surface-dashboard',
    sectionColors: ['FlashcardView (sectionColors.multi)', 'ThreeDView (sectionColors.teal)'],
    colorsTokens: ['ThreeDView (colors.primary, colors.border)'],
    componentTokens: ['ReviewSessionView (components.kpiCard.trend, components.progressBar)'],
  },

  /** Language */
  uiLanguage: 'Portugues Brasileiro (pt-BR) para todo el texto de UI',
  codeLanguage: 'Ingles para nombres de variables, funciones y componentes',
  commentsLanguage: 'Ingles o Espanol para comentarios internos',
} as const;

// ─────────────────────────────────────────────
// 8. SPACED REPETITION SYSTEM (PATH B — Server-Side)
// ─────────────────────────────────────────────

export const spacedRepetitionSystem = {
  algorithm: 'PATH B: FSRS v4 Petrick + BKT v4 Recovery (computed server-side)',
  note: 'Frontend does NOT compute FSRS/BKT/SM-2. All PATH A files (spacedRepetition.ts, tracking.ts, fsrs-engine.ts, bkt-engine.ts, fsrs-helpers.ts, keywordManager.ts) were DELETED.',

  /** Frontend sends per review */
  frontendPayload: {
    item_id: 'string — flashcard or quiz ID',
    grade: 'number 1-5 (Again/Hard/Good/Easy/Perfect)',
    subtopic_id: 'string — for BKT tracking',
    response_time_ms: 'number — time to answer',
  },

  /** Backend computes and stores */
  backendComputes: [
    'FSRS v4: stability, difficulty, due date, state transitions',
    'BKT v4 Recovery: p_know, p_slip, p_guess, p_transit per subtopic',
    'NeedScore v4.2: priority ranking for study queue',
    'Leech detection: flags cards with excessive lapses',
    '5-color mastery scale: red/orange/yellow/lime/green',
  ],

  /** Review flow */
  reviewFlow: {
    step1: 'Frontend: user rates card (1-5 buttons)',
    step2: 'Frontend: queueReview() stores in local batch (0 POSTs)',
    step3: 'Frontend: at end of session, submitBatch() -> POST /review-batch',
    step4: 'Backend: processes batch, updates fsrs_states + bkt_states + reviews tables',
    step5: 'Frontend: reads updated states via GET /fsrs-states, GET /bkt-states',
  },

  /** Quality ratings (1-5) */
  ratings: {
    "1": { label: 'Again',    action: 'Repetir imediatamente',  color: 'rose-500' },
    "2": { label: 'Hard',     action: 'Repetir em breve',       color: 'orange-500' },
    "3": { label: 'Good',     action: 'Intervalo curto',        color: 'yellow-400' },
    "4": { label: 'Easy',     action: 'Intervalo medio',        color: 'lime-500' },
    "5": { label: 'Perfect',  action: 'Intervalo largo',        color: 'emerald-500' },
  },
} as const;

// ─────────────────────────────────────────────
// 9. AI INTEGRATION
// ─────────────────────────────────────────────

export const aiIntegration = {
  provider: 'Google Gemini (via Supabase Edge Functions)',
  serviceFile: '/src/app/services/aiService.ts',

  capabilities: [
    'RAG Chat — POST /ai/rag-chat — responde preguntas medicas con retrieval-augmented generation',
    'Generate flashcard — POST /ai/generate (action: flashcard, summary_id required)',
    'Generate quiz — POST /ai/generate (action: quiz_question, summary_id required)',
    'Smart generate — POST /ai/generate-smart — server-side gap analysis',
    'Pre-generate — POST /ai/pre-generate — bulk pre-generation queue',
  ],

  uiComponent: '/src/app/components/ai/AxonAIAssistant.tsx',

  /** Smart Flashcard Generator */
  smartGenerator: {
    file: '/src/app/components/ai/SmartFlashcardGenerator.tsx',
    description: 'Genera flashcards inteligentes basadas en keywords con bajo mastery',
  },

  /** Rate limiting */
  rateLimitHandling: 'User-friendly error message en portugues cuando Gemini devuelve 429',
} as const;
