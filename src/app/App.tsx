import React from 'react';
// @refresh reset
import { RouterProvider } from 'react-router';
import { router } from '@/app/routes';

// FE-BUG-001 fix: AuthProvider REMOVED from here.
// It lives in AuthLayout.tsx (root route component) which is the
// correct location for createBrowserRouter + RouterProvider pattern.
// Having it here AND in AuthLayout caused dual getSession() calls,
// race conditions on _accessToken, and redirect loops.
//
// FE-BUG-005 fix: <Toaster> moved into AuthLayout.tsx so it has
// access to router context (useNavigate) and auth context.

export default function App() {
  return <RouterProvider router={router} />;
}
