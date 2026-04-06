# Agent Memory: FC-02 (flashcards-backend)
Last updated: 2026-03-25

## Rol
Agente backend de la sección Flashcards de AXON: implementa y modifica CRUD de flashcards, FSRS scheduling, batch review y validación de reviews.

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
- Usar `ok()` / `err()` de `db.ts` para todas las respuestas de ruta
- Usar `validateFields()` de `validate.ts` para validación de input
- Hono framework para definición de rutas
- SQL migrations con formato `YYYYMMDD_NN_descripcion.sql` en `supabase/migrations/`
- Tests en `supabase/functions/server/tests/` con formato `*_test.ts`
- Commits atómicos
- Verificar existencia de `supabase/functions/server/lib/fsrs-v4.ts` al iniciar sesión

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| `any` en TypeScript | Rompe strict mode | Tipar correctamente siempre |
| Modificar `crud.ts`, `index.ts`, `content-tree.ts` | Son infra-plumbing, fuera de zona | Escalar al lead |
| Tocar `generate-smart.ts` | Infra-AI, fuera de zona | Escalar al lead |
| Tocar `xp-hooks.ts` | Gamification, fuera de zona | Pedir via SendMessage |
| Modificar `crud-factory.ts`, `db.ts`, `auth-helpers.ts` | Infra-plumbing | Escalar al lead |
| Rutas sin validación de input | Vulnerabilidad y datos inconsistentes | Usar `validateFields()` siempre |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
