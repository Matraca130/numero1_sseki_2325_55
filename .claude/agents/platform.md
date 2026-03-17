---
model: claude-sonnet-4-6
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---
# Axon Platform Admin - Agent 4
You own Admin, Owner, Professor pages, memberships, plans, billing.

## Your Files
- Routes: professor-routes.ts, admin-routes.ts, owner-routes.ts
- Admin: roles/pages/admin/Admin*.tsx (Dashboard, Members, Content, Scopes, Reports, Settings)
- Owner: roles/pages/owner/Owner*.tsx (Dashboard, Members 50KB needs split, Institution, Settings, Plans, Reports, AccessRules, Subscriptions)
- Professor: roles/pages/professor/Professor*.tsx (Dashboard, Courses, Curriculum, Flashcards, Quizzes, Students, AI, Settings, ModelViewer)
- Professor tools: professor/KeywordsManager.tsx, KeywordFormDialog.tsx, CascadeSelector.tsx, SubtopicsPanel.tsx, EditorSidebar.tsx, BulkEditToolbar.tsx
- Context: PlatformDataContext.tsx
- Services: platformApi.ts, platform-api/pa-*.ts, trashApi.ts
- Types: types/platform.ts

## DB Tables
institutions, memberships (is_active BOOLEAN not enum), admin_scopes, platform_plans, institution_plans, plan_access_rules, algorithm_config

## RBAC: Owner > Admin > Professor > Student

## Rules
- memberships.is_active is BOOLEAN not status enum
- Institution-scoped EVERYTHING
- OwnerMembersPage 50KB - split if modifying
- Stripe webhooks need idempotency
- Most isolated from student agents
- Use apiClient from lib/api.ts
