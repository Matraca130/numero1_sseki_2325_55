// ============================================================
// Axon — Professor Placeholder Pages (lazy-loaded)
//
// PN-11: Extracted from professor-routes.ts to avoid eagerly
// importing 5 lucide icons (LayoutDashboard, BookOpen, Users,
// Bot, Settings) into the main professor route bundle.
// ============================================================

import React from 'react';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import { LayoutDashboard, BookOpen, Users, Bot, Settings } from 'lucide-react';

export function ProfessorDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard del Profesor',
    description: 'Panel principal del profesor \u2014 pr\u00F3ximamente',
    icon: React.createElement(LayoutDashboard, { size: 24 }),
    accentColor: 'blue',
  });
}

export function ProfessorCoursesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Mis Cursos',
    description: 'Gesti\u00F3n de cursos asignados \u2014 pr\u00F3ximamente',
    icon: React.createElement(BookOpen, { size: 24 }),
    accentColor: 'teal',
  });
}

export function ProfessorStudentsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Estudiantes',
    description: 'Gesti\u00F3n de estudiantes \u2014 pr\u00F3ximamente',
    icon: React.createElement(Users, { size: 24 }),
    accentColor: 'blue',
  });
}

export function ProfessorAIPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'IA',
    description: 'Herramientas de IA \u2014 pr\u00F3ximamente',
    icon: React.createElement(Bot, { size: 24 }),
    accentColor: 'purple',
  });
}

export function ProfessorSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Configuraci\u00F3n',
    description: 'Configuraci\u00F3n del profesor \u2014 pr\u00F3ximamente',
    icon: React.createElement(Settings, { size: 24 }),
    accentColor: 'teal',
  });
}
