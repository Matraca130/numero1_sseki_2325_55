# Agent Memory: XX-02 (quality-gate)
Last updated: 2026-03-25

## Parámetros de verificación (spec v4.2)
- BKT: P_LEARN=0.18, P_FORGET=0.25, RECOVERY=3.0
- FSRS: w8=1.10, w11=2.18, w15=0.29, w16=2.61
- Colors: delta mode (Δ = displayMastery / threshold)
- Grades: Again=0.0, Hard=0.35, Good=0.65, Easy=1.0

## Lecciones aprendidas por este agente
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado — sin errores registrados aún | — |

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
| Total auditorías ejecutadas | 0 | — |
| Veredictos APPROVE | 0 | — |
| Veredictos NEEDS FIX | 0 | — |
| Veredictos BLOCK | 0 | — |
| Falsos positivos reportados | 0 | — |
| Falsos negativos descubiertos | 0 | — |
