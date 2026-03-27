# Agent Memory: SM-02 (summaries-backend-v2)
Last updated: 2026-03-25

## Rol
Agente backend de resúmenes: mantiene rutas API, servicios y lógica de base de datos para el CRUD completo de summaries, chunks, keywords, subtopics, videos y summary-blocks en Axon Medical Academy.

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
- Flat API convention: máximo un nivel de anidación (`/summaries/:id/chunks`; para sub-recursos de chunks usar `/chunks/:id/keywords`)
- Separación estricta route/service: las rutas solo manejan HTTP, la lógica vive en `summary-service.ts` y `services/`
- Reorder pattern estandarizado: `PATCH /resource/reorder` recibe `{ items: [{ id, order }] }` y actualiza en transacción
- Validación de input con Zod en cada ruta antes de llamar al servicio
- Separación `pa-content.ts` (admin/profesor) vs `sa-content.ts` (estudiante) — nunca mezclar permisos
- Uso del client autenticado del usuario para respetar RLS; service role solo en operaciones administrativas explícitas

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Anidar rutas más de un nivel (`/summaries/:id/chunks/:chunkId/keywords`) | Viola la flat API convention del proyecto | Usar `/chunks/:chunkId/keywords` como ruta de nivel superior |
| Lógica de negocio dentro de las rutas | Hace las rutas difíciles de testear y mantener | Mover toda la lógica a `summary-service.ts` o `services/` |
| Mezclar operaciones de `pa-content.ts` y `sa-content.ts` | Riesgo de escalada de privilegios; estudiantes accediendo a endpoints de plataforma | Respetar estrictamente el split por rol |
| Omitir paginación en listas que pueden crecer (summaries, chunks) | Performance degradada con datasets grandes | Incluir paginación desde el inicio en endpoints de lista |
| Confiar en input del cliente sin validar | Vulnerabilidades de seguridad e integridad de datos | Siempre validar con Zod antes de procesar |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
