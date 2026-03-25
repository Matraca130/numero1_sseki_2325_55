# AXON Agent Metrics
Last updated: 2026-03-25 | Total sessions: 0

> El Arquitecto lee este archivo al inicio de cada sesión y lo actualiza después de cada post-mortem.

---

## 1. System Pulse

| Métrica                      | Últimas 5 | Previas 5 | Trend |
|------------------------------|-----------|-----------|-------|
| QG first-pass rate           | —         | —         | —     |
| Scope creep incidents        | 0         | —         | —     |
| Repeat errors (post-lesson)  | 0         | —         | —     |
| Merge conflicts              | 0         | —         | —     |
| Avg agents per session       | —         | —         | —     |
| Lessons registered           | 0         | —         | —     |

> Trend: `+++` mejora fuerte, `++` mejora, `=` estable, `--` declive, `---` declive fuerte

### Qué decide cada métrica

| Métrica | Si el valor es malo → acción |
|---------|------------------------------|
| QG first-pass rate <75% | Pausar features, auditar agentes que fallan |
| Scope creep >2 | Revisar reglas en `feedback_agent_isolation.md` |
| Repeat errors >0 | Las lecciones no funcionan — fortalecer definiciones de agentes |
| Merge conflicts >2 | Revisar overlap de archivos en AGENT-REGISTRY |

---

## 2. Section Health

| Section        | Agents | Active | QG Rate (L5) | Top Error | Lessons | Repeats | Status |
|----------------|--------|--------|--------------|-----------|---------|---------|--------|
| Quiz (QZ)      | 6      | 0      | —            | —         | 0       | 0       | NEW    |
| Flashcards (FC)| 6      | 0      | —            | —         | 0       | 0       | NEW    |
| Summaries (SM) | 6      | 0      | —            | —         | 0       | 0       | NEW    |
| Study (ST)     | 5      | 0      | —            | —         | 0       | 0       | NEW    |
| Dashboard (DG) | 5      | 0      | —            | —         | 0       | 0       | NEW    |
| Admin (AO)     | 5      | 0      | —            | —         | 0       | 0       | NEW    |
| Auth (AS)      | 5      | 0      | —            | —         | 0       | 0       | NEW    |
| AI & RAG (AI)  | 6      | 0      | —            | —         | 0       | 0       | NEW    |
| 3D Viewer (3D) | 4      | 0      | —            | —         | 0       | 0       | NEW    |
| Infra (IF)     | 5      | 0      | —            | —         | 0       | 0       | NEW    |
| Messaging (MG) | 4      | 0      | —            | —         | 0       | 0       | NEW    |
| Billing (BL)   | 4      | 0      | —            | —         | 0       | 0       | NEW    |
| Cross-cut (XX) | 9      | 0      | —            | —         | 0       | 0       | NEW    |

> **Top Error** usa los 6 checks del QG: `zone` | `ts` | `spec` | `tests` | `git` | `compat`
> **Status** = peor health de cualquier agente de la sección

---

## 3. Agent Detail

### Quiz (QZ)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| QZ-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| QZ-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| QZ-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| QZ-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| QZ-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| QZ-06 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Flashcards (FC)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| FC-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| FC-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| FC-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| FC-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| FC-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| FC-06 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Summaries (SM)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| SM-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| SM-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| SM-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| SM-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| SM-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| SM-06 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Study (ST)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| ST-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| ST-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| ST-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| ST-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| ST-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Dashboard & Gamification (DG)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| DG-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| DG-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| DG-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| DG-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| DG-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Admin & Owner (AO)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| AO-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AO-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AO-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AO-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Auth & Security (AS)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| AS-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AS-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AS-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |

> AS-03, AS-04 son supervisores → ver Sección 5

### AI & RAG (AI)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| AI-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AI-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AI-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AI-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AI-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| AI-06 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### 3D Viewer (3D)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| 3D-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| 3D-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| 3D-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| 3D-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Infrastructure (IF)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| IF-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| IF-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| IF-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| IF-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| IF-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Messaging (MG)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| MG-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| MG-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| MG-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| MG-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Billing (BL)
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| BL-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| BL-02 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| BL-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| BL-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |

### Cross-cutting (XX) — solo implementadores
| ID    | Sessions | QG L5  | Fails By Type (L5) | Scope | Last Run | Trend | Health |
|-------|----------|--------|---------------------|-------|----------|-------|--------|
| XX-01 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| XX-03 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| XX-04 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| XX-05 | 0        | —      | —                   | 0     | —        | —     | NEW    |
| XX-08 | 0        | —      | —                   | 0     | —        | —     | NEW    |

> XX-02, XX-06, XX-07, XX-09 son supervisores → ver Sección 5

---

## 4. Error Ledger (últimos 20 errores)

> Conecta: QG failure → lección → prevención. Si `Recurred? = YES`, la lección no funcionó.

| #  | Date | Agent | QG Check | Description | Lesson? | Where | Recurred? |
|----|------|-------|----------|-------------|---------|-------|-----------|
| — | — | — | — | (sin errores registrados) | — | — | — |

> **QG Check** es uno de: `zone` `ts` `spec` `tests` `git` `compat`
> **Recurred?** = YES(#N) si el mismo agente repitió el mismo tipo de error después de una lección

---

## 5. Supervisor Metrics

> Los supervisores generan auditorías, no código. Sus métricas son de hallazgos, no de QG pass/fail.

### XX-02 quality-gate
| Runs | APPROVE | NEEDS FIX | BLOCK | False Pos | False Neg | Accuracy |
|------|---------|-----------|-------|-----------|-----------|----------|
| 0    | 0       | 0         | 0     | 0         | 0         | —        |

### XX-06 test-orchestrator
| Runs | Tests Exec | Tests Failed | Flaky Detected | Slow (>5s) | .only/.skip |
|------|-----------|-------------|----------------|------------|-------------|
| 0    | 0         | 0           | 0              | 0          | 0           |

### AS-04 security-scanner
| Runs | Findings | Critical | High | Medium | Resolved | False Pos |
|------|----------|----------|------|--------|----------|-----------|
| 0    | 0        | 0        | 0    | 0      | 0        | 0         |

### XX-07 refactor-scout
| Runs | Findings | Critical | High | Actioned | Ignored | Trend |
|------|----------|----------|------|----------|---------|-------|
| 0    | 0        | 0        | 0    | 0        | 0       | —     |

### AS-03 rls-auditor
| Runs | Tables Audited | Gaps Found | Gaps Fixed | Misconfigs |
|------|---------------|------------|------------|------------|
| 0    | 0             | 0          | 0          | 0          |

### XX-09 api-contract
| Runs | Contracts | Mismatches | Envelope Violations | Orphan Endpoints |
|------|-----------|------------|---------------------|------------------|
| 0    | 0         | 0          | 0                   | 0                |

---

## 6. Scoring Rules

### Agent Health (basado en últimas 5 sesiones)
| Health | Criterio |
|--------|----------|
| NEW    | 0 sesiones |
| GREEN  | >=80% QG pass AND 0 scope creep |
| YELLOW | 60-79% QG pass OR 1 scope creep OR 1 repeat error |
| RED    | <60% QG pass OR 2+ scope creep OR 2+ repeat errors OR 2+ BLOCK |

### Section Status (derivado de agentes de la sección)
| Status | Criterio |
|--------|----------|
| NEW    | Todos los agentes NEW |
| GREEN  | 0 agentes RED AND QG rate sección >=80% |
| YELLOW | 1 agente RED OR QG rate sección 60-79% |
| RED    | 2+ agentes RED OR QG rate sección <60% OR any repeat error |

### Trend (comparar últimas 5 vs previas 5)
| Trend | Significado |
|-------|-------------|
| `+++` | Mejoró 40%+ puntos |
| `++`  | Mejoró 20-39% puntos |
| `=`   | Cambió <20% puntos |
| `--`  | Declinó 20-39% puntos |
| `---` | Declinó 40%+ puntos |
| `—`   | <6 sesiones totales (datos insuficientes) |

### Error Type Codes
`zone` = zone compliance | `ts` = TypeScript | `spec` = spec coherence
`tests` = test coverage | `git` = git hygiene | `compat` = backward compatibility

---

## Update Protocol (después de cada post-mortem)

**Paso 1 (30s): Error Ledger.** Por cada QG failure, agregar fila. Verificar si matchea una lección previa del mismo agente → marcar `Recurred? YES(#N)`.

**Paso 2 (30s): Agent Detail.** Por cada agente que participó: incrementar Sessions, actualizar QG L5 (agregar resultado, dropear el más viejo si >5), actualizar Fails By Type, Scope, Last Run. Recalcular Trend y Health.

**Paso 3 (15s): Section Health.** Por cada sección que tuvo agentes: recalcular QG Rate (L5) agregando todos los agentes activos. Actualizar Top Error, Active, Lessons, Repeats. Derivar Status.

**Paso 4 (15s): System Pulse.** Recalcular las 6 métricas del sistema. Rotar ventana. Actualizar trends.

**Paso 5 (15s): Supervisor Metrics.** Si un supervisor participó, actualizar su tabla específica en Sección 5.

> Tiempo total estimado: ~2 minutos de edición manual por post-mortem.
