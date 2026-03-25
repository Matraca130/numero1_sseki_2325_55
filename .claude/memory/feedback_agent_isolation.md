---
name: Agent isolation and coordination (PERMANENT)
description: MANDATORY rules for ALL multi-agent sessions. Covers file isolation, worktrees, model, quality-gate, merge order. Merges former feedback_agent_coordination_lessons.md.
type: feedback
---

## PRE-LAUNCH

0. **MANDATORY: Each agent MUST read the CLAUDE.md of its target repo + `feedback_agent_isolation.md` BEFORE writing any code**
1. `git pull origin main` in each repo
2. `git status --short` — working dir CLEAN (stash if dirty)
3. Assign EXPLICIT file list per agent — zero overlap
4. If file needs 2+ agents, assign to ONE; others wait
5. If agent A creates file that B needs, B goes AFTER A
6. ALWAYS `model: "opus"` — never sonnet/haiku
7. 2+ agents same repo: use `isolation: "worktree"` (pre-create `.claude/worktrees/`)
8. Max 20 agents simultaneously (configured by team)

## IN EACH AGENT PROMPT

```
## MANDATORY READS (before writing any code)
0. Read the CLAUDE.md of your target repo
1. Read `.claude/memory/feedback_agent_isolation.md`
2. Read `.claude/agent-memory/[your-section].md`

## ISOLATION RULES
1. You MUST ONLY modify these files: [EXPLICIT LIST]
2. Do NOT modify ANY other file
3. If you see uncommitted changes from other agents, IGNORE THEM
4. Do NOT import from files that don't exist on the main branch
5. First: git checkout -b <branch> main
6. Last: verify git diff main..<branch> --stat shows ONLY your files
```

## ARCHIVOS NUEVOS (regla de ownership)

- **Todo archivo nuevo DEBE tener dueño.** Si creás un archivo nuevo, DEBE estar dentro de tu zona de ownership.
- Si el archivo no encaja en tu zona → escalar al Arquitecto ANTES de crearlo para que lo asigne.
- **Nunca crear archivos huérfanos** (sin dueño en el AGENT-REGISTRY).
- Si durante tu trabajo descubrís un archivo existente que no tiene dueño en el registry → registrarlo en tu memoria individual como "archivo huérfano detectado" para que el Arquitecto lo asigne.

## POST-EXECUTION

9. Quality-gate Opus IMMEDIATELY when each agent completes (in background, don't wait for others)
10. Verify `git diff main..<branch> --stat` — only authorized files
11. If contamination: rebuild clean branch from main
12. Merge PRs ONE at a time; rebase remaining branches after each merge
13. Never `git commit --amend` on branches with open PRs

## PATTERNS

- **Same file, N agents:** sequential (A merges, B branches from updated main, etc.)
- **Disjoint files:** parallel safe, merge without conflicts

## EVOLUCIÓN CONTINUA (OBLIGATORIO en cada sesión)

Al finalizar tu tarea, ANTES de reportar al usuario, reflexioná sobre tu sesión y actualizá tu memoria individual (`agent-memory/individual/<TU-ID>.md`):

### 1. ¿Qué aprendí en esta sesión?

| Pregunta | Si la respuesta es SÍ → acción |
|----------|---------------------------------|
| ¿Descubrí algo sobre el código que no sabía antes? | → Agregar a "Patrones que funcionan" |
| ¿Casi cometí un error? ¿Qué me detuvo? | → Agregar a "Patrones a evitar" con la alternativa correcta |
| ¿Tomé una decisión técnica entre 2+ opciones? | → Agregar a "Decisiones técnicas" con POR QUÉ y alternativas descartadas |
| ¿Una lección previa de mi memoria me ayudó a evitar un error? | → Actualizar "Efectividad de lecciones": incrementar "Veces aplicada", marcar "Previno error? SI" |
| ¿Encontré que una lección previa estaba equivocada o incompleta? | → Corregirla o expandirla en la tabla |

### 2. ¿Cambió algo en mi zona?

| Pregunta | Si la respuesta es SÍ → acción |
|----------|---------------------------------|
| ¿Descubrí un archivo nuevo en mi zona que no estaba documentado? | → Notificar al Arquitecto para actualizar AGENT-REGISTRY |
| ¿Un contrato que consumo cambió (tipos, API, interfaz)? | → Registrar en "Lecciones aprendidas" para estar alerta la próxima vez |
| ¿Mi definición (agents/<mi-nombre>.md) tiene algo incorrecto o desactualizado? | → Notificar al Arquitecto con la corrección sugerida |

### 3. NO hacer

- NO buscar "mejoras de código" como excusa para tocar archivos extra
- NO hacer refactors que no fueron pedidos
- NO inventar lecciones si no aprendiste nada real — una sesión sin aprendizajes es perfectamente válida
- NO agregar complejidad al sistema "por si acaso"

> **El objetivo no es cambiar código — es acumular conocimiento.** Un agente que registra 1 patrón real por sesión es mejor que uno que tipa 10 `any` sueltos. La evolución viene de saber más, no de tocar más.

## HISTORICAL ERRORS (2026-03-18)

| Error | Prevention |
|-------|------------|
| Scope creep (3x) | Isolation rules in each prompt |
| Import roto (2x) | "Don't import non-existent files" |
| Merge accidental | Never amend with open PR |
| Conflictos merge (3x) | Sequential merge + rebase |
| Worktree EEXIST | Pre-create `.claude/worktrees/` |
| API 529 (2x) | Max 20 simultaneous agents (configured by team) |
