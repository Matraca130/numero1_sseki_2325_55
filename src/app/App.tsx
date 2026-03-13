// ============================================================
// Axon v4.5 — App Entry Point
// Uses React Router Data Mode with RouterProvider.
// All route config lives in routes.tsx + routes/*.ts
// ============================================================
import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
