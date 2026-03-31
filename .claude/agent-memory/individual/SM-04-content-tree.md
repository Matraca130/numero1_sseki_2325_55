# Agent Memory: SM-04 (content-tree)
Last updated: 2026-03-27

## Rol
Agente de content hierarchy (Institution → Course → Semester → Section → Topic) de AXON.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-27 | (inicial) Archivo creado con especialización | — |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| — | — | — | — |

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- Dos hooks distintos: context-based (con CRUD) y standalone readonly (para selects)
- CRUD pattern: `api.createX()` → `refresh()` (not yet optimistic)

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `ContentTreeContext.tsx` (242L) | `ContentTreeProvider`, `useContentTree()` | Full CRUD state, useMemo on context value (PERF-01) | tree/loading/error/canEdit/selectedTopicId |
| `useContentTree.ts` (101L) | `useContentTreeReadonly()` | Standalone for cascade selectors | Filters courses by professor memberships |
| `contentTreeApi.ts` (179L) | `getContentTree`, CRUD all 4 levels, `reorder()` | GET /content-tree returns TreeCourse[] directly | apiCall unwraps envelope |

- Hierarchy: Institution → Course → Semester → Section → Topic
- 28 importers depend on ContentTreeContext (critical path)

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
