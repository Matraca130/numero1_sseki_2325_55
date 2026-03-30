# Agent Memory: SM-01 (summaries-frontend-v2)
Last updated: 2026-03-30

## Rol
Agente frontend de resúmenes: gestiona el visor de estudiantes, el editor de profesores, paginación HTML, keyword highlighting inline, tracking de tiempo de lectura y CRUD de anotaciones de texto.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-26 | ViewerBlock uses IIFE pattern to wrap switch-case returns when adding post-render content (MasteryBar) | Use IIFE `(() => { switch ... })()` to capture switch output, then wrap with additional elements |
| 2026-03-26 | SidebarOutline.tsx was expected from ST-05 but not created — created it myself with mastery dot colors mirroring MasteryBar's scale | When a dependency task doesn't produce an expected file, create it within ownership zone rather than blocking indefinitely |
| 2026-03-26 | BookmarkButton + BookmarksPanel: useBookmarks hook uses localStorage with `axon-bookmarks-{summaryId}` key; hook co-located in BookmarksPanel.tsx for colocation | Export hook from panel file so integrator imports { useBookmarks } from BookmarksPanel |
| 2026-03-26 | Wave 3 integration: IIFE pattern reused for action bar (bookmark, notes, quiz buttons) below block content in ViewerBlock. SummaryViewer manages bookmarks/annotations/quiz state and passes handlers down. | Reuse IIFE pattern for cross-cutting block decorations; use Record<id, boolean> for per-block toggles |
| 2026-03-26 | TTSButton: Web Speech API needs synth.cancel() before synth.speak() to reset state reliably; onend/onerror both must reset speaking state; useRef for utterance avoids stale closure issues | Always cancel before speak; always handle both onend and onerror |
| 2026-03-26 | ReadingSettingsPanel: useReadingSettings hook co-located in same file, uses single localStorage key `axon-reading-settings` (global, not per-summary) for simplicity; exports interface + defaults + hook + component | Co-locate hook with panel; export both named (hook/types) and default (component) |
| 2026-03-27 | useUndoRedo `state` must be consumed — pushing snapshots without reading the restored state makes undo a no-op. The hook returns `state` but BlockEditor never destructured it, so undo/redo updated internal hook state while React Query blocks remained unchanged. | Always destructure and consume `state` from useUndoRedo. When undo restores a snapshot, apply it back via localBlockOverrides that merge with server data. |
| 2026-03-27 | Never add React Query data arrays (like `blocks`) to useCallback deps — it makes the callback reference unstable on every query refetch, defeating React.memo on child components (EditableBlock). | Use a ref (`blocksRef.current = blocks`) updated on every render, and read from the ref inside callbacks. This keeps deps stable while accessing current data. |
| 2026-03-30 | renderTextWithKeywords inline markdown: custom regex parser (code→bold→italic→image→hr order) avoids conflicts. Code backticks split FIRST to protect content from bold/italic parsing. | Process markdown patterns in specificity order: most-specific delimiters first. Never use a full markdown library for 5 inline patterns — regex is sufficient and keeps the function <100 lines. |
| 2026-03-30 | keyword-block-mapping.ts: SummaryBlock.type field is `type` not `block_type`. Content field structure varies by type — always handle missing/undefined content fields with `?? {}` and typeof checks. | Always verify actual type definitions before implementing — prompt descriptions may use different field names than the codebase. |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-26 | IIFE wrapping switch in ViewerBlock to add MasteryBar below block content | Avoids duplicating MasteryBar in every case branch; keeps switch clean | Duplicating MasteryBar in each case; creating a wrapper component |
| 2026-03-26 | SidebarOutline uses inline style for dot color (not Tailwind class) to match MasteryBar's design-system colors | Keeps mastery color logic consistent with MasteryBar; design-system hex values don't map to Tailwind classes | Using Tailwind bg-* classes with a mapping table |
| 2026-03-27 | Undo/redo applies snapshots via `localBlockOverrides` state that merges with React Query data, then persists each changed block to server | Keeps React Query as source of truth while providing immediate UI feedback; overrides auto-clear when server data catches up | (1) Calling updateMutation only without local state — too slow, UI flickers; (2) Replacing React Query data entirely — breaks cache consistency |
| 2026-03-30 | Custom regex inline markdown parser vs react-markdown library | renderTextWithKeywords runs hundreds of times per summary. 5 inline patterns don't justify a 50KB+ library. Regex parser is O(n), <100 lines, no deps. | react-markdown (overkill + bundle), marked (needs dangerouslySetInnerHTML), remark (AST overhead) |

## Patrones que funcionan
- Use `blocksRef` pattern: keep a ref synced with React Query data (`blocksRef.current = blocks`) and read from ref inside useCallback to avoid unstable deps
- `localBlockOverrides` state to bridge undo/redo snapshots with React Query server data — overrides merge with server blocks and clear when server catches up
- Jotai atoms en `reader-atoms.tsx` como estado central del reader — mantenerlos mínimos y cohesivos
- React Query para datos del servidor, separando queries y mutations en archivos dedicados (`useSummaryReaderQueries`, `useSummaryReaderMutations`)
- Paginación HTML determinista: el mismo contenido siempre produce las mismas páginas
- Reading time tracker que no cuenta tiempo inactivo (`useSummaryTimer` + `useReadingTimeTracker`)
- Lightbox de imágenes en chunks funcional para cualquier formato de imagen (`useChunkImageLightbox`)
- Mutations de anotaciones invalidan correctamente los queries relacionados
- renderTextWithKeywords inline markdown: split-by-delimiter pattern (code→bold→italic→image) avoids regex conflicts. Each level processes only non-matched segments from the previous level.
- keyword-block-mapping.ts: pure utility with `findKeywords(text)` helper + type-based field extraction. Bidirectional Map construction in single pass.

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
| Sesiones ejecutadas | 6 | 2026-03-30 |
| Quality-gate PASS | 1 | 2026-03-30 |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
