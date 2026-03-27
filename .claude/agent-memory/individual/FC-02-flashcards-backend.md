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

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Export | Ruta HTTP | Patrón | Gotcha |
|---------|--------|-----------|--------|--------|
| `flashcard-mappings.ts` | `flashcardMappingRoutes` | `GET /flashcard-mappings` | Read-only, paginado, JOIN memberships+flashcards | Seguridad W7-SEC04: JOIN en summaries.institution_id acota al usuario |
| `flashcards-by-topic.ts` | `flashcardsByTopicRoutes` | `GET /flashcards-by-topic` | Read-only, 2-step query (summaries→flashcards) | `isUuid(topicId)` + `requireInstitutionRole` defensa en profundidad |
| `flashcard-images.ts` | `flashcardImageRoutes` | `POST /flashcards/:id/generate-image` | Write + AI pipeline → Gemini → Storage | `getAdminClient()` bypasses RLS; validación de rol manual; CONTENT_WRITE_ROLES check |
| `flashcard-image-generator.ts` | `generateFlashcardImage`, `buildImagePrompt`, `getTransformedImageUrl` | Service (no Hono) | Pipeline: prompt→Gemini→Storage upload→URL | Sin validación propia (capa ruta valida); Storage path: `flashcard-images/{instId}/{fcId}/original.png` |

- **No existe** `flashcard-service.ts` separado; lógica de servicio en `flashcard-image-generator.ts`
- CRUD base de flashcards lo maneja `crud-factory.ts` (zona infra-plumbing, solo lectura)
- `safeErr()` de `lib/safe-error.ts` para errores de DB (oculta detalles internos)
- Image variants via Supabase Image Transformations (sin archivos extra)

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
