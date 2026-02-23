// ============================================================
// Axon — Auth Layout (root layout route)
// Wraps the entire route tree with AuthProvider so all
// child routes can access useAuth().
//
// This exists because createBrowserRouter + RouterProvider
// renders components in its own React tree, so context
// providers must be INSIDE the route tree (not wrapping
// RouterProvider from outside).
// ============================================================
import React from 'react';
import { Outlet } from 'react-router';
import { AuthProvider } from '@/app/contexts/AuthContext';

export function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
