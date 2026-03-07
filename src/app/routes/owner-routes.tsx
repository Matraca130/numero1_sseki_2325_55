// ============================================================
// Axon — Owner Routes (children of OwnerLayout)
//
// PARALLEL-SAFE: Only owner-area devs touch this file.
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
      accentColor="amber"
    />
  );
}

export const ownerChildren: RouteObject[] = [
  { index: true,         Component: Placeholder },
  { path: 'institutions', Component: Placeholder },
  { path: 'billing',     Component: Placeholder },
  { path: 'analytics',   Component: Placeholder },
  { path: 'settings',    Component: Placeholder },
];
