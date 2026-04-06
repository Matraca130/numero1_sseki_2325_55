# Agent Memory: XX-07 (refactor-scout)
Last updated: 2026-03-25

## Rol
Identifica código muerto, duplicaciones y deuda técnica. Solo lectura — reporta, no modifica.

## Deuda técnica conocida (tracking)
| Fecha | Tipo | Archivo | Severidad | Accionado? | Notas |
|-------|------|---------|-----------|-----------|-------|
| 2026-03-25 | Tipos duplicados | types/legacy-stubs.ts | CRITICO | NO | 128L marcado para eliminación — XX-04 es responsable |
| 2026-03-25 | Tipos duplicados | Course, Semester, Section, Topic (3x) | CRITICO | NO | Definidos en content.ts, legacy-stubs.ts, platform.ts |
| 2026-03-25 | Tipos inconsistentes | MasteryLevel (2x con valores diferentes) | CRITICO | NO | Requiere decisión de cuál es canónico |

## Archivos >500 líneas (candidatos a split)
| Archivo | Líneas | Sugerencia | Accionado? |
|---------|--------|-----------|-----------|
| components/ai/AxonAIAssistant.tsx | 1106 | Refactor incremental — AI-02 es dueño | NO |
| hooks/useFlashcardNavigation.ts | 567 | FC-04 es dueño — requiere tests exhaustivos | NO |

## Tendencias entre escaneos
| Métrica | Escaneo anterior | Último escaneo | Trend |
|---------|-----------------|---------------|-------|
| Total `any` types | — | — | — |
| Total console.log | — | — | — |
| Archivos >500L | — | — | — |
| Exports no usados | — | — | — |

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
