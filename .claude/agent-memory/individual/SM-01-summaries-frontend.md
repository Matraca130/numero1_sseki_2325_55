# Agent Memory: SM-01 (summaries-frontend-v2)
Last updated: 2026-03-25

## Rol
Agente frontend de resúmenes: gestiona el visor de estudiantes, el editor de profesores, paginación HTML, keyword highlighting inline, tracking de tiempo de lectura y CRUD de anotaciones de texto.

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
- Jotai atoms en `reader-atoms.tsx` como estado central del reader — mantenerlos mínimos y cohesivos
- React Query para datos del servidor, separando queries y mutations en archivos dedicados (`useSummaryReaderQueries`, `useSummaryReaderMutations`)
- Paginación HTML determinista: el mismo contenido siempre produce las mismas páginas
- Reading time tracker que no cuenta tiempo inactivo (`useSummaryTimer` + `useReadingTimeTracker`)
- Lightbox de imágenes en chunks funcional para cualquier formato de imagen (`useChunkImageLightbox`)
- Mutations de anotaciones invalidan correctamente los queries relacionados

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Duplicar lógica de keyword highlighting | FC-05 ya la gestiona; duplicarla causa inconsistencias | Coordinarse con FC-05 y leer su integración como solo lectura |
| Modificar `SummaryDetailView.tsx` (750L) con cambios grandes de una sola vez | Es el archivo más grande del módulo; cambios masivos rompen fácilmente | Refactorizar de forma incremental, función por función |
| Añadir atoms innecesarios a `reader-atoms.tsx` | Aumenta complejidad del estado global del reader | Usar estado local del componente cuando el scope es reducido |
| Modificar archivos fuera de la zona de ownership sin coordinación | Rompe el aislamiento entre agentes | Escalar al Arquitecto (XX-01) antes de tocar archivos externos |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
