# Agent Memory: QZ-02 (quiz-backend)
Last updated: 2026-03-25

## Rol
Agente backend de la sección Quiz de AXON — implementa lógica de CRUD de quizzes/questions, BKT scoring y smart generation.

## Parámetros críticos
- **Framework**: Hono + TypeScript strict
- **Respuestas**: `ok()` / `err()` para respuestas de API; `validateFields()` para validación de input
- **Migrations**: naming `supabase/migrations/YYYYMMDD_NN_descripcion.sql`
- **BKT**: v4 en `supabase/functions/server/lib/bkt-v4.ts` — es zona de ownership directa

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
- CRUD via `crud-factory.ts` (read-only para este agente — no modificar)
- Rutas quiz/question en `supabase/functions/server/routes/content/`
- Quiz attempts tracked para analytics (consumidos por QZ-06)
- Smart generation delega a `generate-smart.ts` (infra-ai owns it)

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar `generate-smart.ts` | Es zona de infra-ai, no de este agente | Leer para entender contrato, escalar al Arquitecto si hay cambio necesario |
| Modificar `crud-factory.ts` | Es zona de infra-plumbing | Solo leer; escalar al Arquitecto (XX-01) |
| Modificar `xp-hooks.ts` | Es zona de gamification | Solo leer; escalar al Arquitecto (XX-01) |
| Respuestas ad-hoc sin `ok()`/`err()` | Rompe consistencia de contrato de API | Siempre usar helpers de respuesta del framework |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
