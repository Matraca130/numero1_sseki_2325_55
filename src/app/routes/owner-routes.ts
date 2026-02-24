// ============================================================
// Axon — Owner Routes (children of OwnerLayout)
//
// PODA v2: ALL pages → PlaceholderPage
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';

import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import { LayoutDashboard, Building2, Users, CreditCard, Receipt, ShieldCheck, BarChart3, Settings } from 'lucide-react';

function OwnerDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard Owner',
    description: 'Panel principal del propietario — próximamente',
    icon: React.createElement(LayoutDashboard, { size: 24 }),
    accentColor: 'amber',
  });
}
function OwnerInstitutionPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Institución',
    description: 'Configuración de la institución — próximamente',
    icon: React.createElement(Building2, { size: 24 }),
    accentColor: 'blue',
  });
}
function OwnerMembersPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Miembros',
    description: 'Gestión de miembros — próximamente',
    icon: React.createElement(Users, { size: 24 }),
    accentColor: 'teal',
  });
}
function OwnerPlansPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Planes',
    description: 'Gestión de planes — próximamente',
    icon: React.createElement(CreditCard, { size: 24 }),
    accentColor: 'purple',
  });
}
function OwnerSubscriptionsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Suscripciones',
    description: 'Gestión de suscripciones — próximamente',
    icon: React.createElement(Receipt, { size: 24 }),
    accentColor: 'amber',
  });
}
function OwnerAccessRulesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Reglas de Acceso',
    description: 'Gestión de reglas de acceso — próximamente',
    icon: React.createElement(ShieldCheck, { size: 24 }),
    accentColor: 'blue',
  });
}
function OwnerReportsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Reportes',
    description: 'Reportes y analíticas — próximamente',
    icon: React.createElement(BarChart3, { size: 24 }),
    accentColor: 'teal',
  });
}
function OwnerSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Configuración',
    description: 'Configuración del propietario — próximamente',
    icon: React.createElement(Settings, { size: 24 }),
    accentColor: 'purple',
  });
}

export const ownerChildren: RouteObject[] = [
  { index: true,           Component: OwnerDashboardPlaceholder },
  { path: 'institution',   Component: OwnerInstitutionPlaceholder },
  { path: 'members',       Component: OwnerMembersPlaceholder },
  { path: 'plans',         Component: OwnerPlansPlaceholder },
  { path: 'subscriptions', Component: OwnerSubscriptionsPlaceholder },
  { path: 'access-rules',  Component: OwnerAccessRulesPlaceholder },
  { path: 'reports',       Component: OwnerReportsPlaceholder },
  { path: 'settings',      Component: OwnerSettingsPlaceholder },
];
