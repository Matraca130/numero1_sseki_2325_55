// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
// PERF: Named lucide imports for tree-shaking (no dynamic import).
//
// FIX: Quizzes, Curriculum, Flashcards routes restored from
// placeholder to real page components. The original PERF-70
// refactor accidentally replaced ALL routes with lazyPlaceholder.
// ============================================================
import type { RouteObject } from 'react-router';
import React from 'react';
import { lazyRetry } from '@/app/utils/lazyRetry';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Sparkles,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const lazyPlaceholder = (title: string, desc: string, Icon: LucideIcon) => ({
  lazy: async () => {
    const { PlaceholderPage } = await import('@/app/components/roles/PlaceholderPage');
    const Component = () => PlaceholderPage({
      title,
      description: desc,
      icon: React.createElement(Icon, { size: 20 }),
    });
    return { Component };
  },
});

export const professorChildren: RouteObject[] = [
  { index: true,        ...lazyPlaceholder('Dashboard',   'Panel del profesor', LayoutDashboard) },
  { path: 'courses',    ...lazyPlaceholder('Cursos',      'Gestion de cursos', BookOpen) },
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
  { path: 'students',   ...lazyPlaceholder('Estudiantes', 'Seguimiento de alumnos', Users) },
  { path: 'ai',         ...lazyPlaceholder('IA',          'Herramientas de IA', Sparkles) },
  { path: 'settings',   ...lazyPlaceholder('Ajustes',     'Configuracion del profesor', Settings) },
];
