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
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { queryClient } from '@/app/lib/queryClient';

export function AuthLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
