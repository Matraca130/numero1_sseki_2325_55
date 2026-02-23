// ============================================================
// Axon — Route Guard: Requires authentication
// Shows loading while restoring session, redirects to /login if not.
// ============================================================
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { Loader2 } from 'lucide-react';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <AxonLogo size="lg" theme="light" />
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <span>Restaurando sesion...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
