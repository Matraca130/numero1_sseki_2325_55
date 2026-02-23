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
  const { status, institutions, selectedInstitution, role, memberships, activeMembership } = useAuth();

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // No institutions → send to student as default
  if (institutions.length === 0 && memberships.length === 0) {
    return <Navigate to="/student" replace />;
  }

  // Multiple institutions and none selected → picker
  if (institutions.length > 1 && !selectedInstitution && !activeMembership) {
    return <Navigate to="/select-org" replace />;
  }

  // Route by role (from selectedInstitution or fallback to first)
  const activeRole = role || activeMembership?.role || institutions[0]?.role || memberships[0]?.role || 'student';
  const route = ROLE_ROUTES[activeRole] || '/student';

  return <Navigate to={route} replace />;
}
