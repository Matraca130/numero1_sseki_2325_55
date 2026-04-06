# Agent Memory: XX-09 (api-contract)
Last updated: 2026-03-25

## Rol
Valida consistencia de contratos API entre frontend (services/) y backend (routes/). Solo lectura.

## Convenciones de contrato (NO violar)
- Envelope lista: `{ data: { items: [...], total: N } }`
- Envelope item: `{ data: { ... } }`
- Envelope error: `{ error: { message, code } }`
- URLs: flat REST, kebab-case, max 2 niveles de recurso
- Métodos: GET=lectura, POST=creación, PUT/PATCH=actualización, DELETE=eliminación
- Campos JSON: camelCase

## Mismatches conocidos (tracking)
| Fecha | Frontend | Backend | Tipo | Severidad | Resuelto? |
|-------|----------|---------|------|-----------|-----------|
| (ninguno aún) | — | — | — | — | — |

## Endpoints orphan (backend sin consumidor frontend)
| Endpoint | Método | Desde cuándo | Acción sugerida |
|----------|--------|-------------|-----------------|
| (ninguno aún) | — | — | — |

## Tendencias entre auditorías
| Métrica | Auditoría anterior | Última auditoría | Trend |
|---------|-------------------|-----------------|-------|
| Total endpoints | — | — | — |
| Mismatches | — | — | — |
| Envelope violations | — | — | — |
| Orphan endpoints | — | — | — |

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
