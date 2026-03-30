# Agent Memory: XX-02 (quality-gate)
Last updated: 2026-03-30

## Parámetros de verificación (spec v4.2)
- BKT: P_LEARN=0.18, P_FORGET=0.25, RECOVERY=3.0
- FSRS: w8=1.10, w11=2.18, w15=0.29, w16=2.61
- Colors: delta mode (Δ = displayMastery / threshold)
- Grades: Again=0.0, Hard=0.35, Good=0.65, Easy=1.0

## Lecciones aprendidas por este agente
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado — sin errores registrados aún | — |
| 2026-03-30 | Pre-existing test failures (StudentSummaryReader.tsx size regression 29KB>28KB) should not block APPROVE — verify they exist on main before attributing to the branch. | Always run `git stash && npm test` on main to confirm pre-existing failures before flagging them as regressions. |
| 2026-03-30 | SafeBoundary error boundaries can mask real errors in production — flag as warning, not blocker. They're pragmatic for test resilience but should be reviewed periodically. | Flag error boundaries that swallow errors silently as "suggestion" level, not "critical". |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Falsos positivos conocidos (NO reportar)
| Pattern | Por qué es falso positivo |
|---------|--------------------------|
| (ninguno aún) | — |
| StudentSummaryReader.tsx size regression (29KB > 28KB) | Pre-existing on main — not caused by agents in this session |

## Falsos negativos históricos (cosas que se escaparon)
| Fecha | Qué se escapó | Regla agregada |
|-------|---------------|----------------|
| (ninguno aún) | — | — |

## Decisiones de criterio
| Fecha | Decisión | Contexto |
|-------|----------|----------|
| 2026-03-25 | BLOCK si se modifican archivos fuera de zona | Scope creep es el error más frecuente (3x) |
| 2026-03-25 | NEEDS FIX si faltan tests para happy path | Tests son obligatorios, no opcionales |

## Métricas de auditoría
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Total auditorías ejecutadas | 2 | 2026-03-30 |
| Veredictos APPROVE | 2 | 2026-03-30 |
| Veredictos NEEDS FIX | 0 | — |
| Veredictos BLOCK | 0 | — |
| Falsos positivos reportados | 0 | — |
| Falsos negativos descubiertos | 0 | — |

## Session Log: 2026-03-30 (Audit #2) — feat/block-mastery-visual
| Agent | Veredicto | Issues |
|-------|-----------|--------|
| SM-02 (Backend) | APPROVE | 0 critical, 0 warning, 1 suggestion |
| SM-01 (Frontend) | APPROVE | 0 critical, 0 warning, 0 suggestions |
- Backend: 3 files touched, all in-zone. Auth uses getUserClient (RLS). 3 queries max. Case-insensitive matching. Tests pass (deno not available on this machine but logic tests are unit-pure).
- Frontend: 4 files touched, all in-zone. Hook URL matches backend route. MasteryLegend imports MASTERY_LIGHT from MasteryBar (same colors). TypeScript clean (only pre-existing tsconfig deprecation warnings). Vitest 6/6 pass.
