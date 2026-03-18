# Axon Platform — Knowledge Mind Map Feature

YOU MUST WORK AUTONOMOUSLY. DO NOT ASK WHAT TO DO. Read .ralph/fix_plan.md for your task list and START WORKING IMMEDIATELY on the highest priority unchecked item. Never ask for permission or clarification — just execute.

## Project
Axon is an educational platform (LMS) frontend built with React + TypeScript + Vite.
Backend is Supabase Edge Functions (Deno + Hono).

## Current Feature: Mind Map / Knowledge Graph
Interactive knowledge graph for students and professors using G6 (AntV) v5.

## Vision: XMind-like Educational Tool + AI-Powered Learning
The mind map is NOT just a visualization — it's an interactive TOOL where:
- Students can draw connections, add arrows, annotate, organize concepts
- AI analyzes the graph to identify weak points and recommend study paths
- Fullscreen immersive mode for focused study sessions
- The map becomes the student's primary study companion

## What To Do RIGHT NOW
1. Read .ralph/fix_plan.md — find the first unchecked [ ] task
2. Implement it — research, code, build, verify
3. If build fails, fix it immediately
4. Mark it [x] in fix_plan.md when done
5. Move to the next unchecked task
6. Repeat until all tasks are done or context runs out

## Brand Palette (MANDATORY)
- Dark Teal: #1B3B36 (sidebar, primary buttons)
- Teal Accent: #2a8c7a (links, focus, active states)
- Hover Teal: #244e47 (button hover)
- Page BG: #F0F2F5
- Cards: #FFFFFF

## Languages
- TODA la UI visible al usuario debe estar en ESPAÑOL (student Y professor)
- Botones, labels, toasts, placeholders, empty states, tooltips, modals: TODO en español
- Código (variables, comments): English
- CAMBIAR cualquier texto en portugués que encuentres a español

## Architecture Principles (MANDATORY)
- Code MUST be modular — small files, single responsibility, reusable hooks
- If a file exceeds 300 lines, extract helpers/hooks into separate files
- If two components share logic, extract to a shared hook or utility
- Design for scalability — new features should plug in without modifying existing code
- Follow clean architecture: types → services → hooks → components → pages
- No god components — each component does ONE thing well
- Shared logic goes to hooks/ or lib/, not duplicated across components
- Every new hook/utility must be exported from the nearest barrel (index.ts)
- Think in layers: data (services) → state (hooks) → presentation (components)

## Axon Backend & Docs (FUENTE DE VERDAD)
- **Backend code**: C:/Users/petri/axon-backend (Supabase Edge Functions, Deno + Hono)
- **Docs**: C:/Users/petri/axon-docs
- TODOS los agentes DEBEN consultar estos directorios ANTES de implementar cualquier cosa:
  - Verificar contratos de API (request/response shapes, headers, status codes)
  - Verificar tipos y schemas del backend para que el frontend los matchee exactamente
  - Leer docs para entender el comportamiento esperado de cada endpoint
  - Si un endpoint no existe en el backend, NO inventar — marcar como BLOCKED
  - Si los tipos del frontend no coinciden con los del backend, CORREGIR el frontend
- NO modificar archivos en estos directorios (son repos separados)

## Work Strategy — MÁXIMA CALIDAD (1-2 tareas a la vez)
- ENFOQUE: implementar MÁXIMO 1-2 tareas a la vez con la MÁXIMA calidad posible
- NUNCA avanzar a la siguiente tarea hasta que la actual esté 100% terminada, testeada, y verificada end-to-end
- Ciclo por tarea: PLAN → IMPLEMENT → REVIEW → TEST E2E → POLISH → VERIFY → siguiente tarea
- Cada tarea debe pasar por TODOS los agentes antes de marcarla como [x]
- ralph-reviewer debe auditar CADA cambio — no se salta la revisión
- ralph-tester debe escribir tests E2E para CADA feature/fix implementado
- Si algo falla en review o test, vuelve a ralph-coder — NO se avanza
- Use up to 6 subagents in PARALLEL pero TODOS enfocados en la MISMA tarea
- Plan before executing — think first, code second
- Verify before marking done — "Would a senior engineer approve this?"
- Fix errors autonomously — find root cause, not patches
- Minimal impact — change only what's necessary

## Tests End-to-End (OBLIGATORIO)
- TODA feature implementada DEBE tener test e2e que verifique el flujo completo
- Smoke tests de render para TODAS las páginas principales (verificar que no crashean)
- Tests de navegación: página A → acción → página B → volver → verificar estado
- Tests de datos: crear → leer → actualizar → eliminar → verificar consistency
- Tests de edge cases: datos vacíos, errores de red, estados inválidos
- NUNCA importar nombres de lucide-react que colisionen con globals JS (Map, Set, Array, Object, etc) — usar alias (Map as MapIcon)
- Si un test falla, la tarea NO está completa

## Criterio de Parada — TRIPLE QA GATE
- ralph-lead (tech leader) decide qué tareas implementar y qué debe ser aprobado
- Cuando ralph-lead considere que TODO su plan está implementado, lanza 3 agentes QA INDEPENDIENTES:
  1. **ralph-reviewer** — audita código: bugs, seguridad, tipos, performance, edge cases
  2. **ralph-designer** — audita visual: premium feel, paleta, spacing, responsive, UX
  3. **ralph-tester** — audita tests: cobertura e2e, smoke tests, edge cases, todos pasan
- Los 3 deben dar APROBADO 100% sin NINGÚN issue pendiente
- Si CUALQUIERA de los 3 reporta un issue → ralph-coder arregla → los 3 vuelven a auditar
- El loop NO para hasta que los 3 aprueben TODO lo que ralph-lead decidió
- Cuando los 3 aprueben, ralph-lead crea .ralph/QA_APPROVED con:
  - Lista de todo lo implementado
  - Reporte de aprobación de cada QA agent
  - Fecha y ronda
- Si hay más tareas en fix_plan.md, ralph-lead toma las siguientes y repite el ciclo completo
- SOLO cuando fix_plan.md no tenga tareas pendientes Y los 3 QA aprueben → PARAR

## UX/Performance (MÁXIMA PRIORIDAD)
- Los nodos deben verse PREMIUM — bordes suaves, sombras sutiles, colores de mastery vibrantes
- Animaciones a 60fps — usar requestAnimationFrame, CSS transforms (no layout thrashing)
- Interacciones fluidas: drag suave, zoom sin lag, pan sin jitter
- Optimizar rendimiento para 500+ nodos — virtualización, culling, batch renders
- Cada feature nueva debe pasar por revisión de UX: ¿es intuitivo? ¿es fluido? ¿se siente premium?
- Nodos: rounded, con glow sutil de mastery color, hover scale suave, click feedback visual
- Edges: anti-aliased, con arrowheads limpios, labels legibles, colores semánticos
- Múltiples rondas de QA visual después de cada cambio

## Rules
- Never use generic teal-500, always use #2a8c7a
- Always use Opus model for subagents (NEVER Haiku, NEVER Sonnet)
- Always run npm run build after changes
- Don't modify src/app/components/ui/ (shadcn primitives)
- Use ErrorBoundary on all G6 components
- Import paths always with @/ alias
- Simplicity first — KISS, don't over-engineer
- After each error fixed, ask "how do I prevent this in the future?"
