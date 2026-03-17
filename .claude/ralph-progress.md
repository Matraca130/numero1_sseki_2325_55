# Ralph Progress Log
# ===================================
# Este archivo es leído y actualizado por Ralph en cada iteración.
# Contiene el estado actual del trabajo para mantener continuidad.
# NO editar manualmente (Ralph lo gestiona).

## Última iteración: 11
## Estado del build: PASS
## Branch: feature/mindmap-knowledge-graph

## Features completadas:
- [x] Search/filter de nodos con debounce
- [x] Fold/unfold de ramas (collapse/expand, Ctrl+[/])
- [x] Global graph (curso completo via courseTopicIds)
- [x] Student custom nodes/edges (AddNodeEdgeModal)
- [x] Professor "Agregar conexión" modal
- [x] AI auto-suggest connections button
- [x] Real-time cache invalidation (quiz/flashcard/summary completion)
- [x] MicroGraphPanel refactor (3 panels → 1 shared component)
- [x] Topic selector en KnowledgeMapView
- [x] useGraphSearch hook extraído
- [x] Long-press context menu (mobile)
- [x] Bottom sheet detail panel (mobile)
- [x] DeleteConfirmDialog (replaces window.confirm)
- [x] Mobile touch targets (44px+)
- [x] iOS Safari viewport zoom fix (16px inputs)
- [x] Mobile floating fit-view button
- [x] Edge legend accessible on mobile
- [x] Zoom bounds (min 0.15, max 5)
- [x] Course scope empty state
- [x] Context menu position clamping
- [x] Cache invalidation substring bug fix
- [x] Keyboard shortcuts: Ctrl+F, /, Ctrl+[, Ctrl+]
- [x] aria-live search announcements
- [x] role="menu", role="menuitem" on context menu
- [x] role="dialog", aria-modal on modals
- [x] ResizeObserver infinite loop fix (overflow:hidden + dimension comparison)

## Archivos modificados por Ralph (no commiteados):
- src/app/components/content/mindmap/KnowledgeGraph.tsx
- src/app/components/content/mindmap/GraphToolbar.tsx
- src/app/components/content/mindmap/MiniKnowledgeGraph.tsx
- src/app/components/content/mindmap/MicroGraphPanel.tsx
- src/app/components/content/mindmap/NodeContextMenu.tsx
- src/app/components/content/mindmap/NodeAnnotationModal.tsx
- src/app/components/content/mindmap/AddNodeEdgeModal.tsx
- src/app/components/content/mindmap/useGraphData.ts
- src/app/components/content/mindmap/useGraphSearch.ts (NUEVO)
- src/app/components/content/mindmap/index.ts
- src/app/components/content/KnowledgeMapView.tsx
- src/app/components/content/SummaryGraphPanel.tsx
- src/app/components/content/flashcard/SessionGraphPanel.tsx
- src/app/components/student/QuizSessionGraphPanel.tsx
- src/app/components/student/QuizTaker.tsx
- src/app/components/roles/pages/professor/ProfessorKnowledgeMapPage.tsx
- src/app/hooks/queries/useSummaryReaderMutations.ts
- src/app/services/mindmapApi.ts

## Pendiente (próximas iteraciones):
- [ ] Professor template maps (full CRUD UI)
- [ ] AI auto-suggest UI polish
- [ ] Student custom map merge UX improvements
- [ ] Skip navigation (a11y)
- [ ] Performance profiling para grafos grandes (100+ nodos)
- [ ] Mobile swipe-to-dismiss en detail panels
- [ ] Review session graph invalidation
- [ ] Toolbar wrapping en pantallas muy pequeñas

## Bugs conocidos:
(ninguno actualmente — ResizeObserver loop ya corregido)

## Notas técnicas:
- useGraphSearch hook extraído para compartir lógica entre student y professor
- G6 v5 API: setData + render para inicialización, updateNodeData + draw para updates
- Brand palette: #2a8c7a accent, #244e47 hover, #1B3B36 sidebar
- Student UI: Portugués brasileño / Professor UI: Español
