# Axon v4.4 — Figma Make Session Guidelines

> **LEE ESTO PRIMERO.** Este archivo es la fuente de verdad para esta sesion de Figma Make.
> Antes de hacer CUALQUIER cambio, lee este archivo completo.

---

## Que es esta sesion

Esta sesion de Figma Make es EXCLUSIVAMENTE la **sesion de resumen** de Axon.
Cubre dos experiencias:

1. **Profesor** — crea y edita resumenes, keywords, subtopics, conexiones, notas del profesor, flashcards, quiz questions, videos
2. **Alumno** — lee resumenes, ve keywords con popup, toma notas personales, anota texto, ve videos, trackea progreso de lectura

**NO** toques nada fuera de este scope (dashboards, quizzes standalone, flashcards standalone, admin, owner, billing, 3D models, study sessions, etc.).

---

## Arquitectura

- **Frontend:** React 18 + Vite + Tailwind CSS 4 + shadcn/ui + Lucide icons
- **Backend:** Hono web server en Supabase Edge Functions (Deno) — repo separado `Matraca130/axon-backend`
- **Base de datos:** Supabase PostgreSQL con 39 tablas y RLS
- **State management:** React Query v5 (TanStack Query) — NO useState/useEffect para fetching
- **Tipografia editorial:** clase CSS custom `axon-prose` en `/src/styles/theme.css` — **NUNCA usar `@tailwindcss/typography`**

---

## Conexion al Backend

```
Base URL (produccion): https://xdnciktarvxyhkrokbng.supabase.co/functions/v1/server
Prefijo backend:       PREFIX = "/server"
```

Headers requeridos en TODAS las peticiones:
```
Authorization:  Bearer {publicAnonKey}      ← SIEMPRE (gateway Supabase, FIJO)
X-Access-Token: {JWT del usuario logueado}  ← rutas autenticadas
```

La ANON_KEY esta hardcodeada en `/src/app/lib/api.ts`.

### Patron de respuestas
- Exito: `{ "data": ... }`
- Error: `{ "error": "mensaje descriptivo" }`
- Listas paginadas (factory CRUD): `{ "data": { "items": [...], "total": N, "limit": N, "offset": N } }`
- Listas custom (array plano): `{ "data": [...] }`
- Objeto unico o null: `{ "data": { ... } }` o `{ "data": null }`

---

## Archivos en scope (SOLO estos)

### Rutas
| Archivo | Funcion |
|---|---|
| `/src/app/routes/summary-student-routes.ts` | Rutas del alumno para resumenes |
| `/src/app/routes/professor-routes.ts` | Rutas del profesor (incluye `summary/:topicId`) |

### Paginas principales
| Archivo | Funcion |
|---|---|
| `/src/app/components/content/SummaryView.tsx` | Entry point compartido profesor+alumno (`/professor/summary/:topicId` y `/student/summary/:topicId`) |
| `/src/app/components/content/StudentSummaryReader.tsx` | Lector de resumen del alumno con todas las features |
| `/src/app/components/content/StudentSummariesView.tsx` | Vista de lista de resumenes del alumno |
| `/src/app/components/content/TopicSummariesView.tsx` | Vista de resumenes por topico |

### Componentes del profesor (editor de contenido)
| Archivo | Funcion |
|---|---|
| `/src/app/components/professor/KeywordsManager.tsx` | CRUD de keywords del resumen |
| `/src/app/components/professor/SubtopicsPanel.tsx` | CRUD de subtopics por keyword |
| `/src/app/components/professor/KeywordConnectionsPanel.tsx` | CRUD de conexiones entre keywords |
| `/src/app/components/professor/ProfessorNotesPanel.tsx` | CRUD de notas del profesor sobre keywords |
| `/src/app/components/professor/VideosManager.tsx` | CRUD de videos del resumen |
| `/src/app/components/professor/EditorSidebar.tsx` | Sidebar del editor del profesor |
| `/src/app/components/professor/QuickKeywordCreator.tsx` | Crear keywords rapido desde el editor |
| `/src/app/components/professor/KeywordClickPopover.tsx` | Popover al hacer click en keyword (profesor) |

### Componentes del alumno (lectura + estudio)
| Archivo | Funcion |
|---|---|
| `/src/app/components/student/KeywordPopup.tsx` | Hub central por keyword — orchestrator (delegates to 3 section components) |
| `/src/app/components/student/KeywordBadges.tsx` | Badges de keywords en el resumen |
| `/src/app/components/student/KeywordHighlighterInline.tsx` | Resalta keywords inline en el HTML del resumen |
| `/src/app/components/student/InlineKeywordPopover.tsx` | Popover inline al tocar keyword |
| `/src/app/components/student/SummaryViewer.tsx` | Viewer del contenido del resumen |
| `/src/app/components/student/TextHighlighter.tsx` | Anotaciones de texto (subrayados + notas) |
| `/src/app/components/student/ConnectionsMap.tsx` | Mapa visual de conexiones |
| `/src/app/components/student/ConnectForm.tsx` | Formulario inline de conexiones entre keywords |
| `/src/app/components/student/KeywordDefinitionSection.tsx` | Seccion de definicion + notas del profesor + notas del alumno (CRUD) |
| `/src/app/components/student/KeywordConnectionsSection.tsx` | Seccion de conexiones: mapa SVG + lista + cross-summary + ConnectForm |
| `/src/app/components/student/KeywordActionsSection.tsx` | Seccion de acciones: flashcard/quiz counts + AI explain + chat |
| `/src/app/components/student/ReaderHeader.tsx` | Header del lector: breadcrumb + header card + paginated content + completion |
| `/src/app/components/student/ReaderChunksTab.tsx` | Tab de chunks del lector (SummaryViewer + KHI) |
| `/src/app/components/student/ReaderKeywordsTab.tsx` | Tab de keywords del lector: expand, subtopics, note CRUD |
| `/src/app/components/student/ReaderAnnotationsTab.tsx` | Tab de anotaciones del lector: create (color picker), delete (optimistic) |
| `/src/app/components/student/reader-atoms.tsx` | Atomos compartidos del lector (ListSkeleton, TabBadge) |
| `/src/app/components/student/VideoPlayer.tsx` | Reproductor de video |
| `/src/app/components/student/VideoNoteForm.tsx` | Formulario de notas en video |
| `/src/app/components/student/SmartPopup.tsx` | Popup inteligente (posicionamiento) |
| `/src/app/components/student/ViewerBlock.tsx` | Bloque individual del viewer |
| `/src/app/components/student/ImageLightbox.tsx` | Lightbox para imagenes |
| `/src/app/components/student/AnnotationTimeline.tsx` | Timeline de anotaciones |
| `/src/app/components/student/HighlightToolbar.tsx` | Toolbar de resaltado |

### Componentes compartidos del resumen
| Archivo | Funcion |
|---|---|
| `/src/app/components/summary/SummaryHeader.tsx` | Header del resumen (titulo, breadcrumb) |
| `/src/app/components/summary/ChunkRenderer.tsx` | Renderiza chunks del resumen |

### Hooks (data layer — React Query)
| Archivo | Funcion |
|---|---|
| `/src/app/hooks/queries/queryKeys.ts` | Factory de query keys centralizada |
| `/src/app/hooks/queries/staleTimes.ts` | Tiempos de stale configurados |
| `/src/app/hooks/queries/useSummaryViewQueries.ts` | Queries para SummaryView (summaries, chunks, reading state, annotations) |
| `/src/app/hooks/queries/useSummaryReaderQueries.ts` | Queries para StudentSummaryReader |
| `/src/app/hooks/queries/useKeywordPopupQueries.ts` | 5 queries + 3 mutations para KeywordPopup |
| `/src/app/hooks/queries/useSummaryReaderMutations.ts` | 7 mutations + thin handlers para StudentSummaryReader |
| `/src/app/hooks/queries/useKeywordDetailQueries.ts` | Queries de detalle por keyword |
| `/src/app/hooks/queries/useKeywordMasteryQuery.ts` | Mastery (BKT) por keyword |
| `/src/app/hooks/queries/useKeywordsManagerQueries.ts` | Queries para KeywordsManager (profesor) |
| `/src/app/hooks/queries/useProfessorNotesQueries.ts` | Queries para notas del profesor |
| `/src/app/hooks/queries/useSubtopicMutations.ts` | Mutations para subtopics |
| `/src/app/hooks/queries/useAnnotationMutations.ts` | Mutations para anotaciones de texto |
| `/src/app/hooks/queries/useVideoPlayerQueries.ts` | Queries para video player |
| `/src/app/hooks/queries/useVideosManagerQueries.ts` | Queries para videos manager (profesor) |
| `/src/app/hooks/queries/useSummaryBlocksQuery.ts` | Query para summary blocks |
| `/src/app/hooks/queries/useKeywordSuggestionsQuery.ts` | Sugerencias de keywords de resumenes hermanos (mismo topico) |
| `/src/app/hooks/useKeywordNavigation.ts` | Navegacion cross-topic entre keywords (3 cases) |
| `/src/app/hooks/useSummaryViewer.ts` | Logica del viewer de resumen |
| `/src/app/hooks/useTextAnnotations.ts` | Logica de anotaciones de texto |
| `/src/app/hooks/useSmartPopupPosition.ts` | Posicionamiento inteligente de popups |
| `/src/app/hooks/useReadingTimeTracker.ts` | Tracking confiable de tiempo de lectura (4-layer persistence) |

### Services (API layer)
| Archivo | Funcion |
|---|---|
| `/src/app/services/summariesApi.ts` | CRUD de summaries, chunks, keywords, subtopics (profesor) |
| `/src/app/services/studentSummariesApi.ts` | Reading states, text annotations, kw notes, video notes (alumno) |

### Lib (utilidades)
| Archivo | Funcion |
|---|---|
| `/src/app/lib/api.ts` | `apiCall()` wrapper con headers + `setAccessToken/getAccessToken` |
| `/src/app/lib/api-helpers.ts` | `extractItems()` — normaliza respuestas paginadas vs arrays |
| `/src/app/lib/mastery-helpers.ts` | Calculo de mastery (BKT states) |
| `/src/app/lib/summary-content-helpers.tsx` | Helpers de contenido: enrichHtml, paginate, renderPlainLine, CONTENT_PAGE_SIZE |
| `/src/app/lib/connection-types.ts` | Tipos de conexion entre keywords |
| `/src/app/lib/queryClient.ts` | Instancia de React Query client |

### Estilos
| Archivo | Funcion |
|---|---|
| `/src/styles/theme.css` | Tokens de diseno + clase `axon-prose` (editorial reading experience) |
| `/src/app/components/design-kit.tsx` | Primitivas de UI compartidas |

---

## Archivos PROTEGIDOS (NUNCA modificar)

| Archivo | Razon |
|---|---|
| `/src/app/App.tsx` | Provider hierarchy — cualquier cambio rompe auth |
| `/src/app/routes.tsx` | Routing global |
| `/src/app/contexts/AuthContext.tsx` | Auth provider |
| `/src/app/context/AuthContext.tsx` | Auth provider (alias) |
| `/src/app/components/auth/*` | Auth guards y login |
| `/src/app/context/AppContext.tsx` | Global context |
| `/src/app/context/StudentDataContext.tsx` | Student data context |
| `/src/app/context/PlatformDataContext.tsx` | Platform data context |
| `*Layout.tsx` (cualquiera) | AdminLayout, ProfessorLayout, OwnerLayout, StudentLayout |
| `/src/app/components/figma/ImageWithFallback.tsx` | Sistema protegido |
| `/pnpm-lock.yaml` | Sistema protegido |

---

## API Reference — Endpoints de resumenes

### Contenido (profesor crea, alumno lee)

```
GET    /summaries?topic_id=xxx
GET    /summaries/:id
POST   /summaries   { topic_id, title, content_markdown?, status?, order_index? }
PUT    /summaries/:id   { title?, content_markdown?, status?, order_index?, is_active? }
DELETE /summaries/:id   → soft-delete
PUT    /summaries/:id/restore

GET    /chunks?summary_id=xxx
POST   /chunks   { summary_id, content, order_index?, metadata? }
PUT    /chunks/:id   { content?, order_index?, metadata? }
DELETE /chunks/:id   → hard delete

GET    /keywords?summary_id=xxx
GET    /keywords/:id
POST   /keywords   { summary_id, name, definition?, priority? }
PUT    /keywords/:id   { name?, definition?, priority?, is_active? }
DELETE /keywords/:id   → soft-delete

GET    /subtopics?keyword_id=xxx
POST   /subtopics   { keyword_id, name, order_index? }
PUT    /subtopics/:id   { name?, order_index?, is_active? }
DELETE /subtopics/:id   → soft-delete
```

Max 6 subtopics por keyword.

```
GET    /keyword-connections?keyword_id=xxx
POST   /keyword-connections   { keyword_a_id, keyword_b_id, relationship? }
       → canonical order enforcement: a < b (automatic)
DELETE /keyword-connections/:id   → hard delete

GET    /keyword-search?q=xxx&exclude_summary_id=yyy&course_id=zzz&limit=15
       → Cross-summary keyword search (institution-scoped, uses RPC)
       → Returns: [{ id, name, summary_id, definition, summary_title }]
       → Flat route (NOT /keywords/search — avoids CRUD factory collision)

GET    /kw-prof-notes?keyword_id=xxx
POST   /kw-prof-notes   { keyword_id, note }  → upsert
DELETE /kw-prof-notes/:id

GET    /flashcards?summary_id=xxx&keyword_id=xxx(op)
GET    /quiz-questions?summary_id=xxx&keyword_id=xxx(op)
GET    /videos?summary_id=xxx
```

### Datos del alumno (privados, scopeToUser)

```
GET    /kw-student-notes?keyword_id=xxx
POST   /kw-student-notes   { keyword_id, note }
PUT    /kw-student-notes/:id   { note? }
DELETE /kw-student-notes/:id   → soft-delete

GET    /text-annotations?summary_id=xxx
POST   /text-annotations   { summary_id, start_offset, end_offset, color?, note? }
PUT    /text-annotations/:id   { color?, note? }
DELETE /text-annotations/:id   → soft-delete

GET    /video-notes?video_id=xxx
POST   /video-notes   { video_id, timestamp_seconds?, note }
PUT    /video-notes/:id   { timestamp_seconds?, note? }
DELETE /video-notes/:id   → soft-delete

GET    /reading-states?summary_id=xxx   → null si nunca leyo
POST   /reading-states   { summary_id, scroll_position?, time_spent_seconds?, completed?, last_read_at? }
       → upsert automatico por student_id+summary_id

GET    /content-tree?institution_id=xxx   → arbol completo para navegacion
```

### Reordenar

```
PUT /reorder   { table: "chunks"|"summaries"|"subtopics"|"videos", items: [{ id, order_index }] }
```

---

## Reglas de desarrollo

### Tipografia
- Usar clase `axon-prose` (definida en `/src/styles/theme.css`) para contenido editorial
- **NUNCA** instalar ni usar `@tailwindcss/typography`
- Fuente serif: Lora. Fuente sans: Inter.

### Data fetching
- **SIEMPRE** usar React Query v5 (useQuery/useMutation) — NUNCA useState+useEffect para fetching
- Query keys centralizadas en `queryKeys.ts`
- Usar `extractItems()` de `api-helpers.ts` para normalizar respuestas
- Cache seeding cuando sea posible (batch → individual)
- Stale times configurados en `staleTimes.ts`

### Rutas del backend
- **TODAS** las rutas son FLAT con query params. **NUNCA** rutas anidadas.
- CORRECTO: `GET /summaries?topic_id=xxx`
- INCORRECTO: `GET /topics/:id/summaries`

### Keyword connections
- `keyword_connections` tiene canonical order enforcement: `keyword_a_id < keyword_b_id`
- El backend lo aplica automaticamente en POST

### Subtopics
- Maximo 6 por keyword

### Diseno
- Dark mode por defecto en areas de lectura (bg-zinc-950, text-white)
- Paleta oficial "Axon Medical Academy":
  - Dark Teal: #1B3B36
  - Teal Accent: #2a8c7a (accent principal)
  - Hover Teal: #244e47
  - Dark Panel: #1a2e2a
  - Fondos pagina: #F0F2F5 / cards: #FFFFFF
  - Progress Ring gradient: #2dd4a8 → #0d9488
  - Sidebar texto inactivo: #8fbfb3
  - Subtitulo logo: #6db5a5
  - Label "Concluido": #5cbdaa
- Tailwind accent: teal-* (NUNCA violet/indigo como accent general)
- Componentes shadcn/ui
- Iconos: lucide-react

---

## Jerarquia de datos

```
Institution → Course → Semester → Section → Topic → Summary
  Summary → Chunks, Keywords, Flashcards, Quiz Questions, Videos
  Keywords → Subtopics, Keyword Connections, Prof Notes, Student Notes
```

---

## Issues preexistentes (documentados, no corregidos)

1. `useVideoNotesQuery` usa `userId` en `queryFn` pero no en `queryKey` — puede servir datos incorrectos si el usuario cambia
2. Type mismatch menor en `useUpdateAnnotationMutation`
3. Cache key `summaryVideos` compartida entre roles profesor/alumno — puede servir datos stale si el mismo usuario cambia de rol
4. `summarySubCounts` no se invalida por mutations en componentes hijos

---

## Fixes aplicados en esta sesion

### FIX-IMG: Imagenes no renderizaban en el lector del alumno

**Problema:** `SummaryView.tsx` usaba `TextHighlighter` para el path del alumno, que concatena chunks como texto plano y renderiza via `{seg.text}` en `<span>` — React escapa todo el HTML, incluyendo `<img>`, headings, listas, etc.

**Solucion:** Se unifico el path del alumno para delegar a `StudentSummaryReader` (que usa `dangerouslySetInnerHTML` + `enrichHtmlWithImages` + clase `axon-prose`). SummaryView ahora solo maneja: (1) lista de resumenes, (2) early return a StudentSummaryReader para alumnos, (3) path del profesor con ChunkRenderer + KeywordsManager + VideosManager.

**Archivos modificados:** `/src/app/components/content/SummaryView.tsx` (rewrite — eliminado TextHighlighter, KeywordBadges, VideoPlayer, clsx, studentApi, reading tracking dead code)

**Imports eliminados:** `TextHighlighter`, `KeywordBadges`, `VideoPlayer`, `clsx`, `studentApi`, `CheckCircle2`, `AnimatePresence`, `useToggleCompletedMutation`, `useSummaryAnnotationsQuery`

### FIX-NAV: Cross-summary keyword navigation en ruta /student/summary/:topicId

**Problema:** `SummaryView.tsx` no pasaba `onNavigateKeyword` a `StudentSummaryReader`, asi que al hacer click en una conexion de keyword en `KeywordPopup`, el handler era `undefined` y no ocurria nada. `StudentSummariesView` (ruta `/student/summaries`) si lo hacia via `useKeywordNavigation` hook, pero `SummaryView` no.

**Solucion:** Se agrego `handleNavigateKeyword` como `useCallback` en `SummaryView.tsx` con los mismos 3 cases:
- Case A (mismo resumen): scroll + flash violeta al `[data-keyword-id]` en DOM
- Case B (otro resumen, mismo topico): `setSelectedSummaryId(targetId)` → React re-renders
- Case C (cross-topic): `summariesApi.getSummary(targetId)` → `navigate('/student/summary/:newTopicId?summaryId=xxx')` → SummaryView re-mounts con nuevo topicId y auto-select del query param

**Archivo modificado:** `/src/app/components/content/SummaryView.tsx`
**Imports agregados:** `useCallback`, `toast` (sonner), `summariesApi`
**Props nuevos pasados:** `onNavigateKeyword={handleNavigateKeyword}` a `StudentSummaryReader`
**Sin nuevos archivos, hooks, ni cambios al backend.**

**Diferencia clave vs `useKeywordNavigation`:** Case C usa URL navigation (`navigate()`) en vez de context mutation (`selectTopic()`) porque `SummaryView` recibe topicId de URL params, no de un context provider. Esto evita la necesidad de `pendingNavRef` — el query param `summaryId` se lee en el `useState` initializer al montar.

### FIX-XCONN: Cross-summary search deshabilitado en KeywordClickPopover

**Problema:** `KeywordClickPopover.tsx` renderizaba `KeywordConnectionsPanel` sin pasar `summaryId`, lo que deshabilitaba la busqueda cross-summary (boton "Buscar en el curso" oculto). Solo mostraba keywords del mismo resumen. `KeywordsManager.tsx` si lo pasaba correctamente — inconsistencia entre los dos entry points del panel de conexiones.

**Solucion:** Agregar `summaryId={keyword.summary_id}` al render de `KeywordConnectionsPanel` dentro de `KeywordClickPopover`. El tipo `SummaryKeyword` ya tenia `summary_id`, no se necesitaron nuevos props en `KeywordClickPopover`.

**Archivo modificado:** `/src/app/components/professor/KeywordClickPopover.tsx` (1 linea agregada)
**Sin nuevos archivos, hooks, ni cambios al backend.**

### FIX-KWSEARCH: Keyword search 404 — route collision + flat route rename + RPC

**Problema:** `GET /keywords/search` colisionaba con el CRUD factory `GET /keywords/:id`. Hono monta sub-routers FIFO via `.route()`, asi que `contentCrudRoutes` (montado primero) capturaba `search` como `:id`, intentaba resolver la institucion para un keyword con id="search" y devolvia 404 "Cannot resolve institution for this resource".

**Causa raiz:** La ruta `/keywords/search` era semi-anidada y violaba la convencion "FLAT routes with query params" del proyecto.

**Solucion (3 partes):**
1. **Backend** — Renombrar path de `${PREFIX}/keywords/search` a `${PREFIX}/keyword-search` (ruta flat). Reemplazar 7 queries secuenciales (~35ms) con un solo `db.rpc('search_keywords_by_institution')` (~5ms). La migracion SQL ya estaba aplicada.
2. **Backend** — Reordenar mount en `content/index.ts`: `keywordSearchRoutes` antes de `contentCrudRoutes` (defense-in-depth).
3. **Frontend** — Actualizar `KeywordConnectionsPanel.tsx` linea 180: `/keywords/search` → `/keyword-search`.

**PR backend:** https://github.com/Matraca130/axon-backend/pull/21 (branch `fix/keyword-search-flat-route-rpc`)
**Archivos backend:** `routes/content/keyword-search.ts`, `routes/content/index.ts`
**Archivo frontend:** `/src/app/components/professor/KeywordConnectionsPanel.tsx`

### FEAT-KWSUGGESTIONS: Keyword recommendations from sibling summaries

**Feature:** Cuando el profesor activa el modo busqueda cross-summary y el input esta vacio, se muestran automaticamente keywords de otros resumenes del mismo topico como sugerencias proactivas.

**Implementacion:**
- Nuevo hook `useKeywordSuggestionsQuery.ts` con React Query v5 (cumple GUIDELINES)
- Query key: `queryKeys.kwSuggestions(summaryId)`, stale time: `SUGGESTIONS_STALE` (5 min)
- Usa 3 endpoints existentes (sin backend nuevo): `GET /summaries/:id` → `GET /summaries?topic_id=x` → `GET /keywords?summary_id=x` (paralelo por sibling)
- Auto-resuelve `topicId` desde `summaryId` (sin prop drilling)
- Filtra keywords ya conectados en render time (conexiones cambian mientras cache vive)
- UI: dropdown con header "Sugerencias del topico" + icono Sparkles (amber)

**Archivos creados:** `/src/app/hooks/queries/useKeywordSuggestionsQuery.ts`
**Archivos modificados:** `queryKeys.ts` (+1 key), `staleTimes.ts` (+1 constant), `KeywordConnectionsPanel.tsx` (+hook, +UI)
**Sin cambios en props de componentes padres — backward-compatible.**

### FIX-POPOVER: Inline keyword popover — migracion a @floating-ui/react

**Problema:** `InlineKeywordPopover` usaba `useSmartPosition.ts` con un `DOMRect` congelado (snapshot en el momento del click). No escuchaba scroll ni resize, cerraba con umbral arbitrario de 150px de scroll, y tenia un backdrop `fixed inset-0` que bloqueaba toda interaccion con la pagina.

**Causa raiz:** El modelo de posicionamiento era estatico (DOMRect frozen) cuando necesitaba ser dinamico (tracking del anchor element). Ademas, el backdrop era un workaround para click-outside que creaba un compositing layer innecesario.

**Solucion (3 pasos ejecutados):**
1. **KeywordHighlighterInline.tsx** — Cambio de prop: `anchorRect: DOMRect | null` → `anchorEl: HTMLElement | null`. Se almacena la referencia al span con `useState<HTMLElement | null>` en vez de congelar `getBoundingClientRect()`.
2. **InlineKeywordPopover.tsx** — Reescritura completa:
   - `useSmartPosition` → `useFloating()` + `autoUpdate()` (tracking dinamico de scroll, resize, layout shifts en TODOS los ancestor scroll containers)
   - Middlewares: `offset(10)` → `flip({padding:16})` → `shift({padding:12})` → `hide({strategy:'referenceHidden'})` → `arrow({element:arrowRef, padding:12})`
   - Backdrop `fixed inset-0` → `useDismiss()` (click-outside + Escape, zero DOM layers bloqueantes)
   - Scroll >150px threshold → `hide().referenceHidden` (cierra cuando el anchor sale del viewport)
   - `PopoverArrow` component (border-based) → `div.rotate-45` posicionado por `middlewareData.arrow`
   - Escape manual `keydown` listener → delegado a `useDismiss`
   - 3 event listeners manuales → 0 (todo delegado a Floating UI + useDismiss)
3. **useSmartPosition.ts** — Eliminado (190 lineas). Zero consumidores restantes.

**Metricas del cambio:**
- Event listeners manuales: 3 → 0
- useEffect: 2 → 1 (solo hide detection)
- useCallback: 1 → 0
- DOM layers en render: 3 (backdrop + motion + card) → 2 (motion + card)
- Componentes internos: 2 (PopoverArrow + main) → 1 (main)

**Archivos modificados:** `KeywordHighlighterInline.tsx` (prop change), `InlineKeywordPopover.tsx` (rewrite)
**Archivos eliminados:** `/src/app/hooks/useSmartPosition.ts`
**Archivos NO tocados (per plan):** `SmartPopup.tsx`, `useSmartPopupPosition.ts` (profesor — usa Radix, flujo independiente)
**Dependencia nueva:** `@floating-ui/react@0.27.19`
**Sin cambios al backend.**

### FIX-PROF-POPOVER: Professor keyword click popover — migracion a @floating-ui/react

**Problema:** `KeywordClickPopover` recibia `position: { top, left }` congelado (snapshot de `DOMRect` en el momento del click). No escuchaba scroll ni resize. Click-outside usaba `setTimeout(100ms)` hack. Escape era un listener manual. Mismos defectos que el popover inline del alumno (FIX-POPOVER).

**Causa raiz:** `SummaryDetailView` congelaba `rect.bottom` / `rect.left` en `useState` y los pasaba como props estaticos. `KeywordClickPopover` usaba `position: fixed` con esas coordenadas + clamping simple.

**Solucion (3 archivos):**
1. **TipTapEditor.tsx** — `onKeywordClick` signature: `(kwName, rect: DOMRect)` → `(kwName, anchorEl: HTMLElement)`. Pasa `kwEl` directo.
2. **SummaryDetailView.tsx** — `clickedKeywordPos: {top,left}` → `clickedKeywordEl: HTMLElement | null`. Pasa `anchorEl` a popover.
3. **KeywordClickPopover.tsx** — Rewrite de posicionamiento:
   - `position: {top,left}` prop → `anchorEl: HTMLElement` prop
   - Frozen coords + fixed + clamping → `useFloating()` + `autoUpdate()` (tracking dinamico)
   - Middlewares: `offset(10)` → `flip({padding:16})` → `shift({padding:12})` → `hide({strategy:'referenceHidden'})` → `arrow({element:arrowRef, padding:12})`
   - Click-outside `setTimeout(100ms)` hack → `useDismiss()` (zero hacks)
   - Escape manual `keydown` → delegado a `useDismiss()`
   - No scroll close → `hide().referenceHidden` (cierra cuando anchor sale del viewport)
   - Arrow posicionado por `middlewareData.arrow` (top/bottom aware)

**Metricas del cambio:**
- Event listeners manuales: 2 (mousedown + keydown) → 0
- useEffect: 2 → 1 (solo hide detection)
- setTimeout hacks: 1 → 0
- Posicionamiento: estatico (frozen coords) → dinamico (autoUpdate)

**Archivos modificados:** `TipTapEditor.tsx` (callback signature), `SummaryDetailView.tsx` (state type), `KeywordClickPopover.tsx` (rewrite)
**Archivos NO tocados:** `SmartPopup.tsx`, `useSmartPopupPosition.ts`, `EditableKeyword.tsx`
**Sin cambios al backend. Sin nuevas dependencias (usa @floating-ui/react ya instalado).**

### FIX-QUALITY: Auditoria de rendimiento y calidad post-popover migration

**Contexto:** Tras completar FIX-POPOVER y FIX-PROF-POPOVER, se realizo una auditoria exhaustiva de toda la cadena de archivos involucrada en ambos flujos (alumno y profesor). Se identificaron 5 issues de calidad de codigo, de los cuales 4 se ejecutaron y 1 se cancelo con justificacion.

**Fixes ejecutados:**

1. **(I1) `InlineKeywordPopover.tsx` — Hoistar `STATIC_SIDE_MAP` a module scope**
   - Problema: el mapa `{ top:'bottom', right:'left', ... }` se re-creaba en cada render como objeto literal inline
   - Solucion: extraer a constante `const STATIC_SIDE_MAP: Record<string, string>` en module scope (L34-39), identica a la ya existente en `KeywordClickPopover.tsx`
   - Razon: consistencia entre ambos popovers + elimina allocation innecesaria por render

2. **(I2) `KeywordClickPopover.tsx` — Eliminar `onConnectionsChanged` dead prop**
   - Problema: la interface `KeywordClickPopoverProps` declaraba `onConnectionsChanged?: () => void` con JSDoc, pero el prop nunca se destructuraba en el componente ni se pasaba desde ningun consumer
   - Solucion: eliminar las 2 lineas (JSDoc + prop) de la interface
   - Razon: dead code genera confusion — un desarrollador futuro podria pensar que tiene efecto

3. **(P2) `SummaryDetailView.tsx` — Estabilizar callbacks pasados a TipTapEditor**
   - Problema: `onKeywordsClick`, `onVideosClick` y `onCreateKeywordFromSelection` se pasaban como inline arrows, creando nuevas referencias en cada render y potencialmente causando re-renders innecesarios de TipTapEditor
   - Solucion:
     - `onKeywordsClick={() => setShowKeywords(true)}` → `handleKeywordsClick = useCallback(() => setShowKeywords(true), [])` (deps vacias porque `setShowKeywords` es identity-stable por React)
     - `onVideosClick={() => setShowVideos(true)}` → `handleVideosClick = useCallback(() => setShowVideos(true), [])` (idem)
     - `onCreateKeywordFromSelection={(text, rect) => quickKw.triggerFromEditor(text, rect)}` → `onCreateKeywordFromSelection={quickKw.triggerFromEditor}` (referencia directa — `triggerFromEditor` ya es `useCallback([], [])` en `QuickKeywordCreator.tsx`)
   - Razon: TipTapEditor es un componente pesado (editor TipTap + decoraciones + selection bubble) — callbacks inestables pueden triggear re-renders costosos

4. **(B2) `KeywordHighlighterInline.tsx` — Prevenir spans anidados en re-run del TreeWalker**
   - Problema: el useEffect del TreeWalker inyectaba `<span class="axon-kw-highlight">` en el DOM. Cuando las deps cambiaban (e.g. `keywordMasteryMap` se actualiza tras BKT response), el effect re-corria SOBRE el DOM ya modificado — el walker encontraba text nodes DENTRO de highlight spans existentes y los wrapeaba de nuevo, creando `<span.axon-kw-highlight> <span.axon-kw-highlight> keyword </span> </span>`
   - Solucion:
     - Nueva funcion module-scope `stripHighlights(container)`: hace `querySelectorAll('.axon-kw-highlight')`, reemplaza cada span con un text node de su `textContent`, y llama `container.normalize()` para fusionar text nodes adyacentes
     - Llamar `stripHighlights(container)` al INICIO del effect (antes del TreeWalker) como defensa
     - Retornar cleanup function: `() => { if (containerRef.current) stripHighlights(containerRef.current) }` para que React limpie antes del siguiente run o en unmount
   - `normalize()` es critico: sin el, "Mito" + "condria" quedan como 2 text nodes adyacentes y la regex no matchea "Mitocondria" como unidad
   - Event listeners en spans removidos son garbage-collected automaticamente (no se necesita `removeEventListener` manual)
   - Razon: bug real — spans anidados alteran los estilos visuales (doble border, doble background) y rompen el click handler (multiples event handlers disparan)

**Fix cancelado:**

5. **(Q1) Extraer `KeywordCard` de `SummaryDetailView.tsx` — CANCELADO**
   - Razon: el card de keyword en el sidebar necesitaria ~25 props (keyword data, edit state, delete handlers, connection counts, mastery data, etc.) — la extraccion empeoraria la legibilidad en vez de mejorarla. El componente actual es un bloque render cohesivo que se lee secuencialmente.

**Archivo eliminado:**
- `/src/imports/use-smart-position-1.ts` — copia historica de referencia del hook `useSmartPosition` (eliminado en FIX-POPOVER). 0 importadores confirmado. El hook activo diferente `useSmartPopupPosition.ts` (usado por `SmartPopup.tsx` y `EditableKeyword.tsx`) NO fue afectado.

**Archivos modificados:** `InlineKeywordPopover.tsx`, `KeywordClickPopover.tsx`, `SummaryDetailView.tsx`, `KeywordHighlighterInline.tsx`
**Archivos eliminados:** `/src/imports/use-smart-position-1.ts`
**Archivos NO tocados:** `SmartPopup.tsx`, `useSmartPopupPosition.ts`, `TipTapEditor.tsx`, `KeywordPopup.tsx`, `EditableKeyword.tsx`
**Sin cambios al backend. Sin nuevas dependencias.**

### FIX-I1-I3-I4: Auditoria post-navegacion cross-summary (3 fixes)

**Contexto:** Tras confirmar que la cadena de navegacion cross-summary esta intacta (props pasan correctamente en 7 niveles), se realizo una auditoria detallada que identifico 4 issues. 3 se ejecutaron, 1 se difirio (I2: mastery en mapNodes).

**Fixes ejecutados:**

1. **(I1) `KeywordHighlighterInline.tsx` — Guard TreeWalker effect contra popup abierto**
   - Problema: si BKT refetcha mientras popup esta abierto, `keywordMasteryMap` cambia → useEffect re-ejecuta → `stripHighlights()` destruye TODOS los spans `.axon-kw-highlight`, incluido el anchor del popover → `autoUpdate` detecta reference gone → `hide.referenceHidden = true` → popup se cierra inesperadamente
   - Solucion: ref `isPopupOpenRef` (actualizado cada render) + guard `if (activeKeywordId) return` en effect body + guard `!isPopupOpenRef.current` en cleanup. `activeKeywordId` agregado a deps para re-run automatico cuando popup cierra → highlights se refrescan con mastery actualizado
   - Flujo verificado: popup abre (skip strip) → BKT refetcha (skip strip) → popup cierra (strip + re-walk con fresh mastery) → todo correcto

2. **(I3) `KeywordPopup.tsx` — Helper `closeAndNavigate` + rAF reemplaza setTimeout(50)**
   - Problema: 3 handlers separados usaban `onClose(); setTimeout(() => onNavigateKeyword(...), 50)` — patron duplicado con timeout arbitrario de 50ms que puede racear en devices lentos
   - Solucion: `useCallback` `closeAndNavigate(targetKeywordId, targetSummaryId)` que centraliza la logica + usa `requestAnimationFrame` en vez de `setTimeout(50)`. React 18 automatic batching commitea el unmount sincronicamente → rAF fires despues del siguiente paint → popover garantizado gone
   - 3 call sites actualizados: SVG `onNodeClick`, `renderConnectionItem`, cross-summary section
   - Import de `useCallback` agregado a React import

3. **(I4) `useKeywordNavigation.ts` + `SummaryView.tsx` — Auto-open popup tras scroll+flash en Case A**
   - Problema: Case A (mismo summary) scrollea al keyword destino y flashea, pero NO abre su popup. El usuario tiene que clickear de nuevo para ver la info del keyword
   - Solucion: `setTimeout(600)` despues del scroll → re-query span con `querySelector` (por si TreeWalker re-creo los spans) → `freshSpan?.click()` programatico. 600ms = margen para que `scrollIntoView({behavior:'smooth'})` termine (~300-500ms segun browser)
   - Aplicado en ambos entry points: EP1 (`SummaryView.tsx`) y EP2 (`useKeywordNavigation.ts`)

**Fix diferido:**

4. **(I2) `KeywordPopup.tsx` — mapNodes mastery siempre -1 — DIFERIDO**
   - Razon: requiere prop-drilling `keywordMasteryMap` a traves de 3 niveles (KHI → InlineKeywordPopover → KeywordPopup). Impacto puramente cosmetico (nodos grises en ConnectionsMap SVG). Se implementara cuando se refactorice KeywordPopup para aceptar contexto de mastery.

**Edge case documentado:** Keyword en otra pagina (paginacion >3500 chars): `querySelector` no encuentra span → `freshSpan?.click()` no-op. Toast generico ya maneja este caso. Fix futuro: mapa `keywordId → pageIndex` + auto-navegacion de pagina.

**Archivos modificados:** `KeywordHighlighterInline.tsx` (I1), `KeywordPopup.tsx` (I3), `useKeywordNavigation.ts` (I4), `SummaryView.tsx` (I4)
**Archivos NO tocados:** `SmartPopup.tsx`, `useSmartPopupPosition.ts`, `InlineKeywordPopover.tsx`, `StudentSummaryReader.tsx`
**Sin cambios al backend. Sin nuevas dependencias.**

### FIX-E2-E3-E4 + MEJORA-P1

**Contexto:** Auditoria detallada de I4 identifico 4 edge cases (E1-E4). Los 4 se resolvieron en un solo batch.

**Fixes ejecutados:**

1. **(E2) 600ms race — usuario clickea otra keyword durante auto-click timer**
   - Problema: `setTimeout(600)` era fire-and-forget. Si el usuario clickeaba otra keyword durante esos 600ms, el auto-click la sobreescribia
   - Solucion: `autoClickRef = useRef<AutoClickHandle>(NOOP_HANDLE)`. Se cancela al inicio de cada nueva navegacion con `autoClickRef.current.cancel()`
   - Aplicado en: `useKeywordNavigation.ts` y `SummaryView.tsx`

2. **(E3) Slow scroll — smooth scroll >600ms en devices lentos**
   - Problema: `setTimeout(600)` podia disparar antes de que termine `scrollIntoView({behavior:'smooth'})`, causando que el popup siga al scroll
   - Solucion: Patron `scrollend` race — escucha evento `scrollend` en el scroll parent (preciso, ~94% browser support) + fallback timer 800ms (safety net para browsers sin scrollend o cuando no hay scroll). Helper `findScrollParent()` sube por el DOM usando computed styles (robusto contra cambios de clases)
   - Extraido a: `keyword-scroll-helpers.ts` (nuevo archivo compartido)

3. **(E4) Timer leak en unmount**
   - Problema: `setTimeout(600)` no se cancelaba si el componente unmountaba antes de 600ms. Benigno pero tecnicamente un leak
   - Solucion: `useEffect(() => () => autoClickRef.current.cancel(), [])` en ambos entry points. El mismo `cancel()` del helper limpia tanto el timer como el event listener de scrollend
   - Aplicado en: `useKeywordNavigation.ts` y `SummaryView.tsx`

4. **(MEJORA-P1) Cross-page keyword navigation en summaries paginados**
   - Problema: Si el keyword destino esta en pagina 3 pero el usuario ve pagina 1, `querySelector` retorna null → toast generico sin accion
   - Solucion en `StudentSummaryReader.tsx`:
     a. `useMemo` extrae paginacion de IIFE inline → `htmlPages`, `textPages`, `totalPages` disponibles en scope
     b. `keywordPageMap = useMemo(...)` mapea `keywordId → pageIndex` buscando nombre de keyword en texto plano de cada pagina (strip HTML tags con regex)
     c. `handleNavigateKeywordWrapped` intercepta navegacion: si keyword en otra pagina → `setContentPage(targetPage)` + `pendingPageNavRef.current = {...}`
     d. `useEffect([contentPage])` detecta pending nav → espera 500ms (AnimatePresence 300ms + KHI TreeWalker 16ms + margen) → llama `onNavigateKeyword()` original → Case A del parent ejecuta scroll + flash + auto-open normalmente
   - Bonus: IIFE eliminada del render, paginacion memoizada (no se re-computa `enrichHtmlWithImages` en cada render)

**Archivo nuevo:** `src/app/lib/keyword-scroll-helpers.ts` — helper compartido con `scrollFlashAndAutoOpen()`, `findScrollParent()`, `AutoClickHandle`, `NOOP_HANDLE`
**Archivos modificados:** `useKeywordNavigation.ts` (E2/E3/E4), `SummaryView.tsx` (E2/E3/E4), `StudentSummaryReader.tsx` (P1)
**Archivos NO tocados:** `SmartPopup.tsx`, `useSmartPopupPosition.ts`, `InlineKeywordPopover.tsx`, `KeywordHighlighterInline.tsx`, `KeywordPopup.tsx`
**Sin cambios al backend. 1 nuevo archivo (0 dependencias externas nuevas).**