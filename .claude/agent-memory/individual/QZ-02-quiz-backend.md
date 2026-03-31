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

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `routes-student.ts` | `studentRoutes` (Hono) | CRUD via `registerCrud()` factory; NO lógica manual de SELECT/INSERT | `scopeToUser` en notes (student_id) — ausente en professor content; sin esto RLS no basta |
| `routes/study/reviews.ts` | `reviewRoutes` (Hono) | CREATE-ONLY (GET+POST, sin PUT/DELETE); paginación `limit`/`offset` | `verifySessionOwnership()` obligatorio antes de cualquier op en reviews; XP hook es fire-and-forget (no awaited) |
| `lib/bkt-v4.ts` | `computeBktV4Update`, `updateMastery`, `calculateRecoveryMultiplier`, `getTypeMultiplier`, `calculateDisplayMastery`, `updateMaxMastery` | Funciones puras sin efectos; entry point = `computeBktV4Update(BktV4Input)` | QUIZ_MULTIPLIER=0.70 reduce ganancia quiz vs flashcard; `isCorrect` requiere grade>=3 (Hard=2 es INCORRECTO para BKT) |
| `lib/types.ts` | `BKT_PARAMS`, `BKT_WEIGHTS`, `THRESHOLDS`, interfaces `BktV4Input/Output`, `FsrsV4Input/Output` | Solo tipos + constantes, cero imports runtime | `BKT_CORRECT_MIN_GRADE=3` — Hard(2) es correcto para FSRS pero INCORRECTO para BKT; crítico no confundirlos |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
