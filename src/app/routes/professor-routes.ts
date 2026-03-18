// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
//
// FIX: Quizzes, Curriculum, Flashcards routes restored from
// placeholder to real page components.
// PERF-R14: Replaced dynamic import('lucide-react') (pulled
// entire 748kB icon library) with tree-shakeable named imports
// via professor-placeholders.tsx.
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const professorChildren: RouteObject[] = [
  { index: true,        lazy: () => import('./professor-placeholders').then(m => ({ Component: m.ProfessorDashboardPlaceholder })) },
  { path: 'courses',    lazy: () => import('./professor-placeholders').then(m => ({ Component: m.ProfessorCoursesPlaceholder })) },
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
    path: 'knowledge-map',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/professor/ProfessorKnowledgeMapPage')).then(m => ({ Component: m.ProfessorKnowledgeMapPage })),
  },
  { path: 'students',   lazy: () => import('./professor-placeholders').then(m => ({ Component: m.ProfessorStudentsPlaceholder })) },
  { path: 'ai',         lazy: () => import('./professor-placeholders').then(m => ({ Component: m.ProfessorAIPlaceholder })) },
  { path: 'settings',   lazy: () => import('./professor-placeholders').then(m => ({ Component: m.ProfessorSettingsPlaceholder })) },
];
