// ============================================================
// Axon — Post-Login Router
// After authentication, redirects user to the correct area
// based on their institution memberships and roles.
//
// Flow:
//   0 institutions  → /student (default)
//   1 institution   → auto-select, route by role
//   N institutions  → /select-org (picker)
// ============================================================
import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';

const ROLE_ROUTES: Record<string, string> = {
  owner: '/owner',
  admin: '/admin',
  professor: '/professor',
  student: '/student',
};

export function PostLoginRouter() {
  const { status, institutions, selectedInstitution, role, memberships, activeMembership, logout, authError } = useAuth();

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but institutions failed to load → force logout to break the loop
  if (institutions.length === 0 && memberships.length === 0) {
    if (authError) {
      logout();
      return <Navigate to="/login" replace />;
    }
    // No error but empty → still loading or genuinely no memberships, go to login
    return <Navigate to="/login" replace />;
  }

  // Already have a selected institution → route directly by role
  if (selectedInstitution || activeMembership) {
    const activeRole = role || activeMembership?.role || selectedInstitution?.role || 'student';
    const route = ROLE_ROUTES[activeRole] || '/student';
    return <Navigate to={route} replace />;
  }

  // Single institution → auto-select by routing to role
  if (institutions.length === 1) {
    const activeRole = institutions[0]?.role || memberships[0]?.role || 'student';
    const route = ROLE_ROUTES[activeRole] || '/student';
    return <Navigate to={route} replace />;
  }

  // Multiple institutions and none selected → picker
  return <Navigate to="/select-org" replace />;
}
