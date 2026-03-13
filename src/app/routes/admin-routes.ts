// ============================================================
// Axon — Admin Routes (children of AdminLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
// ============================================================
import type { RouteObject } from 'react-router';

const lazyPlaceholder = (title: string, desc: string, iconName: string) => ({
  lazy: async () => {
    const [{ PlaceholderPage }, lucideIcons] = await Promise.all([
      import('@/app/components/roles/PlaceholderPage'),
      import('lucide-react'),
    ]);
    const React = await import('react');
    const Icon = (lucideIcons as any)[iconName];
    const Component = () => PlaceholderPage({
      title,
      description: desc,
      icon: Icon ? React.createElement(Icon, { size: 20 }) : null,
    });
    return { Component };
  },
});

export const adminChildren: RouteObject[] = [
  { index: true,      ...lazyPlaceholder('Dashboard',  'Panel principal del administrador', 'LayoutDashboard') },
  { path: 'members',  ...lazyPlaceholder('Miembros',   'Gestion de miembros de la institucion', 'Users') },
  { path: 'content',  ...lazyPlaceholder('Contenido',  'Gestion del contenido academico', 'FileText') },
  { path: 'scopes',   ...lazyPlaceholder('Scopes',     'Administracion de permisos', 'Shield') },
  { path: 'reports',  ...lazyPlaceholder('Reportes',   'Estadisticas e informes', 'BarChart3') },
  { path: 'settings', ...lazyPlaceholder('Ajustes',    'Configuracion de la institucion', 'Settings') },
];