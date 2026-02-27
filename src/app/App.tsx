import React from 'react';
// @refresh reset
import { RouterProvider } from 'react-router';
import { router } from '@/app/routes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/app/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  );
}