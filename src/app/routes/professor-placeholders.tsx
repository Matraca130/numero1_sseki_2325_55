/**
 * Professor placeholder pages — temporary until full pages are built.
 * Uses React.createElement to avoid JSX overhead in route config.
 */
import React from 'react';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import { LayoutDashboard, BookOpen, Users, Bot, Settings } from 'lucide-react';

export function ProfessorDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard del Profesor',
    description: 'Panel principal del profesor — próximamente',
    icon: React.createElement(LayoutDashboard, { size: 24 }),
    accentColor: 'blue',
  });
}

export function ProfessorCoursesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Mis Cursos',
    description: 'Gestión de cursos asignados — próximamente',
    icon: React.createElement(BookOpen, { size: 24 }),
    accentColor: 'teal',
  });
}

export function ProfessorStudentsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Estudiantes',
    description: 'Gestión de estudiantes — próximamente',
    icon: React.createElement(Users, { size: 24 }),
    accentColor: 'blue',
  });
}

export function ProfessorAIPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'IA',
    description: 'Herramientas de IA — próximamente',
    icon: React.createElement(Bot, { size: 24 }),
    accentColor: 'purple',
  });
}

export function ProfessorSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Configuración',
    description: 'Configuración del profesor — próximamente',
    icon: React.createElement(Settings, { size: 24 }),
    accentColor: 'teal',
  });
}
