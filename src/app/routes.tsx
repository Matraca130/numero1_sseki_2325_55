// ============================================================
// Axon — Route Configuration (React Router Data Mode)
//
// ARCHITECTURE:
//   This file is a THIN ASSEMBLER. It does NOT import page components.
//   Each role has its own route file with page imports:
//
//     routes/student-routes.ts    → /student/* children
//     routes/owner-routes.ts      → /owner/* children
//     routes/admin-routes.ts      → /admin/* children
//     routes/professor-routes.ts  → /professor/* children
//
//   To add a new page, edit ONLY the corresponding routes/*.ts file.
//   This file rarely needs changes.
//
// ROLES:
//   /owner/*       → Propietario de institucion
//   /admin/*       → Administrador
//   /professor/*   → Profesor
//   /student/*     → Estudiante
// ============================================================
import React from 'react';
import { createBrowserRouter } from 'react-router';

// Auth (shared — rarely changes)
import { LoginPage } from '@/app/components/auth/LoginPage';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { RequireAuth } from '@/app/components/auth/RequireAuth';
import { RequireRole } from '@/app/components/auth/RequireRole';
import { PostLoginRouter } from '@/app/components/auth/PostLoginRouter';
import { SelectRolePage } from '@/app/components/auth/SelectRolePage';

// PERF-70: Role Layouts are lazy-loaded — each role only downloads its own layout + dependencies.
// Eliminates cross-role bundle pollution (student no longer downloads admin/professor code).

// Per-role children (one file per area — edit independently)
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

          // ── OWNER (/owner/*) ───────────────────────────────
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

          // ── ADMIN (/admin/*) ───────────────────────────────
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

          // ── PROFESSOR (/professor/*) ───────────────────────
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

          // ── STUDENT (/student/*) ───────────────────────────
          // Uses layout/StudentLayout (responsive, all providers including
          // TopicMastery, StudyPlans, StudyTimeEstimates).
          {
            path: 'student',
            lazy: () => import('@/app/components/layout/StudentLayout').then(m => ({ Component: m.StudentLayout })),
            children: studentChildren,
          },

          // ── Catch-all → redirect by role ───────────────────
          { path: '*', Component: PostLoginRouter },
        ],
      },
    ],
  },
]);
