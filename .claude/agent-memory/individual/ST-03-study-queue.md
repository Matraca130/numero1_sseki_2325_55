# Agent Memory: ST-03 (study-queue)
Last updated: 2026-03-25

## Rol
Mantener y evolucionar la cola de estudio: algoritmo NeedScore de priorización, caché TTL y actualizaciones optimistas para mantener la UI responsive.

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

## Patrones que funcionan
- Respetar la fórmula NeedScore como contrato sagrado: `overdue(40%) + mastery(30%) + fragility(20%) + novelty(10%)`. Cambios de pesos requieren aprobación explícita.
- Invalidar el TTL cache siempre que se complete una sesión de estudio o se actualice mastery.
- Implementar rollback automático en actualizaciones optimistas si la API falla.
- Memoizar el cálculo de NeedScore en `StudyQueueWidget.tsx` para evitar recálculos en cada render.
- Garantizar que toda tarjeta en la cola tenga un NeedScore calculado antes de mostrarse.
- Consumir mastery desde `useTopicMastery` y `useKeywordMastery` (ST-05); nunca calcularlo localmente.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Alterar los pesos de NeedScore sin aprobación | Cambia el comportamiento de priorización para todos los estudiantes | Escalar al Arquitecto (XX-01) con justificación |
| Mostrar tarjetas sin NeedScore calculado | UI inconsistente, posible crash | Garantizar score antes de renderizar |
| No invalidar cache tras sesión completada | Datos stale en la cola, tarjetas ya revisadas reaparecen | Suscribirse a eventos de sesión completa para invalidar TTL |
| Actualizaciones optimistas sin rollback | Si la API falla, UI queda en estado incorrecto | Implementar rollback al estado previo en caso de error |
| Recalcular NeedScore en cada render del widget | Performance degradada en el dashboard | Usar `useMemo` con dependencias precisas |
| Usar `any` en TypeScript | Rompe la seguridad de tipos | Tipar explícitamente |

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `lib/studyQueueApi.ts` | `getStudyQueue()`, `StudyQueueItem`, `StudyQueueMeta` | Thin wrapper apiCall() | include_future=1 string; BE limit cap 100 |
| `hooks/useStudyQueueData.ts` | `useStudyQueueData()`, `invalidateStudyQueueCache()` | Module cache + in-flight dedup + O(1) indexes | PN-10: applyOptimisticBatch deps=[] usa queueRef |
| `routes/study-queue/scoring.ts` (BE) | `calculateNeedScore()`, `calculateRetention()`, `getMasteryColor()` | Pure fns, NeedScore SOLO en BE | BE colores orange/blue vs FE solo green/yellow/red/gray |
| `routes/study-queue/resolvers.ts` (BE) | `resolveSummaryIdsForCourse()`, `resolveSummaryIdsForStudent()` | RPC-first + fallback | resolveSummaryIdsForStudent itera memberships en serie |
| `routes/study-queue/index.ts` (BE) | `studyQueueRoutes` | RPC get_study_queue + fallback JS | BE envía campos extras no tipados en FE |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
