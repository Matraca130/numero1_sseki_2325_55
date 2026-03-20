// ============================================================
// Axon — Post-Login Router
// After authentication, redirects user to the correct area
// based on their institution memberships and roles.
//
// Flow:
//   0 institutions  → /login (or logout if authError)
//   1 institution   → auto-select, route by role
//   N institutions  → /select-org (picker)
// ============================================================
import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';

const ROLE_ROUTES: Record<string, string> = {
  owner: '/owner',
  admin: '/admin',
  professor: '/professor',
  student: '/student',
};

export function PostLoginRouter() {
  const { status, institutions, selectedInstitution, role, memberships, activeMembership, logout, authError } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  // Authenticated but institutions failed → logout properly via useEffect (not in render)
  useEffect(() => {
    if (status === 'authenticated' && institutions.length === 0 && memberships.length === 0 && authError && !loggingOut) {
      setLoggingOut(true);
      logout().then(() => navigate('/login', { replace: true }));
    }
  }, [status, institutions.length, memberships.length, authError, loggingOut, logout, navigate]);

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // Waiting for logout to complete
  if (loggingOut) {
    return null;
  }

  // Authenticated but no data and no error → genuinely no memberships, show login
  if (institutions.length === 0 && memberships.length === 0) {
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
