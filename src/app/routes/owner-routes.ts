// ============================================================
// Axon — Owner Routes (children of OwnerLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
//
// BUG-030: All routes wired to real page components (no more placeholders).
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const ownerChildren: RouteObject[] = [
  {
    index: true,
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerDashboardPage')).then(m => ({ Component: m.OwnerDashboardPage })),
  },
  {
    path: 'institution',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerInstitutionPage')).then(m => ({ Component: m.OwnerInstitutionPage })),
  },
  {
    path: 'members',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerMembersPage')).then(m => ({ Component: m.OwnerMembersPage })),
  },
  {
    path: 'plans',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerPlansPage')).then(m => ({ Component: m.OwnerPlansPage })),
  },
  {
    path: 'subscriptions',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerSubscriptionsPage')).then(m => ({ Component: m.OwnerSubscriptionsPage })),
  },
  {
    path: 'access-rules',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerAccessRulesPage')).then(m => ({ Component: m.OwnerAccessRulesPage })),
  },
  {
    path: 'reports',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerReportsPage')).then(m => ({ Component: m.OwnerReportsPage })),
  },
  {
    path: 'settings',
    lazy: () => lazyRetry(() => import('@/app/components/roles/pages/owner/OwnerSettingsPage')).then(m => ({ Component: m.OwnerSettingsPage })),
  },
];
