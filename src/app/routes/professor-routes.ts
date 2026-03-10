// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
//
// CODE SPLIT (BUG-014): Real components use React Router `lazy`.
// Placeholders are inline (tiny, no benefit from splitting).
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';

import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import { LayoutDashboard, BookOpen, Users, Bot, Settings, Brain, ClipboardList } from 'lucide-react';
import { withBoundary } from '@/app/lib/withBoundary';

// Placeholder wrappers (inline — tiny, no need to lazy-load)
function ProfessorDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard del Profesor',
    description: 'Panel principal del profesor — pr\u00f3ximamente',
    icon: React.createElement(LayoutDashboard, { size: 24 }),
    accentColor: 'blue',
  });
}
function ProfessorCoursesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Mis Cursos',
    description: 'Gesti\u00f3n de cursos asignados — pr\u00f3ximamente',
    icon: React.createElement(BookOpen, { size: 24 }),
    accentColor: 'teal',
  });
}
function ProfessorStudentsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Estudiantes',
    description: 'Gesti\u00f3n de estudiantes — pr\u00f3ximamente',
    icon: React.createElement(Users, { size: 24 }),
    accentColor: 'blue',
  });
}
function ProfessorFlashcardsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Flashcards',
    description: 'Gesti\u00f3n de flashcards — pr\u00f3ximamente',
    icon: React.createElement(Brain, { size: 24 }),
    accentColor: 'purple',
  });
}
function ProfessorQuizzesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Quizzes',
    description: 'Gesti\u00f3n de quizzes — pr\u00f3ximamente',
    icon: React.createElement(ClipboardList, { size: 24 }),
    accentColor: 'amber',
  });
}
function ProfessorAIPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'IA',
    description: 'Herramientas de IA — pr\u00f3ximamente',
    icon: React.createElement(Bot, { size: 24 }),
    accentColor: 'purple',
  });
}
function ProfessorSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Configuraci\u00f3n',
    description: 'Configuraci\u00f3n del profesor — pr\u00f3ximamente',
    icon: React.createElement(Settings, { size: 24 }),
    accentColor: 'teal',
  });
}

export const professorChildren: RouteObject[] = [
  { index: true,        Component: ProfessorDashboardPlaceholder },
  { path: 'courses',    Component: ProfessorCoursesPlaceholder },
  {
    path: 'curriculum',
    lazy: () => import('@/app/components/roles/pages/professor/ProfessorCurriculumPage').then(m => ({ Component: withBoundary(m.ProfessorCurriculumPage, 'Error al cargar curriculum') })),
  },
  {
    path: 'flashcards',
    Component: ProfessorFlashcardsPlaceholder,
  },
  {
    path: 'quizzes',
    Component: ProfessorQuizzesPlaceholder,
  },
  { path: 'students',   Component: ProfessorStudentsPlaceholder },
  { path: 'ai',         Component: ProfessorAIPlaceholder },
  { path: 'settings',   Component: ProfessorSettingsPlaceholder },
  {
    path: 'summary/:topicId',
    lazy: () => import('@/app/components/content/SummaryView').then(m => ({ Component: withBoundary(m.SummaryView, 'Error al cargar resumen') })),
  },
];