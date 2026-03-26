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
