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

Cada prompt generado respeta: las zonas de ownership de los agentes, sus dependencias, el sistema de memoria de 3 capas, y las 6 verificaciones del Quality Gate.

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

## Las 6 Fases de Generación

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

### Fase 3: Generación de Prompts

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

### Fase 3b: Decisión de Aislamiento (Worktree vs Directo)

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

### Fase 4: Calibración por Escala

El nivel de detalle del prompt CAMBIA según la cantidad de agentes:

**Micro (1-3 agentes):**
- Prompts completos con todo el contexto inline
- No necesita plan de fases
- Extended Thinking habilitado para razonamiento

**Medio (4-10 agentes):**
- Prompts modulares con contexto referenciado (no inline)
- Plan de fases explícito con dependencias
- Cada prompt incluye solo SU contexto + interfaces con vecinos
- Quality Gate después de cada fase

**Macro (10+ agentes / 74 agent teams):**
- El Arquitecto (XX-01) recibe el plan maestro
- El Arquitecto genera los prompts individuales
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
3. Prompt individual para cada agente
4. Criterios de éxito por fase
5. Rollback plan si algún agente falla
</deliverable>
</task>
```

### Fase 5: Optimización Claude Opus 2026

Aplicar estas optimizaciones específicas para Claude Opus 4.6:

**1. XML Tags (OBLIGATORIO)**
Claude Opus procesa mejor con tags XML. Toda estructura debe usar `<tag>contenido</tag>`.

**2. 4-Block Pattern de Anthropic**
```
INSTRUCTIONS → CONTEXT → TASK → OUTPUT FORMAT
```
Siempre en este orden. Documentos largos al INICIO del prompt, query al FINAL.

**3. Extended Thinking**
- Para tareas Opus que requieren razonamiento → habilitar Extended Thinking
- NO usar Chain-of-Thought manual (Claude lo hace nativamente)
- Configurar budget de thinking tokens según complejidad

**4. Tono y estilo**
- Directo y amable, nunca agresivo
- "YOU MUST" → causa over-triggering, usar explicaciones del "por qué"
- Explicar razones detrás de restricciones, no solo imponer reglas

**5. Prefilling**
Para guiar formato de respuesta, usar prefill del assistant:
```json
{"role": "assistant", "content": "## Plan de Ejecución\n\n### Fase 1:"}
```

**6. Few-Shot Examples**
Incluir 2-3 ejemplos en `<examples>` cuando la tarea tiene formato específico.

**7. Anti over-engineering**
Claude Opus tiende a crear abstracciones innecesarias. Agregar:
```xml
<constraint>Implementa la solución más simple que cumpla los criterios.
No crees abstracciones adicionales a menos que se soliciten explícitamente.</constraint>
```

### Fase 6: Validación

Antes de entregar los prompts, verificar:

- [ ] ¿Cada prompt tiene zona de aislamiento explícita?
- [ ] ¿Las dependencias entre agentes están resueltas en el orden de fases?
- [ ] ¿Ningún agente modifica archivos fuera de su zona?
- [ ] ¿Los mandatory reads están incluidos?
- [ ] ¿Los criterios de aceptación son verificables por el Quality Gate?
- [ ] ¿El modelo asignado (Sonnet/Opus) es apropiado para la complejidad?
- [ ] ¿Se usa XML tags + 4-Block Pattern?
- [ ] ¿El tono es directo sin ser agresivo?
- [ ] ¿Hay escalation criteria para cada agente?
- [ ] ¿El plan total respeta max 20 agentes paralelos?
- [ ] **¿Cada prompt incluye `<post_session_memory>`?** (CRÍTICO — sin esto ni el session log se escribe. El bloque permite que el agente decida si hay lecciones o no)
- [ ] **¿Se decidió worktree vs directo?** (directo preferido si no hay solapamiento de archivos)
- [ ] **Si usa worktree, ¿incluye `<worktree_memory_protocol>`?** (commit + push de memoria antes de destruir)

---

## Output Format

### Para plan Micro (1-3 agentes):

```json
{
  "plan": {
    "objective": "...",
    "scale": "micro",
    "model": "opus|sonnet",
    "agents": ["ID-nombre"]
  },
  "prompts": [
    {
      "agent_id": "QZ-01",
      "agent_name": "quiz-backend",
      "model": "sonnet",
      "system_prompt": "...",
      "task_prompt": "...",
      "expected_output": ["archivos a crear/modificar"],
      "depends_on": []
    }
  ]
}
```

### Para plan Medio/Macro:

```json
{
  "plan": {
    "objective": "...",
    "scale": "medio|macro",
    "total_agents": 12,
    "total_phases": 4,
    "estimated_cost": "~$X.XX"
  },
  "phases": [
    {
      "phase": 1,
      "name": "Infraestructura Base",
      "type": "sequential",
      "agents": [
        {
          "agent_id": "IF-01",
          "agent_name": "infra-plumbing",
          "model": "sonnet",
          "system_prompt": "...",
          "task_prompt": "...",
          "expected_output": ["..."],
          "depends_on": []
        }
      ],
      "quality_gate": true,
      "success_criteria": ["..."]
    },
    {
      "phase": 2,
      "name": "Auth Layer",
      "type": "parallel_team",
      "max_parallel": 2,
      "agents": [
        { "agent_id": "AS-01", "..." : "..." },
        { "agent_id": "AS-02", "..." : "..." }
      ],
      "quality_gate": true,
      "success_criteria": ["..."]
    }
  ],
  "rollback_plan": "...",
  "total_estimated_tokens": "...",
  "total_estimated_cost": "$..."
}
```

---

## Patrones Especiales

### Patrón: Cambio Cross-Cutting

Cuando un cambio afecta múltiples dominios (ej: renombrar un tipo compartido):

1. XX-03 (code-standards) identifica todos los archivos afectados
2. Mapea archivo → agente owner
3. Genera prompt para cada agente con el cambio específico en su zona
4. Los agentes ejecutan en paralelo
5. XX-02 (quality-gate) verifica coherencia global

### Patrón: Feature Nueva End-to-End

Para features que tocan backend + frontend + tests:

```
Fase 1: IF-01 (migración DB si necesario)
Fase 2: {DOMAIN}-backend (API endpoints)
Fase 3: {DOMAIN}-frontend (UI components)
Fase 4: {DOMAIN}-tests (test coverage)
Fase 5: XX-02 (quality gate completo)
```

### Patrón: Hotfix Urgente

Para correcciones críticas que no pueden esperar el flujo completo:

1. Identificar el agente owner del archivo con el bug
2. Generar prompt con contexto mínimo + fix específico
3. Skip fase de planificación del Arquitecto
4. Quality Gate reducido (solo zone compliance + tests)

---

## Anti-patrones (qué NO hacer)

1. **"Prompt dump"** — volcar todo el contexto del proyecto en cada prompt. Cada agente solo necesita SU contexto.
2. **"Agent spam"** — involucrar agentes que no necesitan participar. Si un archivo no cambia, su agente no participa.
3. **"Dependency ignore"** — ejecutar agentes sin respetar el grafo de dependencias. Causa merge conflicts.
4. **"Manual CoT"** — agregar "piensa paso a paso" en prompts para Claude Opus. Extended Thinking lo hace nativamente.
5. **"Zone violation"** — generar prompts que pidan a un agente modificar archivos fuera de su zona. El Quality Gate lo rechazará.
6. **"Over-specification"** — dictar la implementación exacta en lugar de los criterios de aceptación. Los agentes saben cómo implementar en su dominio.
7. **"Memory amnesia"** — generar prompts sin `<post_session_memory>`. El agente completa su tarea pero no registra ni el session log. En la siguiente sesión repite los mismos errores. Ya ocurrió en producción y es el anti-patrón más costoso a largo plazo.
8. **"Worktree sin memoria"** — usar `isolation: "worktree"` sin incluir `<worktree_memory_protocol>`. Al destruir el worktree, la memoria se evapora. El agente DEBE commitear su memoria antes de terminar.
9. **"Lesson inflation"** — forzar al agente a escribir lecciones cuando no aprendió nada nuevo. Genera ruido que diluye las lecciones reales. El session log (Task + Files touched) siempre se escribe, pero las lecciones (Learned/Pattern/Mistake) solo cuando son genuinamente nuevas y reusables. Una sesión sin lecciones es perfectamente válida.

---

## Referencia Rápida de Archivos

| Archivo | Propósito |
|---------|-----------|
| `references/agent-registry.md` | Índice completo de los 74 agentes con zonas y dependencias |
| `references/patterns/axon-prompt-pattern.md` | Template detallado del prompt pattern |
| `references/patterns/team-patterns.md` | Patrones de agent teams por caso de uso |
| `references/templates/micro.md` | Template para planes de 1-3 agentes |
| `references/templates/medio.md` | Template para planes de 4-10 agentes |
| `references/templates/macro.md` | Template para planes de 10+ agentes (Arquitecto) |
| `references/examples/feature-example.md` | Ejemplo completo: nueva feature end-to-end |
| `references/examples/hotfix-example.md` | Ejemplo completo: hotfix urgente |
| `references/examples/cross-cutting-example.md` | Ejemplo completo: cambio cross-cutting |

Leer el archivo de referencia relevante según el tipo de plan antes de generar los prompts.
