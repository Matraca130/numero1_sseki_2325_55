// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
//
// Active: curriculum, flashcards, quizzes
// Placeholder: dashboard, courses, students, ai, settings
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';

import { ProfessorCurriculumPage } from '@/app/components/roles/pages/professor/ProfessorCurriculumPage';
import { ProfessorQuizzesPage } from '@/app/components/roles/pages/professor/ProfessorQuizzesPage';
import { ProfessorFlashcardsPage } from '@/app/components/roles/pages/professor/ProfessorFlashcardsPage';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import { SummaryView } from '@/app/components/content/SummaryView';
import { LayoutDashboard, BookOpen, Users, Bot, Settings } from 'lucide-react';

// Wrapper components for PlaceholderPage (React Router needs Component, not element)
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
  { path: 'curriculum', Component: ProfessorCurriculumPage },
  { path: 'flashcards', Component: ProfessorFlashcardsPage },
  { path: 'quizzes',    Component: ProfessorQuizzesPage },
  { path: 'students',   Component: ProfessorStudentsPlaceholder },
  { path: 'ai',         Component: ProfessorAIPlaceholder },
  { path: 'settings',   Component: ProfessorSettingsPlaceholder },
  { path: 'summary/:topicId', Component: SummaryView },
];