// ============================================================
// Axon — Owner Routes (children of OwnerLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
// PERF-R14: Replaced dynamic import('lucide-react') (pulled
// entire 748kB icon library) with tree-shakeable named imports
// via owner-placeholders.tsx.
// ============================================================
import type { RouteObject } from 'react-router';

export const ownerChildren: RouteObject[] = [
  { index: true,           lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerDashboardPlaceholder })) },
  { path: 'institution',   lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerInstitutionPlaceholder })) },
  { path: 'members',       lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerMembersPlaceholder })) },
  { path: 'plans',         lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerPlansPlaceholder })) },
  { path: 'subscriptions', lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerSubscriptionsPlaceholder })) },
  { path: 'access-rules',  lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerAccessRulesPlaceholder })) },
  { path: 'reports',       lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerReportsPlaceholder })) },
  { path: 'settings',      lazy: () => import('./owner-placeholders').then(m => ({ Component: m.OwnerSettingsPlaceholder })) },
];
