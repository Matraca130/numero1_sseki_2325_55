// ============================================================
// Axon — Admin Routes (children of AdminLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
// PERF: Named lucide imports for tree-shaking (no dynamic import).
// ============================================================
import type { RouteObject } from 'react-router';
import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart3,
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

export const adminChildren: RouteObject[] = [
  { index: true,      ...lazyPlaceholder('Dashboard',  'Panel principal del administrador', LayoutDashboard) },
  { path: 'members',  ...lazyPlaceholder('Miembros',   'Gestion de miembros de la institucion', Users) },
  { path: 'content',  ...lazyPlaceholder('Contenido',  'Gestion del contenido academico', FileText) },
  { path: 'scopes',   ...lazyPlaceholder('Scopes',     'Administracion de permisos', Shield) },
  { path: 'reports',  ...lazyPlaceholder('Reportes',   'Estadisticas e informes', BarChart3) },
  { path: 'settings', ...lazyPlaceholder('Ajustes',    'Configuracion de la institucion', Settings) },
];
