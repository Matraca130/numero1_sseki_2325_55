// ============================================================
// Axon — Route Configuration (React Router Data Mode)
//
// ARCHITECTURE:
//   This file is a THIN ASSEMBLER. It does NOT import page components.
//   Each role has its own route file with lazy page imports.
//
// CODE SPLIT (BUG-014):
//   Role layouts are lazy-loaded so a student never downloads
//   AdminLayout, ProfessorLayout, or OwnerLayout code.
//
// ROLES:
//   /owner/*       → Propietario de institucion
//   /admin/*       → Administrador
//   /professor/*   → Profesor
//   /student/*     → Estudiante
// ============================================================
import React from 'react';
import { createBrowserRouter } from 'react-router';

// Auth (shared — small, loaded immediately)
import { LoginPage } from '@/app/components/auth/LoginPage';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { RequireAuth } from '@/app/components/auth/RequireAuth';
import { RequireRole } from '@/app/components/auth/RequireRole';
import { PostLoginRouter } from '@/app/components/auth/PostLoginRouter';
import { SelectRolePage } from '@/app/components/auth/SelectRolePage';

// Per-role children (lazy route definitions — each file is tiny,
// the actual page components inside use lazy() too)
import { studentChildren } from '@/app/routes/student-routes';
import { ownerChildren } from '@/app/routes/owner-routes';
import { adminChildren } from '@/app/routes/admin-routes';
import { professorChildren } from '@/app/routes/professor-routes';

export const router = createBrowserRouter([
  {
    // Root layout — provides AuthProvider to entire route tree
    Component: AuthLayout,
    children: [
      // ── Public ─────────────────────────────────────────────
      {
        path: '/login',
        Component: LoginPage,
      },

      // ── Protected (require authentication) ─────────────────
      {
        path: '/',
        Component: RequireAuth,
        children: [
          // Root → redirect by role
          { index: true, Component: PostLoginRouter },

          // Role / institution picker
          { path: 'select-org', Component: SelectRolePage },

          // ── OWNER (/owner/*) ── lazy layout ────────────────
          {
            element: <RequireRole roles={['owner']} />,
            children: [
              {
                path: 'owner',
                lazy: () => import('@/app/components/roles/OwnerLayout').then(m => ({ Component: m.OwnerLayout })),
                children: ownerChildren,
              },
            ],
          },

          // ── ADMIN (/admin/*) ── lazy layout ────────────────
          {
            element: <RequireRole roles={['admin', 'owner']} />,
            children: [
              {
                path: 'admin',
                lazy: () => import('@/app/components/roles/AdminLayout').then(m => ({ Component: m.AdminLayout })),
                children: adminChildren,
              },
            ],
          },

          // ── PROFESSOR (/professor/*) ── lazy layout ────────
          {
            element: <RequireRole roles={['professor', 'admin', 'owner']} />,
            children: [
              {
                path: 'professor',
                lazy: () => import('@/app/components/roles/ProfessorLayout').then(m => ({ Component: m.ProfessorLayout })),
                children: professorChildren,
              },
            ],
          },

          // ── STUDENT (/student/*) ── lazy layout ────────────
          {
            path: 'student',
            lazy: () => import('@/app/components/roles/StudentLayout').then(m => ({ Component: m.StudentLayout })),
            children: studentChildren,
          },

          // ── Catch-all → redirect by role ───────────────────
          { path: '*', Component: PostLoginRouter },
        ],
      },
    ],
  },
]);
