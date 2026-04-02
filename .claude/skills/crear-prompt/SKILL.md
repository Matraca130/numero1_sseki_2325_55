---
name: crear-prompt
description: >
  Genera prompts optimizados para Claude Opus 2026 a partir de planes de ejecución para el sistema multi-agente de Axon (74 agentes, 12 dominios).
  Dispara SIEMPRE que el usuario mencione: crear prompt, generar prompt, prompt para agente, prompt de ejecución,
  'prompt para [agente/tarea]', plan a prompts, descomponer plan, asignar agentes, orquestar agentes,
  'qué agentes necesito para...', prompt engineering, optimizar prompt, o cualquier referencia a crear
  instrucciones ejecutables para los agentes de Axon. También activa cuando se menciona: agent team,
  equipo de agentes, ejecución multi-agente, plan de ejecución, pipeline de agentes,
  o cualquier flujo que implique convertir una idea/plan en prompts que agentes Claude Opus ejecuten.
  MANDATORY: invocar cuando el usuario tiene un objetivo técnico y necesita decidir qué agentes lo ejecutan y con qué instrucciones.
---

# Generación de Prompts para Agentes — Axon Multi-Agent System

## Qué hace esta skill

Transforma planes de alto nivel en prompts ejecutables optimizados para Claude Opus 4.6, diseñados para el ecosistema multi-agente de Axon con 74 agentes organizados en 12 dominios + 9 agentes cross-cutting.

Cada prompt generado respeta: las zonas de ownership de los agentes, sus dependencias, el sistema de memoria de 3 capas, las 6 verificaciones del Quality Gate, y las **prácticas de ingeniería** (testing, architecture decisions, code review, debug protocol, documentación).

## Principio Rector

> El prompt NO se genera por cantidad de agentes involucrados. Se genera porque el **plan lo requiere**.
> Un plan ejecutado por 3 agentes bien elegidos con prompts precisos es superior a uno que moviliza 15 agentes con instrucciones vagas.

La complejidad del prompt escala con la **ambigüedad de la tarea**, no con el número de agentes.

---

## Antes de empezar

1. **Identificar el plan fuente.** Puede venir de: texto libre del usuario, un documento estructurado, una issue de GitHub, o una conversación previa.
2. **Identificar la escala.** Clasificar:
   - **Micro** (1-3 agentes, 1 dominio) → Prompt directo
   - **Medio** (4-10 agentes, 2-4 dominios) → Plan con fases
   - **Macro** (10+ agentes, 5+ dominios) → Plan orquestado por Arquitecto (XX-01)
3. **Identificar el destino.** El usuario querrá:
   - **Solo los prompts** (para revisión/uso manual)
   - **Plan de ejecución completo** (fases + dependencias + prompts)
   - **Integración con workflow** (poblar el workflow-data.json)

---

## Las 7 Fases de Generación

### Fase 1: Análisis del Plan

Antes de generar cualquier prompt, responder:

**1. ¿Cuál es el objetivo concreto?** Traducir la intención del usuario a un resultado medible.

**2. ¿Qué archivos/componentes se ven afectados?** Mapear archivos → agentes owners (consultar `references/agent-registry.md`).

**3. ¿Qué dominios están involucrados?** Identificar las secciones del sistema que participan:

| ID | Dominio | Agentes | Descripción |
|----|---------|---------|-------------|
| QZ | Quiz | 6 | Evaluaciones adaptativas con BKT |
| FC | Flashcards | 6 | Repetición espaciada FSRS v4 |
| SM | Summaries | 6 | Bloques de contenido + editor |
| ST | Study | 5 | Sesiones de estudio + mastery |
| DG | Dashboard | 5 | Dashboards + XP/gamificación |
| AO | Admin/Owner | 5 | Gestión institucional + billing |
| AS | Auth | 5 | JWT, RLS, seguridad |
| AI | AI/RAG | 6 | Búsqueda vectorial + LLM |
| 3D | 3D Viewer | 4 | Three.js + anotaciones |
| IF | Infrastructure | 5 | APIs core, logger, migraciones |
| MG | Messaging | 4 | Bots Telegram/WhatsApp |
| BL | Billing | 4 | Stripe checkout + webhooks |
| XX | Cross-Cutting | 9 | Orquestación, auditoría, estándares |

**4. ¿Cuáles son las dependencias críticas?** Verificar el grafo de dependencias:
- IF-01 (infra-plumbing) → bloquea 74 importers
- AS-01 (auth-backend) → bloquea todos los agentes backend
- AS-02 (auth-frontend) → bloquea todos los agentes frontend
- SM-04 (content-tree) → bloquea 28 importers

**5. ¿Cuál es la complejidad del modelo requerido?** Router de modelos:

| Complejidad de tarea | Modelo | Razón |
|----------------------|--------|-------|
| Cambio mecánico (renombrar, mover, ajustar estilos) | Sonnet | Rápido y confiable para tareas directas |
| Feature estándar (CRUD, componente nuevo, endpoint) | Sonnet | Balance óptimo velocidad/calidad |
| Arquitectura, refactor complejo, integración multi-dominio | Opus | Razonamiento profundo necesario |

> **REGLA:** NUNCA usar Haiku. El mínimo modelo es Sonnet. La calidad del código de Axon no se negocia.
> **NOTA IMPORTANTE:** Por solicitud del usuario, NUNCA se utilizará Haiku en ningún contexto. Solo Sonnet y Opus.

### Fase 2: Selección de Agentes y Formación de Teams

Consultar `references/agent-registry.md` para la lista completa. Reglas:

**Selección:**
- Cada archivo tiene UN solo agente owner → no hay duplicación
- Si una tarea cruza zonas → se necesitan múltiples agentes
- Si la tarea es cross-cutting → considerar XX-agents (orquestador, auditor, etc.)

**Formación de Agent Teams:**
Un "team" es un grupo de agentes que trabajan en paralelo en la misma fase.

```
Fase 1: [IF-01]                    ← Dependencia base (secuencial)
Fase 2: [AS-01, AS-02]             ← Team paralelo (auth)
Fase 3: [QZ-01, SM-01, FC-01]     ← Team paralelo (features independientes)
Fase 4: [XX-02]                    ← Quality Gate (secuencial)
```

**Reglas de paralelización:**
- Máximo 20 agentes simultáneos (configurado en el sistema)
- Solo se paralelizan agentes SIN dependencias mutuas
- El Quality Gate (XX-02) SIEMPRE es secuencial después de cada fase

### Fase 3: Selección de Prácticas de Ingeniería

**NUEVA FASE — leer `references/engineering-practices.md` para el detalle completo.**

Antes de escribir los prompts, identificar qué prácticas de ingeniería aplican. Consultar la **Matriz de Aplicación** en `references/engineering-practices.md`:

| Tipo de tarea | Testing | ADR | Code Review | Debug | Docs |
|---------------|---------|-----|-------------|-------|------|
| Feature nueva (backend) | unit + integration | Si hay decisión | Siempre | Si falla | endpoints + lógica |
| Feature nueva (frontend) | component + interaction | Rara vez | Siempre | Si falla | props + componente |
| Hotfix | test de regresión | No | Reducido | Siempre | inline comment |
| Refactor | tests existentes pasan | Si cambia arq. | Siempre | Si falla | actualizar docs |
| Migración DB | integration test | Siempre | Siempre | Si falla | SQL comments |
| Cambio cross-cutting | todos los tests afectados | Usualmente | Siempre | Si falla | README update |

**Regla clave:** Solo incluye en el prompt los bloques de las prácticas que aplican. Un hotfix no necesita `<architecture_decisions>`. Una migración sí necesita `<testing_strategy>` + `<documentation_requirements>`. Mantén el prompt lean.

Los bloques XML disponibles para inyectar son:
- `<testing_strategy>` — Qué testear, a qué nivel, qué no testear
- `<architecture_decisions>` — Cuándo y cómo documentar ADRs (solo para XX-01 o decisiones multi-dominio)
- `<code_review_dimensions>` — Dimensiones expandidas para el Quality Gate (seguridad, performance, correctness, maintainability)
- `<debug_protocol>` — Protocolo RIDE (Reproduce → Isolate → Diagnose → Execute fix)
- `<documentation_requirements>` — Qué documentar según tipo de cambio

### Fase 4: Generación de Prompts

Para cada agente seleccionado, generar un prompt siguiendo el **Axon Prompt Pattern**. Leer `references/patterns/axon-prompt-pattern.md` para el template completo.

**Estructura base de todo prompt Axon:**

```xml
<system>
Eres {nombre_agente} ({ID}). Tu rol: {descripción del rol}.

<mandatory_reads>
1. CLAUDE.md (raíz del proyecto)
2. .claude/agents/{nombre}.md (tu definición completa)
3. .claude/agent-memory-seed/individual/{ID}-{nombre}.md (tu memoria)
4. .claude/agent-memory-seed/{seccion}.md (memoria de tu dominio)
5. .claude/memory/feedback_agent_isolation.md (reglas de aislamiento)
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar estos archivos:
{lista_explícita_de_archivos}
Cualquier cambio fuera de esta zona será RECHAZADO por el Quality Gate.
</isolation_zone>

<conventions>
{reglas de código específicas del dominio}
</conventions>
</system>

<task>
<objective>{qué debe lograr}</objective>
<context>{por qué es necesario, qué problema resuelve}</context>
<acceptance_criteria>
{criterios verificables de éxito}
</acceptance_criteria>
<dependencies>
{qué debe estar listo antes, outputs de otros agentes que necesita}
</dependencies>
<output_format>
{qué debe entregar: archivos, tests, documentación}
</output_format>
</task>

<!-- PRÁCTICAS DE INGENIERÍA: incluir solo las que aplican según Fase 3 -->
{<testing_strategy>...</testing_strategy> si aplica}
{<debug_protocol>...</debug_protocol> si aplica}
{<documentation_requirements>...</documentation_requirements> si aplica}
{<architecture_decisions>...</architecture_decisions> solo para XX-01}
{<code_review_dimensions>...</code_review_dimensions> solo para XX-02}

<examples>
{1-3 ejemplos de outputs esperados si aplica}
</examples>

<post_session_memory>
ANTES de reportar resultados, sigue el protocolo de AGENT-MEMORY-PROTOCOL.md:

1. Lee tu memoria actual en .claude/agent-memory/individual/{ID}-{nombre}.md

2. SIEMPRE append el session log (es un registro, no una lección):
   ## Session — {fecha}
   - **Task:** {descripción breve}
   - **Files touched:** {archivos modificados}

3. SOLO SI aprendiste algo genuinamente nuevo y reusable, agrega:
   - **Learned:** {qué descubriste que no sabías}
   - **Pattern:** {patrón útil, si aplica}
   - **Mistake:** {error y corrección, si aplica}

   Pregúntate: ¿Descubrí algo sobre el código que no sabía antes?
   ¿Casi cometí un error? ¿Tomé una decisión técnica entre 2+ opciones?
   Si la respuesta es NO a todo → no escribas lecciones. Una sesión sin
   lecciones es perfectamente válida.

4. NO inventes lecciones si no aprendiste nada real. Un agente que registra
   1 patrón genuino por sesión es mejor que uno que infla 10 lecciones vacías.
   La evolución viene de saber más, no de documentar más.

5. Actualiza métricas: incrementa sessions, QG pass/fail.

6. Reporta resultados.
</post_session_memory>

<escalation>
Si encuentras alguna de estas situaciones, DETENTE y reporta al Arquitecto (XX-01):
- Necesitas modificar archivos fuera de tu zona
- Hay conflicto con la especificación de otro agente
- La tarea requiere decisión arquitectónica no documentada
</escalation>
```

### Fase 4b: Decisión de Aislamiento (Worktree vs Directo)

**Problema real:** Cuando los agentes corren en worktrees temporales (`isolation: "worktree"`), la memoria se pierde al destruir el worktree. Esto ya pasó en producción — agentes completaron su trabajo pero no persistieron sus lecciones.

**Regla de decisión:**

| Situación | Modo | Razón |
|-----------|------|-------|
| Agentes tocan archivos DIFERENTES | **Directo** (sin worktree) | No hay conflictos. La memoria se escribe en el repo real. |
| Agentes tocan los MISMOS archivos | **Worktree** | Necesitan aislamiento para evitar conflictos de merge. |
| Un solo agente | **Directo** siempre | No hay riesgo de conflicto. |
| Duda sobre solapamiento | **Worktree** + commit de memoria pre-destrucción | Seguridad ante todo. |

**Cuando SÍ se usa worktree, el prompt DEBE incluir:**
```xml
<worktree_memory_protocol>
Antes de que tu worktree sea destruido:
1. Escribe tu memoria en .claude/agent-memory/individual/{ID}-{nombre}.md
2. Haz commit de tu memoria: git add .claude/agent-memory/individual/{ID}-{nombre}.md && git commit -m "chore: {ID} memory update"
3. Push tu branch de memoria al remote
De lo contrario, todo lo que aprendiste se pierde al destruir el worktree.
</worktree_memory_protocol>
```

**Preferencia del sistema Axon:** Ejecutar en modo **directo** siempre que sea posible. La memoria en GitHub es la fuente de verdad — si no se commitea, no existe.

### Fase 5: Calibración por Escala

El nivel de detalle del prompt CAMBIA según la cantidad de agentes:

**Micro (1-3 agentes):**
- Prompts completos con todo el contexto inline
- No necesita plan de fases
- Extended Thinking habilitado para razonamiento
- Prácticas de ingeniería inline en el prompt

**Medio (4-10 agentes):**
- Prompts modulares con contexto referenciado (no inline)
- Plan de fases explícito con dependencias
- Cada prompt incluye solo SU contexto + interfaces con vecinos
- Quality Gate después de cada fase
- Prácticas de ingeniería por referencia (`references/engineering-practices.md`)

**Macro (10+ agentes / 74 agent teams):**
- El Arquitecto (XX-01) recibe el plan maestro + `<architecture_decisions>`
- El Arquitecto genera los prompts individuales con las prácticas apropiadas
- Ejecución por oleadas (waves) con checkpoints
- Memory compaction entre oleadas
- Post-mortem automático con métricas

**Template para escala Macro:**
```xml
<system>
Eres el Arquitecto (XX-01). Tu rol: descomponer objetivos complejos en planes
de ejecución multi-agente para el sistema Axon.
</system>

<task>
<objective>{objetivo del usuario}</objective>
<constraints>
- Máximo 20 agentes paralelos por oleada
- Respetar grafo de dependencias (ver AGENT-REGISTRY.md)
- Cada agente solo modifica su zona
- Quality Gate (XX-02) después de cada oleada
</constraints>
<deliverable>
1. Lista de agentes necesarios con justificación
2. Plan de fases con dependencias
3. Prompt individual para cada agente (con prácticas de ingeniería según Fase 3)
4. Criterios de éxito por fase
5. Rollback plan si algún agente falla
6. ADR si hay decisiones arquitectónicas pendientes
</deliverable>
</task>

<architecture_decisions>
{bloque de ADR — ver references/engineering-practices.md}
</architecture_decisions>
```

### Fase 6: Optimización Claude Opus 2026

Leer `references/patterns/claude-opus-2026.md` para el detalle completo. Resumen:

1. **XML Tags** obligatorio — toda estructura usa `<tag>contenido</tag>`
2. **4-Block Pattern** — `INSTRUCTIONS → CONTEXT → TASK → OUTPUT FORMAT`, documentos largos al inicio
3. **Extended Thinking** para tareas Opus — NO usar Chain-of-Thought manual
4. **Tono** directo y amable — explicar razones, no imponer reglas
5. **Prefilling** para guiar formato de respuesta
6. **Few-Shot Examples** (2-3) cuando la tarea tiene formato específico
7. **Anti over-engineering** — `<constraint>Implementa la solución más simple que cumpla los criterios.</constraint>`

### Fase 7: Validación

Antes de entregar los prompts, verificar:

**Orquestación:**
- [ ] ¿Cada prompt tiene zona de aislamiento explícita?
- [ ] ¿Las dependencias entre agentes están resueltas en el orden de fases?
- [ ] ¿Ningún agente modifica archivos fuera de su zona?
- [ ] ¿Los mandatory reads están incluidos?
- [ ] ¿El plan total respeta max 20 agentes paralelos?

**Calidad de Prompt:**
- [ ] ¿Los criterios de aceptación son verificables por el Quality Gate?
- [ ] ¿El modelo asignado (Sonnet/Opus) es apropiado para la complejidad?
- [ ] ¿Se usa XML tags + 4-Block Pattern?
- [ ] ¿El tono es directo sin ser agresivo?
- [ ] ¿Hay escalation criteria para cada agente?

**Memoria:**
- [ ] ¿Cada prompt incluye `<post_session_memory>`?
- [ ] ¿Se decidió worktree vs directo?
- [ ] Si usa worktree, ¿incluye `<worktree_memory_protocol>`?

**Prácticas de Ingeniería:**
- [ ] ¿Se consultó la Matriz de Aplicación (Fase 3) para seleccionar prácticas?
- [ ] ¿Los agentes backend incluyen `<testing_strategy>` con tests apropiados?
- [ ] ¿Los agentes frontend incluyen `<testing_strategy>` con component tests?
- [ ] ¿El Quality Gate (XX-02) incluye `<code_review_dimensions>`?
- [ ] ¿El Arquitecto (XX-01) incluye `<architecture_decisions>` si hay decisiones?
- [ ] ¿Cada agente incluye `<debug_protocol>` para auto-resolución de errores?
- [ ] ¿Los agentes incluyen `<documentation_requirements>` según tipo de cambio?
- [ ] ¿Los prompts NO incluyen prácticas que no aplican? (lean, no inflado)

---

## Output Format

### Para plan Micro (1-3 agentes):

```json
{
  "plan": {
    "objective": "...",
    "scale": "micro",
    "model": "opus|sonnet",
    "agents": ["ID-nombre"],
    "engineering_practices": ["testing", "debug"]
  },
  "prompts": [
    {
      "agent_id": "QZ-01",
      "agent_name": "quiz-backend",
      "model": "sonnet",
      "system_prompt": "...",
      "task_prompt": "...",
      "engineering_blocks": ["testing_strategy", "debug_protocol", "documentation_requirements"],
      "expected_output": ["archivos a crear/modificar"],
      "depends_on": []
    }
  ]
}
```

### Para plan Medio/Macro:

Mismo formato que Micro, pero con `phases[]` en lugar de `prompts[]`. Cada fase incluye: `phase`, `name`, `type` (sequential|parallel_team), `agents[]` (mismo formato que arriba con `engineering_blocks`), `quality_gate: true`, `quality_gate_dimensions[]`, y `success_criteria[]`. El plan incluye además: `rollback_plan`, `adrs_needed[]`, `total_estimated_tokens`, `total_estimated_cost`.

---

## Patrones Especiales

### Patrón: Feature Nueva End-to-End

Para features que tocan backend + frontend + tests, ahora con prácticas integradas:

```
Fase 1: IF-01 (migración DB si necesario)
         → <testing_strategy> integration test de migración
         → <documentation_requirements> SQL comments

Fase 2: {DOMAIN}-backend (API endpoints)
         → <testing_strategy> unit + integration tests
         → <debug_protocol> auto-resolución de errores
         → <documentation_requirements> JSDoc en endpoints

Fase 3: {DOMAIN}-frontend (UI components)
         → <testing_strategy> component + interaction tests
         → <debug_protocol> auto-resolución de errores
         → <documentation_requirements> typed props

Fase 4: {DOMAIN}-tests (test coverage completo)
         → Ownership de toda la suite de tests del dominio

Fase 5: XX-02 (quality gate completo)
         → <code_review_dimensions> security + performance + correctness + maintainability
```

### Patrón: Hotfix Urgente

```
Fase 1: {AGENT-owner} del archivo con el bug
         → <debug_protocol> (este patrón ES debugging)
         → <testing_strategy> test de regresión obligatorio
         → Skip <architecture_decisions> y <documentation_requirements> extensiva

Fase 2: XX-02 (quality gate reducido)
         → Solo zone compliance + tests + security check
```

### Patrón: Cambio Cross-Cutting

1. XX-03 (code-standards) identifica todos los archivos afectados
2. Mapea archivo → agente owner
3. Genera prompt para cada agente con el cambio específico en su zona + `<testing_strategy>` (todos los tests afectados deben pasar)
4. Los agentes ejecutan en paralelo
5. XX-02 (quality-gate) con `<code_review_dimensions>` completas

---

## Anti-patrones (qué NO hacer)

1. **"Prompt dump"** — volcar todo el contexto del proyecto en cada prompt
2. **"Agent spam"** — involucrar agentes que no necesitan participar
3. **"Dependency ignore"** — ejecutar agentes sin respetar el grafo de dependencias
4. **"Manual CoT"** — agregar "piensa paso a paso" en prompts para Claude Opus
5. **"Zone violation"** — generar prompts que pidan a un agente modificar archivos fuera de su zona
6. **"Over-specification"** — dictar la implementación exacta en lugar de los criterios de aceptación
7. **"Memory amnesia"** — generar prompts sin `<post_session_memory>`
8. **"Worktree sin memoria"** — usar worktree sin `<worktree_memory_protocol>`
9. **"Lesson inflation"** — forzar al agente a escribir lecciones cuando no aprendió nada
10. **"Engineering blanket"** — incluir TODOS los bloques de prácticas de ingeniería en TODOS los prompts. Cada agente recibe solo las prácticas relevantes según la Matriz de Aplicación. Un prompt inflado con prácticas irrelevantes distrae al agente y desperdicia tokens.
11. **"Test afterthought"** — dejar los tests como "algo que se hace al final si queda tiempo". Los tests se piensan ANTES de implementar (qué necesita ser verificable) y se escriben como parte del entregable del agente, no como fase separada opcional.
12. **"Undocumented decision"** — tomar decisiones arquitectónicas sin ADR. Si un agente elige entre 2+ opciones técnicas y esa elección afecta a otros dominios, necesita un ADR. De lo contrario, el próximo agente que toque ese código no sabrá por qué se hizo así.

---

## Referencia Rápida de Archivos

| Archivo | Propósito |
|---------|-----------|
| `references/agent-registry.md` | Índice completo de los 74 agentes con zonas y dependencias |
| `references/engineering-practices.md` | **Prácticas de ingeniería: testing, ADRs, code review, debug, docs** |
| `references/patterns/axon-prompt-pattern.md` | Template detallado del prompt pattern |
| `references/patterns/team-patterns.md` | Patrones de agent teams por caso de uso |
| `references/templates/micro.md` | Template para planes de 1-3 agentes |
| `references/templates/medio.md` | Template para planes de 4-10 agentes |
| `references/templates/macro.md` | Template para planes de 10+ agentes (Arquitecto) |
| `references/examples/feature-example.md` | Ejemplo completo: nueva feature end-to-end |
| `references/examples/hotfix-example.md` | Ejemplo completo: hotfix urgente |
| `references/examples/cross-cutting-example.md` | Ejemplo completo: cambio cross-cutting |

Leer el archivo de referencia relevante según el tipo de plan antes de generar los prompts.
