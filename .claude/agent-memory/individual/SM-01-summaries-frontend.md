# Agent Memory: SM-01 (summaries-frontend-v2)
Last updated: 2026-03-27

## Rol
Agente frontend de resúmenes: gestiona el visor de estudiantes, el editor de profesores, paginación HTML, keyword highlighting inline, tracking de tiempo de lectura y CRUD de anotaciones de texto.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-27 | useUndoRedo `state` must be consumed — pushing snapshots without reading the restored state makes undo a no-op. The hook returns `state` but BlockEditor never destructured it, so undo/redo updated internal hook state while React Query blocks remained unchanged. | Always destructure and consume `state` from useUndoRedo. When undo restores a snapshot, apply it back via localBlockOverrides that merge with server data. |
| 2026-03-27 | Never add React Query data arrays (like `blocks`) to useCallback deps — it makes the callback reference unstable on every query refetch, defeating React.memo on child components (EditableBlock). | Use a ref (`blocksRef.current = blocks`) updated on every render, and read from the ref inside callbacks. This keeps deps stable while accessing current data. |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-27 | Undo/redo applies snapshots via `localBlockOverrides` state that merges with React Query data, then persists each changed block to server | Keeps React Query as source of truth while providing immediate UI feedback; overrides auto-clear when server data catches up | (1) Calling updateMutation only without local state — too slow, UI flickers; (2) Replacing React Query data entirely — breaks cache consistency |

## Patrones que funcionan
- Use `blocksRef` pattern: keep a ref synced with React Query data (`blocksRef.current = blocks`) and read from ref inside useCallback to avoid unstable deps
- `localBlockOverrides` state to bridge undo/redo snapshots with React Query server data — overrides merge with server blocks and clear when server catches up
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
| Adding React Query data arrays to useCallback deps | Makes callback reference change on every refetch, breaks React.memo on children | Use a ref pattern: `const blocksRef = useRef(blocks); blocksRef.current = blocks;` and read ref in callback |
| Destructuring useUndoRedo without consuming `state` | Undo/redo becomes a no-op because the restored state is never applied back to the UI | Always destructure `state`, add a useEffect to apply restored snapshots via local overrides |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 1 | 2026-03-27 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
