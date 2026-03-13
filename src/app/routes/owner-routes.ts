// ============================================================
// Axon — Owner Routes (children of OwnerLayout)
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

export const ownerChildren: RouteObject[] = [
  { index: true,           ...lazyPlaceholder('Dashboard',       'Panel del propietario', 'LayoutDashboard') },
  { path: 'institution',   ...lazyPlaceholder('Institucion',     'Datos de la institucion', 'Building2') },
  { path: 'members',       ...lazyPlaceholder('Miembros',        'Gestion de miembros', 'Users') },
  { path: 'plans',         ...lazyPlaceholder('Planes',          'Planes de suscripcion', 'CreditCard') },
  { path: 'subscriptions', ...lazyPlaceholder('Suscripciones',   'Estado de suscripcion', 'Receipt') },
  { path: 'access-rules',  ...lazyPlaceholder('Reglas de Acceso','Configurar acceso por plan', 'ShieldCheck') },
  { path: 'reports',       ...lazyPlaceholder('Reportes',        'Estadisticas de la institucion', 'BarChart3') },
  { path: 'settings',      ...lazyPlaceholder('Ajustes',         'Configuracion general', 'Settings') },
];