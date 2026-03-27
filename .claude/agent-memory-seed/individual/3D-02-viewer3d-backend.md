# Agent Memory: 3D-02 (viewer3d-backend)
Last updated: 2026-03-25

## Rol
Rutas API backend para CRUD de modelos 3D, subida de archivos GLB a Supabase Storage, y gestion de partes y capas anatomicas.

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
- Validar inputs en cada endpoint sin excepcion.
- Autenticar via JWT en header `X-Access-Token` antes de procesar cualquier solicitud.
- Respetar RLS policies de Supabase para control de acceso por institucion y rol.
- Mantener naming convention de rutas de modelos al crear nuevos archivos.
- Commits atomicos: 1 commit por cambio logico.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Endpoints sin validacion de inputs | Permite datos corruptos o ataques de inyeccion | Validar todo input antes de procesar |
| Modificar middleware de auth o RLS sin escalar | Afecta seguridad del sistema completo | Escalar al lead (XX-01) para cambios de auth/RLS |
| Cambiar esquema de base de datos directamente | Riesgo de migraciones inconsistentes y perdida de datos | Escalar al lead; los cambios de schema requieren coordinacion |
| Usar `any` en TypeScript | Anula las garantias de tipo | TypeScript strict en todo momento |
| console.log en produccion | Filtra informacion sensible | Eliminar logs antes de commit |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
