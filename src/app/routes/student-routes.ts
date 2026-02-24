// ============================================================
// Axon — Student Routes (children of StudentLayout)
//
// PODA v2: Core study routes implemented. Others → StudentPlaceholder.
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';

import { WelcomeView } from '@/app/components/content/WelcomeView';
import { DashboardView } from '@/app/components/content/DashboardView';
import { StudyHubView } from '@/app/components/content/StudyHubView';
import { StudyView } from '@/app/components/content/StudyView';
import { StudentSummariesView } from '@/app/components/content/StudentSummariesView';
import { StudentPlaceholder } from '@/app/components/content/StudentPlaceholder';
import { SummaryView } from '@/app/components/content/SummaryView';
import { QuizView } from '@/app/components/content/QuizView';
import { FlashcardView } from '@/app/components/content/FlashcardView';
import { Calendar, Layers, Box, GraduationCap, Database } from 'lucide-react';

// ── Placeholder wrappers ──────────────────────────────────
function SchedulePlaceholder() {
  return React.createElement(StudentPlaceholder, {
    title: 'Cronograma',
    description: 'Organiza tu calendario de estudio — proximamente',
    icon: React.createElement(Calendar, { size: 24 }),
    accentColor: 'teal',
  });
}
function FlashcardsPlaceholder() {
  return React.createElement(StudentPlaceholder, {
    title: 'Flashcards',
    description: 'Repaso espaciado con tarjetas inteligentes — proximamente',
    icon: React.createElement(Layers, { size: 24 }),
    accentColor: 'purple',
  });
}
function Atlas3DPlaceholder() {
  return React.createElement(StudentPlaceholder, {
    title: 'Atlas 3D',
    description: 'Modelos anatomicos interactivos — proximamente',
    icon: React.createElement(Box, { size: 24 }),
    accentColor: 'blue',
  });
}
function QuizPlaceholder() {
  return React.createElement(StudentPlaceholder, {
    title: 'Quiz',
    description: 'Evaluaciones y preguntas de practica — proximamente',
    icon: React.createElement(GraduationCap, { size: 24 }),
    accentColor: 'amber',
  });
}
function StudentDataPlaceholder() {
  return React.createElement(StudentPlaceholder, {
    title: 'Mis Datos',
    description: 'Tu perfil, estadisticas y progreso — proximamente',
    icon: React.createElement(Database, { size: 24 }),
    accentColor: 'teal',
  });
}

export const studentChildren: RouteObject[] = [
  { index: true,          Component: WelcomeView },
  { path: 'dashboard',    Component: DashboardView },
  { path: 'study-hub',    Component: StudyHubView },
  { path: 'study',        Component: StudyView },
  { path: 'summaries',    Component: StudentSummariesView },
  { path: 'schedule',     Component: SchedulePlaceholder },
  { path: 'flashcards',   Component: FlashcardView },
  { path: '3d',           Component: Atlas3DPlaceholder },
  { path: 'quiz',         Component: QuizView },
  { path: 'student-data', Component: StudentDataPlaceholder },
  { path: 'summary/:topicId', Component: SummaryView },
  // Catch-all → redirect to home
  { path: '*',            Component: WelcomeView },
];