// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
//
// BUG-030: All routes wired to real page components (no more placeholders).
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const professorChildren: RouteObject[] = [
  {
    index: true,
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorDashboardPage')).then(m => ({ Component: m.ProfessorDashboardPage })),
  },
  {
    path: 'courses',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorCoursesPage')).then(m => ({ Component: m.ProfessorCoursesPage })),
  },
  {
    path: 'curriculum',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorCurriculumPage')).then(m => ({ Component: m.ProfessorCurriculumPage })),
  },
  {
    path: 'flashcards',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorFlashcardsPage')).then(m => ({ Component: m.ProfessorFlashcardsPage })),
  },
  {
    path: 'quizzes',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorQuizzesPage')).then(m => ({ Component: m.ProfessorQuizzesPage })),
  },
  {
    path: 'students',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorStudentsPage')).then(m => ({ Component: m.ProfessorStudentsPage })),
  },
  {
    path: 'ai',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorAIPage')).then(m => ({ Component: m.ProfessorAIPage })),
  },
  {
    path: 'settings',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorSettingsPage')).then(m => ({ Component: m.ProfessorSettingsPage })),
  },
];
