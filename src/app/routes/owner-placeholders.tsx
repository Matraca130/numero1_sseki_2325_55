// ============================================================
// Axon — Owner Placeholder Pages (lazy-loaded)
//
// PERF-R14: Extracted from owner-routes.ts to avoid dynamically
// importing the entire lucide-react library (748kB).
// Icons are tree-shakeable named imports instead.
// ============================================================

import React from 'react';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
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

export function OwnerDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard',
    description: 'Panel del propietario',
    icon: React.createElement(LayoutDashboard, { size: 20 }),
  });
}

export function OwnerInstitutionPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Institucion',
    description: 'Datos de la institucion',
    icon: React.createElement(Building2, { size: 20 }),
  });
}

export function OwnerMembersPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Miembros',
    description: 'Gestion de miembros',
    icon: React.createElement(Users, { size: 20 }),
  });
}

export function OwnerPlansPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Planes',
    description: 'Planes de suscripcion',
    icon: React.createElement(CreditCard, { size: 20 }),
  });
}

export function OwnerSubscriptionsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Suscripciones',
    description: 'Estado de suscripcion',
    icon: React.createElement(Receipt, { size: 20 }),
  });
}

export function OwnerAccessRulesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Reglas de Acceso',
    description: 'Configurar acceso por plan',
    icon: React.createElement(ShieldCheck, { size: 20 }),
  });
}

export function OwnerReportsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Reportes',
    description: 'Estadisticas de la institucion',
    icon: React.createElement(BarChart3, { size: 20 }),
  });
}

export function OwnerSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Ajustes',
    description: 'Configuracion general',
    icon: React.createElement(Settings, { size: 20 }),
  });
}
