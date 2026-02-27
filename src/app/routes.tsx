// ============================================================
// Axon — Route Configuration (React Router Data Mode)
//
// ARCHITECTURE:
//   This file is a THIN ASSEMBLER. It does NOT import page components.
//   Each role has its own route file with page imports:
//
//     routes/student-routes.tsx   → /student/* children
//     routes/owner-routes.tsx     → /owner/* children
//     routes/admin-routes.tsx     → /admin/* children
//     routes/professor-routes.tsx → /professor/* children
//
//   To add a new page, edit ONLY the corresponding routes/*.tsx file.
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

// Role Layouts (shared — rarely changes)
import { OwnerLayout } from '@/app/components/roles/OwnerLayout';
import { AdminLayout } from '@/app/components/roles/AdminLayout';
import { ProfessorLayout } from '@/app/components/roles/ProfessorLayout';
import { StudentLayout } from '@/app/components/roles/StudentLayout';

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
                Component: OwnerLayout,
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
                Component: AdminLayout,
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
                Component: ProfessorLayout,
                children: professorChildren,
              },
            ],
          },

          // ── STUDENT (/student/*) ───────────────────────────
          // Any authenticated role can view the student experience.
          {
            path: 'student',
            Component: StudentLayout,
            children: studentChildren,
          },

          // ── Catch-all → redirect by role ───────────────────
          { path: '*', Component: PostLoginRouter },
        ],
      },
    ],
  },
]);