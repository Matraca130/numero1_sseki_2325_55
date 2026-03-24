// ============================================================
// Axon — Admin Placeholder Pages (lazy-loaded)
//
// PERF-R14: Extracted from admin-routes.ts to avoid dynamically
// importing the entire lucide-react library (748kB).
// Icons are tree-shakeable named imports instead.
// ============================================================

import React from 'react';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart3,
  Settings,
} from 'lucide-react';

export function AdminDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard',
    description: 'Panel principal del administrador',
    icon: React.createElement(LayoutDashboard, { size: 20 }),
  });
}

export function AdminMembersPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Miembros',
    description: 'Gestion de miembros de la institucion',
    icon: React.createElement(Users, { size: 20 }),
  });
}

export function AdminContentPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Contenido',
    description: 'Gestion del contenido academico',
    icon: React.createElement(FileText, { size: 20 }),
  });
}

export function AdminScopesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Scopes',
    description: 'Administracion de permisos',
    icon: React.createElement(Shield, { size: 20 }),
  });
}

export function AdminReportsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Reportes',
    description: 'Estadisticas e informes',
    icon: React.createElement(BarChart3, { size: 20 }),
  });
}

export function AdminSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Ajustes',
    description: 'Configuracion de la institucion',
    icon: React.createElement(Settings, { size: 20 }),
  });
}
