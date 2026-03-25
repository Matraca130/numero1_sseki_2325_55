# Agent Memory: SM-03 (summaries-tester)
Last updated: 2026-03-25

## Rol
Agente tester de la sección Resúmenes de AXON: escribe y ejecuta tests para chunking, RAG pipeline, summary UI y anotaciones, con ownership exclusivo sobre archivos de test.

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
- Ejecutar tests frontend con `npm run test -- --testPathPattern=summary` para filtrar solo los tests relevantes
- Ejecutar tests backend con `deno test supabase/functions/server/tests/semantic_chunker_test.ts` y `summary_hook_test.ts` por separado
- Solo hacer Write en archivos de test (`src/__tests__/summary-*.test.ts`, `semantic_chunker_test.ts`, `summary_hook_test.ts`) — nunca tocar código de producción
- Leer `agent-memory/summaries.md` al inicio para alinear los tests con el modelo de datos actual

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar archivos fuera de la zona de test (código de producción, configs) | Rompe el principio de ownership; SM-03 solo escribe tests | Reportar el problema al agente dueño (SM-01, SM-02) y escalar si es necesario |
| Escribir tests sin leer `agent-memory/summaries.md` primero | Los tests pueden quedar desalineados con el modelo de datos actual | Leer el contexto del módulo antes de cada sesión |
| Tests que dependen de estado externo no controlado | Tests flaky e impredecibles | Mockear dependencias externas; usar datos de test deterministas |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
