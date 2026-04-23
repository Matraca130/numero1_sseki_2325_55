# Agent Memory: ST-02 (study-sessions)
Last updated: 2026-03-26

## Rol
Mantener y evolucionar el flujo completo de sesiones de estudio: creación de sesión, envío de batches de revisión FSRS y registro de analítica de actividad.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-26 | studentApi.ts es un barrel re-exporter; las implementaciones reales viven en student-api/sa-*.ts sub-files. Tests deben importar desde barrel pero entender las sub-files para verificar contratos. | Siempre leer los sub-files antes de escribir tests |
| 2026-03-26 | saveReviews tiene un flujo de 3 pasos: (1) POST /study-sessions, (2) POST /reviews por cada review, (3) PUT /study-sessions/:id para finalizar. correct_reviews se calcula con rating >= 3. | Verificar los 3 pasos en contract tests |
| 2026-03-26 | Funciones stub (getReviews, getReviewsByCourse, getAllSummaries, etc.) retornan valores vacios sin llamar apiCall. Los tests deben verificar que NO se llama mockApiCall. | No mockear apiCall para stubs |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- Mantener separación clara entre tres capas: lógica de sesión (`studySessionApi.ts`), lógica de batch (`useReviewBatch.ts`) y analítica (`sessionAnalytics.ts`).
- Implementar idempotencia en todo envío de batch: los reintentos por error de red no deben duplicar datos.
- Tratar los estados FSRS (New, Learning, Review, Relearning) como enum estricto; nunca strings literales.
- `session-stats.ts` debe ser función pura sin side effects; los side effects de tracking van en `sessionAnalytics.ts`.
- Aplicar retry con exponential backoff en todas las llamadas a API.
- Flujo estándar: crear sesión → obtener batch → estudiante responde → enviar batch → actualizar FSRS → registrar analytics → cerrar sesión.
- Para contract tests: mock `apiCall` con `vi.fn()` ANTES de los imports, usar `mockApiCall.mock.calls[N]` para inspeccionar URL/method/body. Resetear caches de infra en `beforeEach`.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Envíos de batch no idempotentes | Un retry duplica registros en el servidor | Diseñar con idempotency key o deduplicación en API |
| Strings literales para estados FSRS | Errores silenciosos por typos | Enum estricto de TypeScript |
| Side effects en `session-stats.ts` | Rompe la pureza y dificulta testing | Mover side effects a `sessionAnalytics.ts` |
| Mezclar lógica de sesión y analítica en el mismo módulo | Acoplamiento alto, difícil de testear | Mantener separación de responsabilidades por archivo |
| Usar `any` en TypeScript | Rompe la seguridad de tipos | Tipar explícitamente |
| Modificar `studyQueueApi.ts` o `bktApi.ts` directamente | Viola ownership de ST-03 y ST-05 | Escalar al Arquitecto (XX-01) |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 1 | 2026-03-26 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |

---

## 2026-04-23 — God-hook split (useAdaptiveSession + useStudyTimeEstimates)

### Tarea
Split de dos hooks grandes preservando API pública intacta:
- `useAdaptiveSession.ts` (487L) → 331L + 3 sub-hooks
- `useStudyTimeEstimates.ts` (453L) → 175L + pure lib

### Archivos creados
- `src/app/hooks/useRoundLifecycle.ts` (177L) — rounds, card navigation, stats refs
- `src/app/hooks/useOptimisticMastery.ts` (145L) — keyword mastery + optimistic card state
- `src/app/hooks/useAdaptiveGeneration.ts` (134L) — AI batch generation state + abort
- `src/app/lib/study-time-math.ts` (321L) — pure functions + constants (no React)

### Lecciones
1. **Expose refs as part of the public return** — cuando un hook expone `optimisticUpdates: ref` o `masteryDeltas: ref`, el sub-hook debe *retornar* ese ref (no re-crear) y el parent lo re-exporta. Así consumidores siguen viendo la misma identidad estable.
2. **Re-export de funciones puras usadas por tests**: `sessionDurationMinutes` estaba exportada desde el hook y usada por 2 test-files. Después de moverla a `lib/study-time-math.ts`, re-exporté desde el hook con `export const sessionDurationMinutes = sessionDurationMinutesImpl;` para no romper tests.
3. **Cuidado con el flujo partial-summary → completed**: el finishSession desde partial-summary NO debe re-pushear la ronda (ya fue pusheada por finishCurrentRound). Añadí `refreshSnapshots` al lifecycle para este caso.
4. **Type-check env está roto en este repo**: los errores de `react module not found` y `import.meta.env` aparecen incluso en archivos no tocados (confirmado en `useFlashcardEngine.ts`). Filtrar siempre por errores NUEVOS respecto al baseline.
5. **Types re-exportados**: `RoundInfo` y `GenerationProgressInfo` son consumidos por `AdaptivePartialSummary`, `AdaptiveCompletedScreen`, `RoundHistoryList`, `AdaptiveGenerationScreen`. Los definí en los sub-hooks y los re-exporté desde `useAdaptiveSession` con `export type { RoundInfo, GenerationProgressInfo };`.

### Métricas
| Métrica | Valor | Actualizado |
|---------|-------|-------------|
| Sesiones ejecutadas | 2 | 2026-04-23 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
