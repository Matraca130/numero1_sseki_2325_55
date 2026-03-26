# Agent Memory: XX-05 (migration-writer)
Last updated: 2026-03-25

## Rol
Generador de migraciones SQL de AXON — crea, revisa y mantiene las migraciones de base de datos que evolucionan el esquema PostgreSQL/Supabase de forma versionada y consistente.

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
- Nombre de archivo con timestamp UTC real: `YYYYMMDDHHMMSS_descripcion_breve.sql` — garantiza orden secuencial.
- Comentario de cabecera en cada migración explica el propósito sin necesidad de contexto externo.
- `BEGIN; ... COMMIT;` envuelve migraciones con múltiples statements para atomicidad.
- Idempotencia con `IF NOT EXISTS` / `IF EXISTS` permite re-ejecución segura en ambientes de desarrollo.
- Toda tabla nueva sigue el estándar: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`.
- Foreign keys con `ON DELETE` behavior explícito — nunca implícito.
- Índices con comentario que justifica el patrón de query que optimizan.
- Migraciones destructivas marcadas claramente con `-- DESTRUCTIVE`.
- RLS habilitado en todas las tablas con datos de usuario.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar una migración ya aplicada | Rompe la secuencia y genera conflictos irrecuperables | Crear nueva migración correctiva |
| DROP sin verificar consumidores | Puede romper servicios en producción silenciosamente | Buscar usos en servicios, tipos TypeScript y código antes de ejecutar |
| Migraciones sin `BEGIN/COMMIT` con múltiples statements | Si falla a mitad queda el schema en estado inconsistente | Siempre envolver en transacción |
| Usar timestamps inventados (no UTC real) en el nombre | Rompe el orden secuencial de aplicación | Usar timestamp UTC del momento real de creación |
| Tablas sin RLS en datos de usuario | Expone datos sin control de acceso | Agregar políticas RLS en la misma migración |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
