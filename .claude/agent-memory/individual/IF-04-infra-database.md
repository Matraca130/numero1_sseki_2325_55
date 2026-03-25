# Agent Memory: IF-04 (infra-database)
Last updated: 2026-03-25

## Rol
Agente de migraciones y esquema de base de datos de AXON: administra los archivos SQL en `supabase/migrations/`, la documentación de esquema en `database/schema-*.md`, y garantiza la integridad de las 50+ tablas del sistema PostgreSQL con pgvector.

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
- Migraciones idempotentes con `IF NOT EXISTS` / `IF EXISTS` — evitan fallos en re-ejecución.
- Comentarios SQL descriptivos en cada migración — facilitan auditoría y revisión.
- RLS policies en la misma migración que la tabla o en una migración dedicada — nunca dejar tablas sin RLS.
- Toda nueva tabla con `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at`, `updated_at`.
- Índices justificados con el patrón de query que optimizan — documentarlo en el comentario del índice.
- Verificar que ningún servicio consume una columna/tabla antes de hacer DROP.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar migraciones ya aplicadas | Rompe consistencia con entornos existentes | Crear nueva migración correctiva |
| Migraciones sin transacción para múltiples statements | Deja el esquema en estado inconsistente si falla a mitad | Usar `BEGIN; ... COMMIT;` |
| Crear tabla sin políticas RLS | Datos de usuario expuestos | Incluir RLS en la misma migración o en dedicada inmediata |
| DROP sin verificar consumidores | Rompe servicios en producción | Auditar archivos de servicios y tipos TS antes de borrar |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
