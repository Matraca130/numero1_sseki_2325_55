// ============================================================
// Axon — Admin Routes (children of AdminLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
// PERF-R14: Replaced dynamic import('lucide-react') (pulled
// entire 748kB icon library) with tree-shakeable named imports
// via admin-placeholders.tsx.
// ============================================================
import type { RouteObject } from 'react-router';

export const adminChildren: RouteObject[] = [
  { index: true,      lazy: () => import('./admin-placeholders').then(m => ({ Component: m.AdminDashboardPlaceholder })) },
  { path: 'members',  lazy: () => import('./admin-placeholders').then(m => ({ Component: m.AdminMembersPlaceholder })) },
  { path: 'content',  lazy: () => import('./admin-placeholders').then(m => ({ Component: m.AdminContentPlaceholder })) },
  { path: 'scopes',   lazy: () => import('./admin-placeholders').then(m => ({ Component: m.AdminScopesPlaceholder })) },
  { path: 'reports',  lazy: () => import('./admin-placeholders').then(m => ({ Component: m.AdminReportsPlaceholder })) },
  { path: 'settings', lazy: () => import('./admin-placeholders').then(m => ({ Component: m.AdminSettingsPlaceholder })) },
];
