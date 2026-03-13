// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
//
// CODE SPLIT (BUG-014): Real components use React Router `lazy`.
// PN-11: Placeholders now lazy-loaded too (removes 5 lucide icon
// imports from main bundle: LayoutDashboard, BookOpen, Users, Bot,
// Settings). Placeholders extracted to professor-placeholders.tsx.
// ============================================================
import type { RouteObject } from 'react-router';

export const professorChildren: RouteObject[] = [
  {
    index: true,
    lazy: () => import('@/app/routes/professor-placeholders').then(m => ({ Component: m.ProfessorDashboardPlaceholder })),
  },
  {
    path: 'courses',
    lazy: () => import('@/app/routes/professor-placeholders').then(m => ({ Component: m.ProfessorCoursesPlaceholder })),
  },
  {
    path: 'curriculum',
    lazy: () => import('@/app/components/roles/pages/professor/ProfessorCurriculumPage').then(m => ({ Component: m.ProfessorCurriculumPage })),
  },
  {
    path: 'flashcards',
    lazy: () => import('@/app/components/roles/pages/professor/ProfessorFlashcardsPage').then(m => ({ Component: m.ProfessorFlashcardsPage })),
  },
  {
    path: 'quizzes',
    lazy: () => import('@/app/components/roles/pages/professor/ProfessorQuizzesPage').then(m => ({ Component: m.ProfessorQuizzesPage })),
  },
  {
    path: 'students',
    lazy: () => import('@/app/routes/professor-placeholders').then(m => ({ Component: m.ProfessorStudentsPlaceholder })),
  },
  {
    path: 'ai',
    lazy: () => import('@/app/routes/professor-placeholders').then(m => ({ Component: m.ProfessorAIPlaceholder })),
  },
  {
    path: 'settings',
    lazy: () => import('@/app/routes/professor-placeholders').then(m => ({ Component: m.ProfessorSettingsPlaceholder })),
  },
  {
    path: 'summary/:topicId',
    lazy: () => import('@/app/components/content/SummaryView').then(m => ({ Component: m.SummaryView })),
  },
  // ── G7: Professor Gamification View (lazy-loaded) ──
  {
    path: 'gamification',
    lazy: () => import('@/app/components/professor/ProfessorGamificationPage').then(m => ({ Component: m.ProfessorGamificationPage })),
  },
];
