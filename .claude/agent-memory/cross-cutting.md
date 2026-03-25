# Cross-Cutting Memory

## Estado actual
- 624 TS/TSX files
- 11 type files with DUPLICATE definitions (Course/Topic/Section/Semester defined 3x)
- legacy-stubs.ts marked for deletion
- 48 shadcn/ui components
- 28 shared components

## Decisiones tomadas (NO re-litigar)
- platform.ts is canonical for DB types
- content.ts for nested UI types
- legacy-stubs.ts will be deleted

## Archivos clave
- types/*.ts (11 files) — type definitions, watch for duplicates
- lib/*.ts (28 files) — utilities, API clients, helpers
- components/shared/ (28 files) — reusable UI components

## Bugs conocidos
- BUG-024 (overlapping kw-student-notes types)
- BUG-027 (dual content tree implementation)
