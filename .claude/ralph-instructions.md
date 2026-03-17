# Ralph Loop — Instrucciones Vivas
# ===================================
# Editá este archivo EN CUALQUIER MOMENTO.
# El próximo ciclo del loop lo lee automáticamente.
# Para detener: cambiá STATUS a "STOP"

STATUS: RUNNING

# ── Proyecto ──────────────────────────────────────────────

Axon Platform Frontend — Feature: Mind Map / Knowledge Graph
Branch: feature/mindmap-knowledge-graph
Stack: React 18 + TypeScript + Vite + G6 (AntV) v5

# ── Tarea Actual ──────────────────────────────────────────

Continuar desarrollando y puliendo el mind map feature.
Todos los componentes base ya existen. Hay que:
- Buscar bugs, edge cases, y mejorar lo existente
- Agregar features faltantes del spec original
- Optimizar performance
- Asegurar calidad de producción

# ── Archivos del Feature ──────────────────────────────────

CORE:
- src/app/types/mindmap.ts — Types + connection metadata
- src/app/services/mindmapApi.ts — API service (topic/summary/course)
- src/app/components/content/mindmap/KnowledgeGraph.tsx — G6 canvas full
- src/app/components/content/mindmap/MiniKnowledgeGraph.tsx — Mini radial graph
- src/app/components/content/mindmap/GraphToolbar.tsx — Layout/zoom/legend
- src/app/components/content/mindmap/NodeContextMenu.tsx — Right-click actions
- src/app/components/content/mindmap/NodeAnnotationModal.tsx — Student notes
- src/app/components/content/mindmap/useGraphData.ts — Data fetching + LRU cache
- src/app/components/content/mindmap/useLocalGraph.ts — BFS subgraph

PAGES:
- src/app/components/content/KnowledgeMapView.tsx — Student full page
- src/app/components/roles/pages/professor/ProfessorKnowledgeMapPage.tsx — Professor page

MICRO-SESSIONS:
- src/app/components/content/SummaryGraphPanel.tsx — Summary reader
- src/app/components/content/flashcard/SessionGraphPanel.tsx — Flashcard session
- src/app/components/student/QuizSessionGraphPanel.tsx — Quiz session

INTEGRATIONS (modified):
- src/app/components/content/FlashcardView.tsx
- src/app/components/content/StudentSummaryReader.tsx
- src/app/components/content/flashcard/FlashcardSessionScreen.tsx
- src/app/components/student/QuizTaker.tsx
- src/app/components/layout/Sidebar.tsx
- src/app/components/roles/ProfessorLayout.tsx
- src/app/routes/study-student-routes.ts
- src/app/routes/professor-routes.ts

# ── Features del Spec que FALTAN implementar ──────────────

1. Student puede crear su propio mapa (custom nodes/edges)
2. Student puede mergear mapa auto-generado con el propio
3. Professor puede crear mapa base/template para students
4. AI auto-suggest connections para professors
5. Fold/unfold de ramas (XMind-like)
6. Search/filter nodes por nombre
7. Global graph (all topics in a course) — el API fetchGraphByCourse existe pero no hay UI
8. Real-time updates mientras el student estudia (refetch después de quiz/flashcard completion)

# ── Prioridades (ordenadas) ───────────────────────────────

1. Verificar que compile limpio con `npm run build`
2. Implementar search/filter de nodos en KnowledgeMapView
3. Agregar fold/unfold de ramas en KnowledgeGraph
4. Conectar global graph (selector "Todos los topicos" en KnowledgeMapView)
5. Mejorar responsive en mobile
6. Mejorar accesibilidad
7. Limpiar código

# ── Paleta Brand (OBLIGATORIA para UI de plataforma) ──────

- Dark Teal: #1B3B36 → Sidebar, botones principales
- Teal Accent: #2a8c7a → Logo, nav activo, links, focus
- Hover Teal: #244e47 → Hover de botones
- Dark Panel: #1a2e2a → Cards oscuros
- Page BG: #F0F2F5
- Cards: #FFFFFF
- Sidebar inactivo: #8fbfb3
- Logo subtitle: #6db5a5
- Progress gradient: #2dd4a8 → #0d9488
- Label concluído: #5cbdaa

NO usar: text-teal-*, bg-teal-*, border-teal-* (Tailwind genérico)
SÍ usar: text-[#2a8c7a], bg-[#2a8c7a], etc (hex exactos)
EXCEPCIÓN: Colores de mastery dentro de nodos (green/yellow/red/gray) son flexibles.

# ── Reglas ────────────────────────────────────────────────

- Trabajo 100% autónomo, no parar a preguntar
- Subagentes: Opus o Sonnet, NUNCA Haiku
- TODA la UI en ESPAÑOL (student Y professor)
- npm run build después de cada cambio
- Si algo falla 2 veces, skip y anotar
- No modificar src/app/components/ui/ (shadcn primitives)
- No crear archivos .md innecesarios
- Usar ErrorBoundary en todo componente G6
- Import paths siempre con @/ alias
- Lazy loading para páginas nuevas

# ── Principios de Ingeniería (OBLIGATORIOS) ───────────────

1. PLANIFICAR antes de ejecutar. Si la tarea tiene varios pasos,
   hacer un plan mental primero. Si te desvías, volver al plan.

2. SUBAGENTES especializados: uno investiga, otro analiza, otro
   implementa. Cada subagente tiene un solo objetivo.

3. AUTO-MEJORA: después de cada error corregido, preguntarse
   "¿cómo evito esto en el futuro?" y aplicar la lección.

4. VERIFICAR antes de terminar: nunca marcar algo como hecho
   sin comprobar. Preguntarse "¿un ingeniero senior aprobaría esto?"
   Comparar antes vs después. Demostrar que funciona.

5. ELEGANCIA: buscar la solución más simple. Si parece improvisado,
   hay mejor arquitectura. KISS. No sobre-ingenierizar.

6. CORRECCIÓN AUTÓNOMA: si hay error, arreglarlo directamente.
   Buscar causa raíz, no parches temporales.

7. IMPACTO MÍNIMO: cambiar solo lo necesario. Simplicidad primero.

# ── Modelo ────────────────────────────────────────────────

OBLIGATORIO: Usar modelo Opus (claude-opus-4-20250514) como principal.
Sonnet solo para subagentes de tareas livianas (búsqueda rápida).
NUNCA usar Haiku bajo ninguna circunstancia.

# ── IMPORTANTE ────────────────────────────────────────────

NUNCA digas RALPH_COMPLETE. Siempre hay más que mejorar.
Después de implementar features, pasá a:
- Verificar calidad de TODO lo implementado
- Buscar bugs y edge cases
- Mejorar UX/UI
- Optimizar performance
- Limpiar código
- Agregar tests si hay test runner
Al final de cada iteración di: "ITERATION_DONE — next: [lo que sigue]"

# ── Notas / Cambios en caliente ───────────────────────────

(ninguna)

