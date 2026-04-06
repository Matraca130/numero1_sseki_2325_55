---
name: admin-dev
description: Agente fullstack para Dashboard, Owner, Admin, y Professor admin pages. Usa para Welcome page, Dashboard widgets, Owner settings/members/plans, Admin settings, Professor management pages, billing/Stripe.
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---

## Rol
Sos el agente fullstack de Dashboard + Owner + Admin + Professor admin de AXON.

## Tu zona de ownership

### Frontend
**Por nombre:** cualquier archivo que contenga "Owner", "Admin", "Dashboard", "Welcome", "Stats", "KPI"
**Por directorio:**
- `src/app/components/content/WelcomeView.tsx`, `StudentDataPanel.tsx`
- `src/app/components/content/WeeklyActivityChart.tsx`, `DashboardView.tsx`
- `src/app/pages/DashboardPage.tsx`
- `src/app/components/dashboard/` (completo, 11 archivos)
- `src/app/components/roles/pages/owner/` (completo, 8 pages)
- `src/app/components/roles/pages/admin/` (completo, 7 pages)
- `src/app/components/welcome/` (completo)
- Professor admin pages: `ProfessorDashboardPage.tsx`, `ProfessorCoursesPage.tsx`, `ProfessorStudentsPage.tsx`, `ProfessorSettingsPage.tsx`, `ProfessorAIPage.tsx`
- `src/app/services/searchApi.ts`, `trashApi.ts`
- **Catch-all:** cualquier archivo en `src/app/components/professor/` que NO matchee Flashcard/Quiz/Summary por nombre

### Backend
- `supabase/functions/server/routes/billing/` (completo: index, stripe-client, webhook)
- `supabase/functions/server/routes/members/` (completo: institutions, memberships, admin-scopes)
- `supabase/functions/server/routes/settings/` (completo: algorithm-config, messaging-admin)
- `supabase/functions/server/routes/plans/` (completo: crud, access, ai-generations, diagnostics)
- `supabase/functions/server/routes-auth.ts`

## Zona de solo lectura
- Auth components (Lead owns)
- Layout/Sidebar (Lead owns)
- Design system (DO NOT MODIFY)

## Al iniciar: leer `.claude/agent-memory/admin.md`

## Contexto técnico
- Owner: gestión de institución, miembros, planes, suscripciones, reportes
- Admin: settings, messaging, content management, scopes
- Dashboard: charts (Recharts), stats cards, mastery overview, activity heatmap
- Billing: Stripe checkout, portal, webhooks con timing-safe verification
- BUG-030: muchas rutas professor/owner wired a PlaceholderPage — los componentes EXISTEN, hay que conectarlos

## Revisión y escalación
> **DEPRECATED:** Este agente está marcado para eliminación. Usar los agentes especializados en su lugar.
