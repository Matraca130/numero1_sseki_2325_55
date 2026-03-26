# Knowledge Map — Plan de Mejoras (AntV G6 v5)
> Auto-generado. Los agentes leen este archivo cada 15 min para continuar.

## Estado actual (auditado 2026-03-26)
- GraphToolbar: undo/redo, fullscreen, layout switcher (5 layouts), hulls toggle — TODO PRESENTE
- useGraphInit: donut style props (innerR, donuts, donutPalette) — pero node type sigue como 'donut'
- Edges: cubic-vertical (dagre) y cubic-horizontal (mindmap) — YA configurados en init + layout switch
- graphI18n: 50+ keys pt/es — COMPLETO
- useGraphExport: usa i18n — SIN hardcoded strings
- GRAPH_COLORS.primaryRgb — EXISTE
- Shadow drag (drag-element) — YA aplicado
- Pointer capture overlap guard — YA aplicado

---

## CHECKLIST DE TAREAS

### FASE 1: History Plugin (Undo/Redo funcional) — PRIORIDAD ALTA ✅
- [x] 1.1 Plugin history ya existía en useGraphInit.ts (línea 783)
- [x] 1.2 Exponer undo()/redo() en GraphControls type + onReady callback
- [x] 1.3 Conectar via useGraphControls → ProfessorKnowledgeMapPage → GraphToolbar
- [x] 1.4 Toasts con i18n (undoToast/redoToast/nothingToUndo/nothingToRedo)
- [x] 1.5 Build verificado OK

### FASE 2: Donut Node Type verificación — PRIORIDAD ALTA
- [ ] 2.1 Verificar que G6 v5 registra 'donut' como node type válido
- [ ] 2.2 Si no existe, registrar custom node o usar extensión
- [ ] 2.3 Verificar que el anillo de mastery se renderiza correctamente
- [ ] 2.4 Test visual con nodos de mastery 0, 0.5, 1.0

### FASE 3: Fullscreen funcional — PRIORIDAD MEDIA
- [ ] 3.1 Implementar lógica fullscreen (Fullscreen API) en KnowledgeGraph.tsx
- [ ] 3.2 Conectar con GraphToolbar onFullscreen
- [ ] 3.3 Resize graph on fullscreen enter/exit
- [ ] 3.4 Verificar en navegador

### FASE 4: Hull groups funcional — PRIORIDAD MEDIA
- [ ] 4.1 Agregar plugin hull en useGraphInit.ts
- [ ] 4.2 Agrupar nodos por topic/category
- [ ] 4.3 Conectar toggle hulls desde toolbar
- [ ] 4.4 Verificar visual

### FASE 5: Mejoras de G6 (del análisis del repo) — PRIORIDAD MEDIA
- [ ] 5.1 Transform MapNodeSize — escalar nodos por importancia (degree/betweenness)
- [ ] 5.2 Transform ProcessParallelEdges — manejar edges duplicados con curvas
- [ ] 5.3 Fruchterman layout como alternativa interactiva a d3-force
- [ ] 5.4 Circular layout para prerequisite chains

### FASE 6: Refinamiento visual — PRIORIDAD BAJA
- [ ] 6.1 Animaciones de transición entre layouts
- [ ] 6.2 Edge labels con tipo de conexión
- [ ] 6.3 Tooltip mejorado con definición + mastery %
- [ ] 6.4 Dark mode support para el graph

---

## LOG DE EJECUCIÓN
| Fecha | Fase | Tarea | Estado | Notas |
|-------|------|-------|--------|-------|
| 2026-03-26 | Setup | Plan creado | DONE | Auditoría completa |
| 2026-03-26 | Fase 1 | 1.1-1.5 Undo/redo end-to-end | DONE | Plugin existía, agregó undo/redo a GraphControls, useGraphControls, ProfessorKnowledgeMapPage, con toasts i18n |
