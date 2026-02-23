// ============================================================
// Axon — Route Guard: Requires specific role
// Redirects to /select-org if user doesn't have the role
// ============================================================
import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';

interface RequireRoleProps {
  roles: string[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const { activeMembership, selectedInstitution } = useAuth();

  if (!activeMembership && !selectedInstitution) {
    return <Navigate to="/select-org" replace />;
  }

  const activeRole = selectedInstitution?.role || activeMembership?.role;
  if (!activeRole || !roles.includes(activeRole)) {
    return <Navigate to="/select-org" replace />;
  }

  return <Outlet />;
}
