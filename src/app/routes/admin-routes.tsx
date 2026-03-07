// ============================================================
// Axon — Admin Routes (children of AdminLayout)
//
// PARALLEL-SAFE: Only admin-area devs touch this file.
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';
import { Construction } from 'lucide-react';

import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';

function Placeholder() {
  return (
    <PlaceholderPage
      title="Em Desarrollo"
      description="Esta seccion sera implementada en breve."
      icon={<Construction size={24} />}
      accentColor="blue"
    />
  );
}

export const adminChildren: RouteObject[] = [
  { index: true,      Component: Placeholder },
  { path: 'members',  Component: Placeholder },
  { path: 'content',  Component: Placeholder },
  { path: 'scopes',   Component: Placeholder },
  { path: 'reports',  Component: Placeholder },
  { path: 'settings', Component: Placeholder },
];
