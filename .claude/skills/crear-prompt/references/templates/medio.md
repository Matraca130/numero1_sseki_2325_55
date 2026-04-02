# Template Medio: Planes de 4-10 Agentes, 2-4 Dominios

Para planes de **complejidad moderada**: features end-to-end, cambios multi-dominio, refactores.

---

## 1. Checklist de Análisis

Responde antes de generar:

- [ ] ¿Objetivo es multi-fase? (ej: DB + Backend + Frontend)
- [ ] ¿Involucra 4-10 agentes?
- [ ] ¿Abarca 2-4 dominios diferentes?
- [ ] ¿Hay dependencias entre fases?
- [ ] ¿Cada fase tiene criterios verificables?

Si necesitas **10+ agentes** → Escala a **MACRO** (Arquitecto).

---

## 2. Template: Plan de Fases General

```markdown
# Plan de Ejecución: {título_del_objetivo}

## Resumen
- **Objetivo:** {qué se logra al final}
- **Dominios afectados:** {dominio1, dominio2, ...}
- **Agentes totales:** {N}
- **Fases:** {número}
- **Costo estimado:** ~${monto}

---

## Fase 1: {Nombre de Fase}
**Tipo:** sequential | parallel_team
**Descripción:** {qué ocurre en esta fase}

### Agentes:
| ID | Nombre | Modelo | Archivos | Duración |
|---|---|---|---|---|
| {ID-XX} | {nombre} | {opus\|sonnet} | {lista corta} | {est. min} |

REGLA: NUNCA usar Haiku. El mínimo modelo es Sonnet.

### Dependencias de entrada:
- {dato/archivo del usuario o de fase anterior}

### Success Criteria:
- [ ] {criterio 1 verificable}
- [ ] {criterio 2 verificable}

### Quality Gate:
- Auditar: zone compliance, TypeScript, tests
- Escalation: {si hay problemas qué ocurre}

---

## Fase 2: {Nombre de Fase}
[similar estructura]

---

## Plan de Rollback
Si algún agente falla en Fase X:
1. Revertir rama a main
2. Registrar lección en AGENT-METRICS.md
3. {pasos específicos}
4. Re-ejecutar desde Fase Y (no todo de nuevo)

---

## Costo Total Estimado
{desglose por fase, por agente}
```

---

## 3. Template: Formación de Agent Teams por Fase

```markdown
### Fase {N}: {Nombre}
**Paralelización:** {Sí | No}
**Max simultáneamente:** {número ≤ 20}

#### Team 1 (Paralelo)
- {Agent A}
- {Agent B}
- {Agent C}
(Sin dependencias mutuas)

#### Team 2 (Paralelo, después Team 1)
- {Agent D}
- {Agent E}

#### Sequential (después todos los parallels)
- {Agent F} (integración)
```

**Regla:** Solo paralelizar agentes sin dependencias mutuas.

---

## 4. Template: Prompt por Agente (con Dependencias)

```xml
Actúa como {nombre_agente} ({ID}). Lee tu definición en .claude/agents/{nombre_agente}.md
y tu memoria en .claude/agent-memory-seed/individual/{ID}-{nombre_agente}.md.

## MANDATORY READS
1. Lee CLAUDE.md
2. Lee .claude/memory/feedback_agent_isolation.md
3. Lee .claude/agent-memory-seed/{dominio}.md
4. Lee .claude/agent-memory-seed/individual/{ID}-{nombre_agente}.md

## CONTEXTO DE FASE
**Fase {N}:** {nombre de fase}
**Plan general:** [link o resumen]

## DEPENDENCIAS RESUELTAS
Los siguientes agentes ya completaron su trabajo:
| Agent | Output |
|-------|--------|
| {Agent A} | Creó: {archivos a leer desde main} |
| {Agent B} | Modificó: {archivos ahora en main} |

Lees estos cambios desde main (ya mergeados). NO necesitas coordinar con ellos ahora.

## ISOLATION RULES
SOLO modificas:
{lista_explícita_de_archivos}

Workflow:
1. git pull origin main (incluye cambios de fases previas)
2. git checkout -b {rama} main
3. Implementa SOLO en archivos asignados
4. git diff main..<rama> --stat → verifica solo tus archivos

## TAREA
**Objetivo en esta fase:** {qué específicamente haces TÚ}

**Contexto:** {cómo tu trabajo se integra con el resto}

**Entrada (qué disponible):**
- Archivos creados por {Agent X}: {lista}
- Endpoints disponibles: {list}
- Schema actual: {referencia}

**Criterios de Aceptación:**
- [ ] {verificable 1}
- [ ] {verificable 2}
- [ ] {tests incluidos}

**Output esperado:**
{archivos a crear/modificar}

## ESCALATION
Si encuentras:
- Necesidad de modificar zona de {otro agente}
- Conflicto con especificación de {agente X}
- Cambio arquitectónico no documentado
→ DETENTE y reporta al Arquitecto (XX-01)
```

---

## 5. Template: Quality Gate entre Fases

Después de que completan TODOS los agentes de una fase:

```markdown
## Quality Gate: Fase {N}

### Checklist (6 Checks)

#### 1. Zone Compliance
- [ ] {Agent A}: ¿Solo archivos asignados?
- [ ] {Agent B}: ¿Solo archivos asignados?
- [ ] {Agent C}: ¿Solo archivos asignados?

#### 2. TypeScript
- [ ] Sin errores de compilación
- [ ] Sin `any` types (excepto necesarios)
- [ ] Sin console.log
- [ ] Tipos explícitos en interfaces

#### 3. Spec Coherence
- [ ] Parámetros de endpoints coinciden con spec
- [ ] Response shapes coinciden
- [ ] Enums/constants coinciden (ej: BKT P_LEARN=0.18)
- [ ] No hay cambios en contrato público

#### 4. Tests
- [ ] Happy path testado
- [ ] Error cases testados
- [ ] Coverage >70%
- [ ] Todos los tests pasan

#### 5. Git Hygiene
- [ ] Commit messages descriptivos
- [ ] Sin secretos (API keys, passwords)
- [ ] No hay merge conflicts
- [ ] Rama limpia desde main

#### 6. Backward Compatibility
- [ ] No se removieron exports públicos
- [ ] No se cambiaron tipos de forma incompatible
- [ ] Migraciones DB (si aplican) son forward/backward compatible

### Veredicto
- ✅ **APPROVE** → Mergear inmediatamente
- 🔧 **NEEDS FIX** → {lista de fixes, re-ejecutar agentes}
- 🚫 **BLOCK** → {explicación, no mergear}

### Learning Loop (si NEEDS FIX o BLOCK)
1. Registrar lección en agent-memory/individual/{ID}-{nombre}.md
2. Agregar a AGENT-METRICS.md Error Ledger
3. Si se repite 2+ veces → actualizar agent definition

### Aprobación para Fase Siguiente
Una vez todos los agentes aprueban QG:
1. Mergear todas las ramas de esta fase a main
2. Rebasar ramas de siguiente fase sobre nuevo main
3. Iniciar siguiente fase
```

---

## 6. Template: Resolución de Dependencias

Para cada agente, mapear:

```markdown
### Tabla de Dependencias

| Agent | Depende de | Input | Output | Orden |
|-------|-----------|-------|--------|-------|
| {A} | (nada) | usuario | {archivos} | 1 |
| {B} | {A} | {output de A} | {archivos} | 2 |
| {C} | {A} | {output de A} | {archivos} | 2 |
| {D} | {B, C} | {outputs de B,C} | {archivos} | 3 |

**Orden de ejecución:**
1. {A} (secuencial, bloquea)
2. {B}, {C} (paralelo, sin dependencias mutuas)
3. {D} (secuencial, espera ambos)
```

**Regla crítica:** Si X depende de Y, Y debe completar + pasar QG antes de que X inicie.

---

## 7. Template: Dependencia Checklist

```markdown
### Checklist de Resolución

#### Fase 1 (If-01, AS-01 típicamente)
- [ ] ¿Base de datos actualizada?
- [ ] ¿Migraciones aplicadas?
- [ ] ¿Infra core disponible?

#### Fase 2 (Backend, Auth)
- [ ] ¿Fase 1 aprobada por QG?
- [ ] ¿Main actualizado con cambios de Fase 1?
- [ ] ¿Nuevos endpoints disponibles?

#### Fase 3 (Frontend)
- [ ] ¿Fase 2 aprobada por QG?
- [ ] ¿APIs están disponibles en main?
- [ ] ¿Types desde backend descargados?

#### Fase 4 (Tests, Integración)
- [ ] ¿Todas las fases anteriores aprobadas?
- [ ] ¿Sistema funciona end-to-end?
```

---

## 8. Template: Costo Estimación Medio

```
Total Agents: {N}
Total Phases: {M}
Parallelization Factor: {0.6-0.9}

Por Agente:
- {A}: {K tokens} @ {model} = ${costo}
- {B}: {K tokens} @ {model} = ${costo}
...

Subtotal: ${sum}
QG Overhead (5% per phase): ${qg}
Rollback margin (10%): ${rollback}

TOTAL ESTIMADO: ${total}
```

---

## 9. Anti-patrones Medio

**NO hagas:**
1. Ejecutar agentes sin resolver dependencias → merge conflicts
2. Paralelizar agentes que sí tienen dependencias
3. Saltarse QG entre fases → errores acumulados
4. Enviar más de 20 agentes simultáneamente → system overload
5. Cambiar spec mid-phase → confunde agentes posteriores

---

## 10. Ejemplo Completo: Medio (Feature End-to-End)

**Objetivo:** Agregar sistema de "favorites" a quizzes

### Plan
```
Fase 1: Database Schema
- Agent: IF-04 (infra-database)
- Output: Migration SQL

Fase 2: Backend API (paralelo)
- Agents: QZ-02 (quiz-backend)
- Output: GET/POST/DELETE /quiz/{id}/favorite endpoints

Fase 3: Frontend UI (paralelo)
- Agents: QZ-01 (quiz-frontend)
- Output: Favorite button component + hook

Fase 4: Integration Tests
- Agents: QZ-03 (quiz-tester)
- Output: E2E tests

Fase 5: Quality Gate Completo
- Agente: XX-02 (quality-gate)
- Output: APPROVE o NEEDS FIX
```

**Costo estimado:** ~$3.50

---

## 11. Referencia Rápida: Dominios → Agentes Medio

Para planes Medio típico, equipos frecuentes:

```
DB + API + UI = 3 agentes:
- IF-04 (DB schema)
- QZ-02 (API routes)
- QZ-01 (UI components)

Multi-dominio (ej: Quiz + Study + Dashboard):
- QZ-02 + ST-02 + DG-01
- Necesita coordinar output shapes
- QG más estricto
```

---

## Fin del Template Medio

Usa este para planes con múltiples fases, múltiples dominios, features completas.
