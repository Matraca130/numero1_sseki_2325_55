// ============================================================
// Axon v4.5 — App Entry Point
// Uses React Router Data Mode with RouterProvider.
// All route config lives in routes.tsx + routes/*.ts
// ============================================================
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

// PERF-71: Preconnect to Supabase domain for faster first API call.
// This saves 200-400ms of DNS + TCP + TLS handshake on cold start.
// NOTE: Must insert into <head> via DOM API because React 18 renders
// components into <body>, and <link rel="preconnect"> only works
// reliably in <head>.
const SUPABASE_ORIGIN = 'https://xdnciktarvxyhkrokbng.supabase.co';

function usePreconnect(origin: string) {
  useEffect(() => {
    // Avoid duplicates if already present
    const existing = document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`);
    if (existing) return;

    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = origin;
    document.head.appendChild(preconnect);

    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = origin;
    document.head.appendChild(dnsPrefetch);

    return () => {
      document.head.removeChild(preconnect);
      document.head.removeChild(dnsPrefetch);
    };
  }, [origin]);
}

export default function App() {
  usePreconnect(SUPABASE_ORIGIN);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </ErrorBoundary>
  );
}