# Procedimiento: Sistema Multi-Agent con Arquitecto (70 agentes)

> **Date:** 2026-03-25
> **Escala:** 70 agentes especializados + 1 arquitecto orquestador
> **Basado en:** Sistema actual de 16→24 agentes, escalado a cobertura total

---

## Resumen

```
Usuario → Arquitecto → [selecciona agentes del Registry] → lanza sesión → quality-gate
```

El **Arquitecto** (XX-01) es el punto de entrada único. Lee el **Agent Registry** (índice de 70 agentes), identifica cuáles son necesarios para el pedido, resuelve dependencias, y genera un plan de ejecución.

---

## Paso 1: Crear las definiciones de agentes faltantes

Actualmente tienes 16 agentes definidos en `claude-config/agents/`. Necesitas crear 54 más.

### Formato estándar para cada agente

```markdown
---
name: [agent-name]
description: [1 línea de qué hace. Usa para X, Y, Z.]
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---

## Rol
Sos el agente [nombre] de AXON. [1 línea de responsabilidad].

## Tu zona de ownership
**Por nombre:** [patrón de archivos]
**Por directorio:**
- [lista explícita de archivos]

## Zona de solo lectura
Todo fuera de tu zona. Escalar al lead para modificar lógica de otra zona.

## Al iniciar cada sesión (OBLIGATORIO)
1. Leer el CLAUDE.md del repo donde vas a trabajar (ROOT, FRONTEND, o BACKEND)
2. Leer `.claude/agent-memory/[section].md`
3. Leer `.claude/memory/feedback_agent_isolation.md`

## Reglas de código
- TypeScript strict, no `any`, no console.log
- Usar `apiCall()` de `lib/api.ts`
- [reglas específicas de la sección]

## Contexto técnico
- [stack relevante]
- [APIs que usa]
- [dependencias clave]

## Revisión y escalación
- **Tu trabajo lo revisa:** XX-02 (quality-gate) después de cada sesión
- **Resultados QG:** `agent-memory/individual/AGENT-METRICS.md` → Error Ledger + Agent Detail
- **Cuándo escalar al Arquitecto (XX-01):**
  - Si necesitás modificar un archivo fuera de tu zona de ownership
  - Si encontrás un conflicto con el trabajo de otro agente
  - Si una decisión técnica tiene impacto cross-section
  - Si no estás seguro de qué hacer
- **NO escalar:** si la tarea está dentro de tu zona y tus reglas la cubren

## Self-Evaluation
Si se te pide una auto-evaluación, lee `AGENT-SELF-EVAL.md` y completá el checklist sobre tu propia definición. NO modifiques nada — solo reportá.
```

### Orden de creación recomendado

Crear por sección, en este orden (de más a menos impacto):

| Prioridad | Sección | Agentes a crear | Ya existen |
|-----------|---------|-----------------|------------|
| 1 | Cross-cutting (XX) | XX-04 a XX-09 (6) | XX-01 (architect), XX-02 (quality-gate), XX-03 (docs-writer) |
| 2 | Auth & Security (AS) | AS-01 a AS-05 (5) | — |
| 3 | AI & RAG (AI) | AI-01 a AI-06 (6) | infra-ai (parcial) |
| 4 | Study (ST) | ST-01 a ST-05 (5) | study-dev (parcial) |
| 5 | Dashboard (DG) | DG-01 a DG-05 (5) | — |
| 6 | Quiz (QZ) | QZ-04 a QZ-06 (3) | quiz-frontend, quiz-backend, quiz-tester |
| 7 | Flashcards (FC) | FC-04 a FC-06 (3) | flashcards-frontend, flashcards-backend, flashcards-tester |
| 8 | Summaries (SM) | SM-01 a SM-06 (6) | summaries-frontend, summaries-backend, summaries-tester |
| 9 | Admin (AO) | AO-01 a AO-04 (4) | admin-dev (parcial) |
| 10 | Infra (IF) | IF-04, IF-05 (2) | infra-plumbing, infra-ui, infra-ai |
| 11 | 3D (3D) | 3D-01 a 3D-04 (4) | — |
| 12 | Messaging (MG) | MG-01 a MG-04 (4) | — |
| 13 | Billing (BL) | BL-01 a BL-04 (4) | — |

---

## Paso 2: Crear agent-memory por sección

Cada sección necesita un archivo de memoria compartida:

```
claude-config/agent-memory/
├── quiz.md          ← ya existe
├── flashcards.md    ← ya existe
├── summaries.md     ← ya existe
├── study.md         ← ya existe
├── admin.md         ← ya existe
├── infra.md         ← ya existe
├── docs.md          ← ya existe
├── auth.md          ← CREAR
├── ai-rag.md        ← CREAR
├── 3d-viewer.md     ← CREAR
├── dashboard.md     ← CREAR
├── messaging.md     ← CREAR
├── billing.md       ← CREAR
└── cross-cutting.md ← CREAR
```

Formato de cada memory:

```markdown
# [Section] Memory

## Estado actual
- [qué está hecho, qué falta]

## Decisiones tomadas
- [decisiones que NO se deben re-litigar]

## Archivos clave
- [files y su propósito]

## Bugs conocidos
- [bugs abiertos de esta sección]
```

---

## Paso 3: Flujo de uso diario

### 3a. Inicio de sesión

```
Usuario: "Quiero agregar analytics a los quizzes"
     │
     ▼
Arquitecto (XX-01) se activa:
  1. Lee AGENT-REGISTRY.md
  2. Busca archivos relevantes (Glob/Grep "analytics", "quiz")
  3. Identifica agentes: QZ-06 (quiz-analytics), QZ-02 (quiz-backend), DG-01 (dashboard)
  4. Resuelve deps: QZ-06 depende de QZ-02 y DG-01
  5. Genera plan:
     Phase 1: QZ-02 (nuevo endpoint analytics)
     Phase 2: QZ-06 + DG-01 (paralelo, frontend)
     Phase 3: XX-02 (quality-gate)
  6. Muestra plan al usuario
  7. Usuario confirma → lanza agentes
```

### 3b. Durante la sesión

```
Arquitecto monitorea:
  - ¿Agente terminó? → lanza quality-gate en background
  - ¿Quality-gate falló? → notifica al usuario
  - ¿Dependencia completada? → lanza siguiente fase
  - ¿Conflicto detectado? → pausa y escala al usuario
```

### 3c. Fin de sesión

```
1. Todos los agentes terminaron
2. Todos los quality-gates pasaron
3. Arquitecto reporta:
   - Agentes ejecutados
   - Archivos modificados
   - Branches creadas
   - PRs para review
4. Actualiza agent-memory de las secciones tocadas
```

---

## Paso 4: Configuración del CLAUDE.md raíz

Agregar al CLAUDE.md raíz del proyecto:

```markdown
## Agent System

- **70 agents** organized in 12 sections + cross-cutting
- **Architect agent** (XX-01) is the entry point for multi-agent sessions
- **Agent Registry:** `axon-docs/claude-config/AGENT-REGISTRY.md`
- **Agent definitions:** `axon-docs/claude-config/agents/*.md`
- **Agent memory:** `axon-docs/claude-config/agent-memory/*.md`

### To start a multi-agent session:
1. Describe what you want
2. The Architect will propose a plan
3. Confirm → agents launch

### Single-agent tasks:
For simple tasks (1 file, 1 change), invoke the agent directly — no need for the Architect.
```

---

## Paso 5: Mantener el registro actualizado

### Cuándo actualizar AGENT-REGISTRY.md

| Evento | Acción |
|--------|--------|
| Nuevo archivo/módulo en el codebase | Asignar ownership a un agente existente o crear nuevo |
| Agente siempre se usa junto con otro | Considerar fusionarlos (reducir count) |
| Agente nunca se usa | Marcar como `dormant`, no eliminar |
| Archivo cambia de dueño | Actualizar "Files Owned" en registry |
| Nuevo agente creado | Agregar al registry con ID, section, deps |

### Auditoría periódica

Cada 2 semanas (o cuando el codebase cambie significativamente):

1. `XX-07` (refactor-scout) escanea archivos sin dueño
2. Arquitecto verifica que no hay overlap entre agentes
3. Actualizar registry si hay cambios

---

## Límites operativos

| Límite | Valor | Razón |
|--------|-------|-------|
| Agentes simultáneos | 20 | Configurado por el equipo |
| Agentes por sesión | 15-20 | Más allá pierde coherencia |
| Archivos por agente | 10-20 | Más allá el agente pierde foco |
| Fases de ejecución | 4-5 max | Más allá la sesión es demasiado larga |
| Quality-gates por sesión | 1 por agente que escribe código | Nunca saltear |

---

## Paso 6: Post-mortem automático (aprender de errores)

Después de CADA sesión multi-agente, el Arquitecto ejecuta un post-mortem:

### Cuándo se activa

- Al finalizar una sesión donde se lanzaron 2+ agentes
- Cuando un quality-gate falla
- Cuando hay conflictos de merge o errores inesperados

### Qué analiza

```
1. ¿Algún agente tocó archivos fuera de su scope? → scope creep
2. ¿Hubo conflictos de merge? → overlap en file assignment
3. ¿Quality-gate detectó errores? → regla faltante o agente mal configurado
4. ¿Algún agente falló o se bloqueó? → dependencia no declarada
5. ¿El plan original fue correcto? → calibración del Arquitecto
```

### Dónde se guarda (4 niveles — AUTOMÁTICO desde v6)

> **CAMBIO v6:** El Quality Gate (XX-02) ahora auto-registra lecciones en tiempo real.
> El Arquitecto solo necesita verificar y actualizar métricas agregadas.

| Tipo de lección | Destino | Quién lo hace |
|----------------|---------|---------------|
| Error específico de un agente | `agent-memory/individual/<AGENT-ID>.md` → "Lecciones aprendidas" | **XX-02 (automático)** |
| Error en Error Ledger | `AGENT-METRICS.md` → Sección 4 | **XX-02 (automático)** |
| Error de aislamiento/coordinación | `memory/feedback_agent_isolation.md` → HISTORICAL ERRORS | Arquitecto (manual) |
| Error específico de sección | `agent-memory/<section>.md` → "Errores conocidos" | Arquitecto (manual) |
| Cambio en ownership de archivos | `AGENT-REGISTRY.md` → actualizar "Files Owned" | Arquitecto (manual) |

### Métricas (actualizar SIEMPRE — seguir Update Protocol)

Después de cada sesión, el Arquitecto sigue el **Update Protocol** de `AGENT-METRICS.md`:

1. **Verificar Error Ledger** (Sección 4): XX-02 ya insertó las filas. El Arquitecto solo revisa y corrige si hace falta.
2. **Agent Detail** (Sección 3): Actualizar QG L5 (ventana rodante), Fails By Type, Scope, Last Run, Trend, Health.
3. **Section Health** (Sección 2): Recalcular QG Rate. Actualizar Top Error, Status.
4. **System Pulse** (Sección 1): Recalcular las 6 métricas del sistema.
5. **Supervisor Metrics** (Sección 5): Si un supervisor participó, actualizar su tabla.
6. **Efectividad de lecciones**: Si un agente NO repitió un error que tenía lección previa → actualizar "Efectividad de lecciones" en su memoria individual (incrementar "Veces aplicada", marcar "Previno error? SI").

### Auto-evolución de definiciones de agentes

Si un error se repite 2+ veces para el mismo agente:

```
1. Abrir agents/<agent-name>.md
2. Agregar regla nueva a "Reglas de código":
   - [APRENDIDO] <regla basada en error repetido>
3. Si fue scope creep legítimo → expandir "Tu zona de ownership"
4. Si fue scope creep ilegítimo → agregar a "Patrones a evitar"
5. Si quality-gate no detectó el error → agregar check a quality-gate.md
```

### Formato de entrada en HISTORICAL ERRORS

```markdown
| Error | Prevention |
|-------|------------|
| [Qué pasó, cuántas veces] | [Regla que se agrega para evitarlo] |
```

### Flujo automático completo

```
Sesión termina
     │
     ▼
Fase 1 — Diagnóstico:
  - git diff main..<branch> --stat por agente (¿scope creep?)
  - quality-gate results (¿errores?)
  - merge results (¿conflictos?)
     │
     ▼
Fase 2 — Registrar lecciones:
  → Global: feedback_agent_isolation.md
  → Sección: agent-memory/<section>.md
  → Individual: agent-memory/individual/<AGENT-ID>.md
     │
     ▼
Fase 3 — Actualizar métricas (5 pasos):
  → Paso 1: Error Ledger (agregar failures, marcar recurrencias)
  → Paso 2: Agent Detail (QG L5, Fails By Type, Trend, Health)
  → Paso 3: Section Health (QG Rate, Top Error, Status)
  → Paso 4: System Pulse (6 métricas del sistema)
  → Paso 5: Supervisor Metrics + archivos individuales
     │
     ▼
Fase 4 — Auto-evolución:
  ¿Error repetido 2+ veces?
    → SÍ: Modificar agents/<agent>.md (reglas, ownership, o patterns)
    → NO: Solo registrar lección
     │
     ▼
Fase 5 — Reportar al usuario:
  - Agentes ejecutados + veredictos QG
  - Lecciones registradas (dónde)
  - Definiciones actualizadas (cuáles)
  - Health scores actualizados
```

### Agentes con memoria individual

Los siguientes agentes tienen archivo propio en `agent-memory/individual/`:

#### Implementadores (7)
| Agent ID | Archivo | Razón |
|----------|---------|-------|
| FC-04 | `FC-04-fsrs.md` | Algoritmo FSRS v4 — parámetros calibrados |
| QZ-04 | `QZ-04-bkt.md` | Algoritmo BKT v4 — parámetros calibrados |
| AI-01 | `AI-01-rag-pipeline.md` | Pipeline de ingesta — chunking, embeddings |
| AI-02 | `AI-02-rag-chat.md` | Chat RAG — streaming, sanitización |
| AI-04 | `AI-04-embeddings.md` | Vector search — pgvector, índices |
| AS-01 | `AS-01-auth-backend.md` | Auth — bloquea todos los agentes backend |
| XX-04 | `XX-04-type-guardian.md` | Tipos duplicados — plan de consolidación |

#### Supervisores (6)
| Agent ID | Archivo | Razón |
|----------|---------|-------|
| XX-02 | `XX-02-quality-gate.md` | Quality gate — falsos positivos/negativos |
| XX-06 | `XX-06-test-orchestrator.md` | Tests — flaky conocidos, baselines, módulos problemáticos |
| XX-07 | `XX-07-refactor-scout.md` | Deuda técnica — tendencias, archivos >500L |
| XX-09 | `XX-09-api-contract.md` | Contratos API — mismatches, convenciones, orphans |
| AS-04 | `AS-04-security-scanner.md` | Seguridad — vulnerabilidades, falsos positivos, patrones seguros |
| AS-03 | `AS-03-rls-auditor.md` | RLS — tablas auditadas, brechas, patrones validados |

> **Total: 13 agentes con memoria individual** (7 implementadores + 6 supervisores)

Para agregar memoria individual a otro agente: crear archivo en `agent-memory/individual/<AGENT-ID>-<name>.md` y agregar lectura a su definición en `agents/<agent>.md`.

---

## Ejemplo completo: "Quiero que el student vea un leaderboard con XP"

```
Arquitecto analiza:
  → Toca gamification (XP) + leaderboard UI + dashboard
  → Archivos: gamification-service, leaderboard components, dashboard

Plan:
  Phase 1: DG-04 (gamification-backend) — endpoint GET /leaderboard
  Phase 2: DG-05 (leaderboard UI) + DG-03 (XP hooks) — paralelo
  Phase 3: DG-01 (dashboard) — integrar widget
  Phase 4: XX-02 (quality-gate) — después de cada fase

Branches:
  DG-04 → feat/leaderboard-api
  DG-05 → feat/leaderboard-ui
  DG-03 → feat/xp-hooks
  DG-01 → feat/dashboard-leaderboard

Merge order:
  DG-04 → DG-05 + DG-03 → DG-01
```
