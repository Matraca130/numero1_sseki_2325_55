// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
//
// CODE SPLIT (BUG-014): Real components use React Router `lazy`.
// Placeholders are inline (tiny, no benefit from splitting).
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';

import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import { LayoutDashboard, BookOpen, Users, Bot, Settings } from 'lucide-react';

// Placeholder wrappers (inline — tiny, no need to lazy-load)
function ProfessorDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard del Profesor',
    description: 'Panel principal del profesor — próximamente',
    icon: React.createElement(LayoutDashboard, { size: 24 }),
    accentColor: 'blue',
  });
}
function ProfessorCoursesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Mis Cursos',
    description: 'Gestión de cursos asignados — próximamente',
    icon: React.createElement(BookOpen, { size: 24 }),
    accentColor: 'teal',
  });
}
function ProfessorStudentsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Estudiantes',
    description: 'Gestión de estudiantes — próximamente',
    icon: React.createElement(Users, { size: 24 }),
    accentColor: 'blue',
  });
}
function ProfessorAIPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'IA',
    description: 'Herramientas de IA — próximamente',
    icon: React.createElement(Bot, { size: 24 }),
    accentColor: 'purple',
  });
}
function ProfessorSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Configuración',
    description: 'Configuración del profesor — próximamente',
    icon: React.createElement(Settings, { size: 24 }),
    accentColor: 'teal',
  });
}

export const professorChildren: RouteObject[] = [
  { index: true,        Component: ProfessorDashboardPlaceholder },
  { path: 'courses',    Component: ProfessorCoursesPlaceholder },
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
  { path: 'students',   Component: ProfessorStudentsPlaceholder },
  { path: 'ai',         Component: ProfessorAIPlaceholder },
  { path: 'settings',   Component: ProfessorSettingsPlaceholder },
  {
    path: 'summary/:topicId',
    lazy: () => import('@/app/components/content/SummaryView').then(m => ({ Component: m.SummaryView })),
  },
];
