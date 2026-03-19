// ============================================================
// Axon — Owner Routes (children of OwnerLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
// PERF: Named lucide imports for tree-shaking (no dynamic import).
// ============================================================
import type { RouteObject } from 'react-router';
import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  ShieldCheck,
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

export const ownerChildren: RouteObject[] = [
  { index: true,           ...lazyPlaceholder('Dashboard',       'Panel del propietario', LayoutDashboard) },
  { path: 'institution',   ...lazyPlaceholder('Institucion',     'Datos de la institucion', Building2) },
  { path: 'members',       ...lazyPlaceholder('Miembros',        'Gestion de miembros', Users) },
  { path: 'plans',         ...lazyPlaceholder('Planes',          'Planes de suscripcion', CreditCard) },
  { path: 'subscriptions', ...lazyPlaceholder('Suscripciones',   'Estado de suscripcion', Receipt) },
  { path: 'access-rules',  ...lazyPlaceholder('Reglas de Acceso','Configurar acceso por plan', ShieldCheck) },
  { path: 'reports',       ...lazyPlaceholder('Reportes',        'Estadisticas de la institucion', BarChart3) },
  { path: 'settings',      ...lazyPlaceholder('Ajustes',         'Configuracion general', Settings) },
];
