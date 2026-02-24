// ============================================================
// Axon — Admin Routes (children of AdminLayout)
//
// PODA v2: ALL pages → PlaceholderPage
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';

import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';
import { LayoutDashboard, Users, BookOpen, Shield, BarChart3, Settings } from 'lucide-react';

function AdminDashboardPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Dashboard Admin',
    description: 'Panel principal del administrador — próximamente',
    icon: React.createElement(LayoutDashboard, { size: 24 }),
    accentColor: 'blue',
  });
}
function AdminMembersPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Miembros',
    description: 'Gestión de miembros — próximamente',
    icon: React.createElement(Users, { size: 24 }),
    accentColor: 'teal',
  });
}
function AdminContentPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Contenido',
    description: 'Gestión de contenido — próximamente',
    icon: React.createElement(BookOpen, { size: 24 }),
    accentColor: 'purple',
  });
}
function AdminScopesPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Scopes',
    description: 'Gestión de scopes — próximamente',
    icon: React.createElement(Shield, { size: 24 }),
    accentColor: 'amber',
  });
}
function AdminReportsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Reportes',
    description: 'Reportes y analíticas — próximamente',
    icon: React.createElement(BarChart3, { size: 24 }),
    accentColor: 'blue',
  });
}
function AdminSettingsPlaceholder() {
  return React.createElement(PlaceholderPage, {
    title: 'Configuración',
    description: 'Configuración de administración — próximamente',
    icon: React.createElement(Settings, { size: 24 }),
    accentColor: 'teal',
  });
}

export const adminChildren: RouteObject[] = [
  { index: true,      Component: AdminDashboardPlaceholder },
  { path: 'members',  Component: AdminMembersPlaceholder },
  { path: 'content',  Component: AdminContentPlaceholder },
  { path: 'scopes',   Component: AdminScopesPlaceholder },
  { path: 'reports',  Component: AdminReportsPlaceholder },
  { path: 'settings', Component: AdminSettingsPlaceholder },
];
