# Template Macro: Planes de 10+ Agentes, 5+ Dominios

Para planes de **máxima complejidad**: refactores mayores, migraciones de arquitectura, features complejas multi-disciplina.
**Orquestado por el Arquitecto (XX-01).**

---

## 1. Cuándo Usar Macro

Escala a Macro si:

- [ ] **10+ agentes** involucrados
- [ ] **5+ dominios** afectados
- [ ] **Múltiples olas de ejecución** necesarias (> 4 fases)
- [ ] **Memory compaction** entre olas (reescribir contexto)
- [ ] **Rollback plan** detallado necesario
- [ ] **Post-mortem métricas** complejas

Si tienes dudas → Pregunta al Arquitecto primero.

---

## 2. Template: Master Plan del Arquitecto (XX-01)

```markdown
# Master Plan: {Título Objetivo}

**Arquitecto:** XX-01
**Fecha inicio:** {YYYY-MM-DD}
**Estimación:** {hours/days}
**Costo estimado:** ${total}

---

## Executive Summary

**Qué se logra:**
{descripción en 2-3 líneas del resultado final}

**Por qué es importante:**
{contexto: problema resuelto, oportunidad}

**Restricciones:**
- Max 20 agentes paralelos por onda
- Respetar grafo de dependencias
- Quality Gate después de cada onda
- Zero scope creep

---

## Análisis de Scope

### Dominios Afectados
| Dominio | Agentes | Razón |
|---------|---------|-------|
| {DOM1} | {A1, A2, A3} | {cambios específicos} |
| {DOM2} | {B1, B2} | {cambios específicos} |
| {DOM3} | {C1, C2, C3, C4} | {cambios específicos} |
| IF | {IF-01, IF-04} | {infra changes} |
| XX | {XX-02, XX-03} | {auditing, docs} |

**Total agentes: {N}**

### Dependencias Críticas

Diagrama simplificado:
```
IF-01, AS-01 (base)
  ↓
{Dom1}-backend, {Dom2}-backend
  ↓
{Dom1}-frontend, {Dom2}-frontend
  ↓
Tests, Integration
  ↓
Quality Gate
```

**Ruta crítica (secuencial):**
{lista de agentes en orden}

**Longest chain depth:** {N} niveles

---

## Olas de Ejecución

### Onda 1: Fundación
**Agentes paralelos:** {N}
**Duration:** ~{hours}h
**Agents:**
- {IF-01}: {descripción}
- {AS-01}: {descripción}
- {AS-02}: {descripción}

**Success criteria:**
- [ ] IF-01 aprobado por QG
- [ ] AS-01, AS-02 aprobados por QG
- [ ] Cero errores de zona
- [ ] Cero merge conflicts

---

### Onda 2: Backend Layer
**Deps:** Onda 1 completada + QG approved
**Agentes paralelos:** {N}
**Duration:** ~{hours}h
**Agents:**
- {DOM1-backend}: {descripción}
- {DOM2-backend}: {descripción}
- {DOM3-backend}: {descripción}

**Success criteria:**
- [ ] Todos endpoints creados
- [ ] Specs coinciden con contrato
- [ ] Tests >70% coverage

---

### Onda 3: Frontend Layer
**Deps:** Onda 2 completada + QG approved
**Agentes paralelos:** {N}
**Duration:** ~{hours}h
**Agents:**
- {DOM1-frontend}: {descripción}
- {DOM2-frontend}: {descripción}

**Success criteria:**
- [ ] Componentes integrados
- [ ] UI tests pasan
- [ ] Accesibilidad WCAG AA

---

### Onda 4: Testing + Integration
**Deps:** Onda 3 completada + QG approved
**Agentes:** {N}
**Agents:**
- {QA-agente}: {descripción}
- {XX-06}: test-orchestrator
- {XX-03}: docs-writer

---

### Onda 5: Final QG + Metrics
**Deps:** Onda 4 completada
**Agentes:** XX-02, Arquitecto

---

## Memory Compaction Entre Ondas

Después de cada onda:

```markdown
### Compaction: Onda {N} → Onda {N+1}

**Contexto a conservar:**
- {Decisión arquitectónica 1}
- {Lección aprendida 1}
- {Cambios críticos}

**Contexto a descartar:**
- {Detalles de Onda {N} ya merged}
- {Archivos temporales}

**Resumen para siguiente onda:**
- {1-2 líneas sobre estado actual}
- {dependencias resueltas}
- {próximos pasos}

**Tokens guardados:** ~{N}K / {total}K ({%})
```

---

## Rollback Plan

### Niveles de Rollback

#### Nivel 1: Agente Individual
Si un agente dentro de una onda falla QG:

```
1. NO mergear su rama
2. Registrar lección en AGENT-METRICS.md
3. Re-ejecutar ese agente desde main (que ya incluye otros de onda)
4. QG nuevamente
```

**Costo:** ~{min} minutos, ~${costo}

#### Nivel 2: Onda Completa
Si onda de 5+ agentes tiene >2 QG failures:

```
1. Revertir main a commit anterior a onda
2. Investigar root cause (dependencia perdida, spec mismatch)
3. Corregir spec o plan
4. Re-ejecutar onda completa
5. QG completo
```

**Costo:** ~{hours}h, ~${costo}

#### Nivel 3: Macro Completa
Si 3+ ondas acumulan errores (>10% failure rate):

```
1. Revertir main a estado pre-macro
2. Arquitecto reanaliza plan
3. Ajustar dependencias, specs, order
4. Re-ejecutar desde Onda 1
5. Post-mortem detallado
```

**Costo:** ~{hours}h, riesgo reputacional

### Escalation Triggers

Rollback automático si:
- 2+ agentes en onda fallan QG
- Merge conflict sin resolución clara
- Spec incoherencia detectada (XX-02)
- 3+ zona violations

---

## Quality Gate por Onda

Después de CADA onda, ejecutar XX-02 con:

```markdown
### Onda {N} Quality Gate Report

#### Summary
- Agentes ejecutados: {N}
- Archivos modificados: {M}
- QG pass rate: {%}
- Scope creep incidents: {N}

#### Per-Agent Verdict
| Agent | Zone | TS | Spec | Tests | Git | Compat | Final |
|-------|------|----|----|-------|-----|-------|-------|
| {A1} | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | NEEDS FIX |
| {A2} | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | APPROVE |

#### Lessons Registered
| Date | Agent | Issue | Prevention | Tracked |
|------|-------|-------|-----------|---------|
| {date} | {A1} | No tests for edge case | Always test error paths | AGENT-METRICS.md |

#### Approval for Next Wave
- [ ] All agents APPROVE or NEEDS FIX resolved
- [ ] Zero BLOCK verdicts
- [ ] Lessons registered where applicable
- [ ] Main branch stable + merged

→ Ready for Onda {N+1}? **SÍ / NO**
```

---

## Master Quality Gate (Final)

Después de todas las ondas:

```markdown
### Final Quality Gate: All Waves Complete

#### System Pulse
- Total agents executed: {N}
- Total files changed: {M}
- Total commits: {K}
- QG pass rate: {%}
- First-pass approval rate: {%}
- Zero scope creep: {SÍ/NO}

#### Per-Wave Summary
| Onda | Agents | Duration | Pass Rate | Issues |
|------|--------|----------|-----------|--------|
| 1 | {N} | {h}h | {%} | {N} |
| 2 | {N} | {h}h | {%} | {N} |
| 3 | {N} | {h}h | {%} | {N} |
| 4 | {N} | {h}h | {%} | {N} |
| 5 | {N} | {h}h | {%} | {N} |

**Total:** {total_agents} agents, {total_duration}h, {overall_pass_rate}%

#### Error Ledger Summary
| Category | Count | Examples |
|----------|-------|----------|
| Zone violations | {N} | {agent: description} |
| Missing tests | {N} | {agent: files} |
| Spec mismatches | {N} | {agent: issue} |
| Git hygiene | {N} | {agent: issue} |

#### Lessons Learned (Top 5)
1. {Lección 1 - prevención}
2. {Lección 2 - prevención}
3. {Lección 3 - prevención}
4. {Lección 4 - prevención}
5. {Lección 5 - prevención}

#### Agent Health Updates
- Updated AGENT-METRICS.md with:
  - Run count per agent
  - QG pass rate per agent
  - New lessons registered
  - Section health scores

→ **Final Verdict:** APPROVE / NEEDS FIXES / BLOCK
```

---

## Template: Prompt Arquitecto (XX-01)

```xml
Actúa como el Arquitecto (XX-01). Lee .claude/agents/architect.md.

## MANDATORY READS
1. .claude/AGENT-REGISTRY.md (índice de 74 agentes)
2. .claude/MULTI-AGENT-PROCEDURE.md (reglas orquestación)
3. .claude/memory/feedback_agent_isolation.md
4. .claude/agent-memory-seed/individual/AGENT-METRICS.md
5. Todos los agent definitions para agentes en plan

## REQUEST

{User's high-level objective}

## REQUIRED OUTPUT

Generar **Master Plan Completo**:

1. **Executive Summary**
   - Qué se logra
   - Por qué importante
   - Restricciones

2. **Scope Analysis**
   - Dominios afectados
   - Agentes seleccionados (con justificación)
   - Dependencias críticas
   - Dependency graph

3. **Wave Plan**
   - Onda 1: {descripción + agentes}
   - Onda 2: {descripción + agentes}
   - ...
   - Success criteria por onda
   - Duration estimado

4. **Memory Compaction Strategy**
   - Qué conservar entre ondas
   - Cómo resumir contexto

5. **Rollback Plan**
   - Nivel 1: Agente individual
   - Nivel 2: Onda completa
   - Nivel 3: Macro completa
   - Triggers automáticos

6. **Quality Gate Strategy**
   - QG checklist por onda
   - Final QG checklist
   - Escalation criteria

7. **Cost Estimation**
   - Por onda
   - Total estimado
   - Rollback margin

8. **Individual Prompts**
   - Uno por cada agente seleccionado
   - Con dependencias resueltas
   - Con isolation rules explícitas

9. **Post-Mortem Template**
   - Qué métricas recolectar
   - Cómo actualizar AGENT-METRICS.md
   - Report format

## CONSTRAINTS

- Max 20 agentes paralelos por onda
- Respetar dependencias: AGENT-REGISTRY.md
- Cada agente SOLO su zona
- Quality Gate después CADA onda
- Zero scope creep tolerance
```

---

## 3. Template: Post-Mortem Metrics

Después de completar Macro:

```markdown
# Post-Mortem: {Título Objetivo}

**Fecha inicio:** {YYYY-MM-DD}
**Fecha fin:** {YYYY-MM-DD}
**Duración total:** {hours}h

---

## Execution Summary

### By The Numbers
- **Agentes ejecutados:** {N} de {N} planeados ({%})
- **Archivos modificados:** {M} (scope: ±{%})
- **Líneas de código:** +{X} -{Y} (net: {Z})
- **Commits:** {K}
- **Branches merged:** {K}
- **Merge conflicts:** {N}

### Quality Metrics
| Métrica | Target | Actual | Status |
|---------|--------|--------|--------|
| QG pass rate | >75% | {%} | ✅/⚠️/❌ |
| First-pass approval | >70% | {%} | ✅/⚠️/❌ |
| Scope creep incidents | 0 | {N} | ✅/❌ |
| Zone violations | 0 | {N} | ✅/❌ |
| Repeat errors | 0 | {N} | ✅/⚠️ |

---

## What Went Well

1. {Éxito 1}
2. {Éxito 2}
3. {Éxito 3}

---

## What Could Improve

1. {Área 1 de mejora}
   - **Root cause:** {causa}
   - **Fix para próxima vez:** {solución}

2. {Área 2 de mejora}
   - **Root cause:** {causa}
   - **Fix para próxima vez:** {solución}

---

## Agent Health Updates

### AGENT-METRICS.md Updates
```
[System Pulse - NEW]
Date: {date}
Session: {nombre plan}
Pass rate: {%}
Scope creep: {incidents}
Repeat errors: {N}

[Section Health - {SECCIÓN}]
Agents: {N}
Pass rate: {%}
Common issues: {lista}
Lessons: {N} new

[Agent Detail - {AGENT-ID}]
Sessions: {N} (new: {N})
Pass rate: {%}
Latest lesson: {fecha}
Status: healthy/needs_attention
```

### Lessons Registered
| Date | Agent | Check | Issue | Prevention | Frequency |
|------|-------|-------|-------|-----------|-----------|
| {date} | {ID} | zone | {descripción} | {cómo prevenir} | 1st occurrence |
| {date} | {ID} | tests | {descripción} | {cómo prevenir} | Repeat? |

---

## Recommendations for Future Macros

1. {Recomendación 1}
2. {Recomendación 2}
3. {Recomendación 3}

---

## Sign-Off

- **Arquitecto:** {nombre} (XX-01)
- **Reviewed by:** {usuario/PM}
- **Date:** {YYYY-MM-DD}
- **Status:** COMPLETED / WITH NOTES / BLOCKED

---

## Appendix: Full Error Ledger

{Tabla completa de todos los QG failures con prevention}
```

---

## 4. Cost Estimation: Macro Formula

```
Total Cost = Σ(Wave costs) + QG overhead + Rollback margin

Wave Cost = Σ(agents) × tokens_per_agent × model_rate
           × compaction_factor

Compaction factor: 0.8-1.0 (más ondas = más repetición)

QG Overhead: 5% per wave × num_waves

Rollback margin: 10-20% (Macro risk higher)

Example:
Wave 1: 5 agents × 1.5K tokens × $0.02 = $0.15
Wave 2: 4 agents × 1.8K tokens × $0.015 = $0.11
Wave 3: 3 agents × 2.0K tokens × $0.015 = $0.09
Wave 4: 2 agents × 1.2K tokens × $0.008 = $0.02
Wave 5: 2 agents × 1.0K tokens × $0.02 = $0.04

Subtotal: $0.41
QG (5% × 5): $0.10
Rollback (15%): $0.08

TOTAL: ~$0.59

(Nota: Esto es Sonnet pricing; Opus sería 5-10x más)
```

---

## 5. Anti-patterns Macro

**NO hagas:**

1. **"Todos a la vez"** — Lanzar 20+ agentes sin olas
   → Merge conflicts inmanejables, QG overwhelmed

2. **"Sin memory compaction"** — Guardar contexto completo entre ondas
   → Context window explota, errores acumulados

3. **"Ignorar QG entre ondas"** — Continuar aunque onda falle
   → Errores se propagan, rollback imposible

4. **"Spec drift"** — Cambiar requisitos mid-macro
   → Agentes posteriores confusos, rework

5. **"Zero rollback plan"** — Entrar sin saber cómo revertir
   → Pánico si algo sale mal

6. **"Skip post-mortem"** — No documentar lecciones
   → Repetir mismos errores en próximo macro

---

## 6. Macro Checklist Pre-Launch

- [ ] Master plan generado por XX-01
- [ ] Agentes seleccionados: {list} ({N} total)
- [ ] Ondas definidas: {N} ondas
- [ ] Dependencias resueltas: {dependency graph}
- [ ] Memory compaction strategy: documentada
- [ ] Rollback plan: {niveles definidos}
- [ ] Cost estimado: ~${total}
- [ ] QG criteria per wave: {checklist}
- [ ] Post-mortem template: preparado
- [ ] Usuario confirmó plan: SÍ / NO

---

## 7. Ejemplo Completo: Macro

**Objetivo:** Refactor completo del sistema de Study (ST) + Dashboard (DG)

**Plan:**
```
Onda 1: Infra + DB
- IF-01, IF-04: Core libs + schema

Onda 2: Study Backend
- ST-02, ST-03, ST-04, ST-05: Sesiones, colas, planes, progreso

Onda 3: Study Frontend
- ST-01: Study hub UI

Onda 4: Dashboard Integration
- DG-01, DG-04: Student dashboard + gamification backend

Onda 5: Tests
- ST-03, QZ-03, XX-06: Integration tests

Onda 6: Final QG
- XX-02: Master quality gate
```

**Costo estimado:** ~$25-40 (Opus) / ~$5-8 (Sonnet)
**Duración estimada:** 8-12 horas

---

## Fin del Template Macro

Usa este para planes de máxima complejidad que requieren orquestación profesional.
El Arquitecto (XX-01) es quien decide si escalar a Macro.
