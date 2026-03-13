AUDITORÍA EXHAUSTIVA — Axon v4.4 (Local)
Archivos auditados: 35 | Líneas leídas: ~6,800 | Hallazgos: 18

1. MODULARIDAD (5 hallazgos)
#	Archivo	Hallazgo	Severidad	Acción
M1	context/AuthContext.tsx	Bridge re-export innecesario: context/ (singular) es un bridge de 17 líneas que re-exporta todo desde contexts/ (plural). Añade un hop de indirección. 15 archivos importan del bridge.	🟡 Media	Migrar imports a contexts/ y eliminar bridge. NO TOCAR si AuthContext es protegido — documentar para futuro.
M2	services/apiConfig.ts	Bridge realRequest duplica apiCall: 120 líneas que replican la misma lógica de api.ts solo para añadir ApiError con .status. platformApi y studentApi dependen de err.status en catches.	🟡 Media	Upgradar apiCall() para throw ApiError con .status, luego colapsar apiConfig.ts en api.ts. Requiere actualizar catches en archivos protegidos.
M3	lib/model3d-api.ts	Re-export chain de 3 niveles: types/model3d.ts → services/models3dApi.ts → lib/model3d-api.ts. Los types se re-exportan en cada capa.	🟢 Baja	Funcional, es el facade pattern intencionado. No cambiar.
M4	design-system/	Barrel export bien organizado: 14 archivos modulares con index.ts barrel. ✅ Buena práctica.	✅ OK	—
M5	hooks/useStudentNav.ts	Único hook personalizado: Todo el dominio 3D no tiene hooks extraídos (useModelLoader, usePins, useNotes). La lógica vive inline en componentes de 400-600 líneas.	🟡 Media	Extraer usePins(), useNotes(), useModelParts() como hooks. Reduce acoplamiento y facilita testing.
2. CALIDAD DE CÓDIGO (7 hallazgos)
#	Archivo	Hallazgo	Severidad	Fix
Q1	services/studentApi.ts L72,95,127,210	4× catch (err: any) — sobrevivieron la migración any→unknown. Patrón: if (err.status === 404).	🔴 Alta	catch (err: unknown) + narrowing: if (err instanceof ApiError && err.status === 404). ApiError viene de apiConfig.ts.
Q2	contexts/AuthContext.tsx L148,173,175,319	4× any explícito en apiCall genéricos y JSON parsing.	🟡 Media	Crear interfaces MeResponse, InstitutionResponse. PROTEGIDO — documentar.
Q3	contexts/AuthContext.tsx L162,165,188,192,265,266,284,298,308,323	10× console.log/error en lugar de logger.	🟡 Media	Migrar a logger.info/error. PROTEGIDO — documentar.
Q4	lib/api.ts L40	apiCall<T = any> — default genérico es any.	🟢 Baja	Cambiar a <T = unknown>. Fuerza callers a ser explícitos.
Q5	lib/api.ts L59	let json: any para JSON parseado.	🟢 Baja	let json: unknown + type guards.
Q6	viewer3d/ModelPartMesh.ts L317	const states: any[] en getPartStates().	🟢 Baja	Usar el tipo de retorno declarado del método.
Q7	models3dApi.ts L361	Error detection by string matching — errMsg.includes('404') para detectar batch 404. Frágil.	🟡 Media	Cuando M2 se resuelva (apiCall throws ApiError), usar err instanceof ApiError && err.status === 404.
3. FUNCIONALIDADES FALTANTES (6 hallazgos)
#	Feature	Impacto	Existe en mercado	Esfuerzo
F1	Carga directa de GLB single-file — Cuando un profesor sube UN archivo .glb y no configura partes, el viewer muestra el modelo procedural de fallback en vez del archivo real. ModelViewer3D solo carga GLBs via ModelPartLoader (multi-part). Falta un path para single-file GLB.	🔴 Crítico	✅ Sketchfab, BioDigital, 3D Viewer Online	2-3h — Añadir GLTFLoader.load(model.file_url) cuando storedParts.length === 0 y model.file_url exists.
F2	Auto-generación de thumbnails — thumbnail_url existe en el schema pero nunca se genera. El profesor no ve preview de sus modelos en la lista.	🟡 Medio	✅ Sketchfab auto-capture	1-2h — renderer.domElement.toDataURL() después del primer render, upload via endpoint.
F3	Keyboard shortcuts en visor 3D — Sin atajos de teclado (R=reset, F=focus, P=pins, L=layers, N=notes, Esc=back).	🟡 Medio	✅ BioDigital, Visible Body	1h — useEffect con keydown listener.
F4	Retry/backoff en API calls — apiCall() y realRequest() fallan una vez y tiran error. Sin retry automático para errores transitorios (network, 503).	🟡 Medio	✅ tanstack-query, swr	2h — Wrapper con retry exponencial (max 3, backoff 1s/2s/4s) para GET requests.
F5	Skeleton loading — Todos los estados de carga usan <Loader2 className="animate-spin"/>. Sin skeleton/shimmer para mejor perceived performance.	🟢 Bajo	✅ Standard UX pattern	1-2h — Crear <SkeletonCard> reutilizable.
F6	Accesibilidad (a11y) en visor 3D — Sin aria-label en botones del overlay, sin keyboard nav para pins, sin role en el canvas container.	🟡 Medio	✅ WCAG 2.1 AA compliance	2-3h — Añadir roles, labels, focus management.
4. RENDIMIENTO (5 hallazgos)
#	Archivo	Hallazgo	Impacto	Fix
P1	content/AtlasScreen.tsx L104-115	colorIdx++ es side-effect en render. Muta variable local durante .map(). Funciona pero es un code smell que puede causar inconsistencias en StrictMode (double-render).	🟢 Bajo	Usar (sections.indexOf(sec)) o pasar index al key.
P2	content/WelcomeView.tsx L35-58	getCourseProgress() recalcula en CADA render — no memoizado. Itera todos los cursos/semesters/sections/topics cada vez.	🟡 Media	Envolver en useMemo con [courses] como dep.
P3	content/ThreeDView.tsx, AtlasScreen.tsx	Sin React.memo en SectionCard — Con 50+ secciones, cada re-render del padre (búsqueda, navegación) re-renderiza todas las cards.	🟡 Media	React.memo(SectionCard). También React.memo(ModelCard) en ModelManager.
P4	models3dApi.ts L305	_batchEndpointUnavailable nunca se resetea — Una vez que detecta 404, NUNCA vuelve a intentar batch en la sesión. Si el backend se actualiza mid-sesión, no se beneficia.	🟢 Bajo	Añadir TTL de 10 min al flag: if (Date.now() - _batchDisabledAt > 10*60*1000) _batchEndpointUnavailable = false.
P5	content/DashboardView.tsx	Charts (recharts) se importan estáticamente — ~150KB de recharts se carga aunque el usuario no visite Dashboard.	🟡 Media	React.lazy(() => import('./DashboardView')) en student-routes.ts. (¿Ya está lazy? Verificar routes.)
5. RESUMEN EJECUTIVO
✅ Lo que está BIEN hecho
Dominio 3D: Excelente gestión de recursos Three.js (shared geometry, texture disposal, imperative DOM updates, throttled raycasting)
API architecture: Limpia separación lib/api.ts → services/*Api.ts → lib/model3d-api.ts (facade)
Error handling: ErrorBoundary, WebGL context loss recovery, optimistic UI with undo
Design system: Bien modularizado en 14 archivos con barrel export
Batch optimization: 3-tier strategy (cache → batch → throttled) es production-grade
Upload flow: Validación client-side (extension, size, magic bytes), XHR with progress, phases UX
⚠️ Lo que necesita atención
F1 es CRÍTICO: Sin single-file GLB loading, los modelos subidos por profesores NO se ven
Q1: 4 err: any sobrevivieron la migración — riesgo de runtime errors
M1+M2: Dos bridges de backward-compat que añaden complejidad
✅ CHECKLIST PASO A PASO
Paso	Qué hice	Archivos revisados
1	Mapeé estructura completa del proyecto (dirs + files)	12 directorios, ~50 archivos
2	Leí infraestructura canónica (api.ts, supabase.ts, logger.ts, apiConfig.ts)	4 archivos, ~300 líneas
3	Leí capa de servicios (models3dApi, platformApi, studentApi, contentTreeApi)	4 archivos, ~1,160 líneas
4	Leí tipos (model3d.ts, platform.ts, student.ts, index.ts)	4 archivos, ~440 líneas
5	Leí contextos (AuthContext ×2, AppContext, + verificación bridge context/)	3 archivos, ~600 líneas
6	Leí dominio 3D completo (ModelViewer3D, PinSystem, PinEditor, StudentNotes3D, PinMarker3D, ModelPartMesh, LayerPanel, three-utils)	8 archivos, ~2,100 líneas
7	Leí contenido student (ThreeDView, AtlasScreen, DashboardView, WelcomeView)	4 archivos, ~1,050 líneas
8	Leí professor (ModelManager, ModelPartsManager, ModelUploadZone)	3 archivos, ~910 líneas
9	Leí auth (SelectRolePage, ErrorBoundary)	2 archivos, ~235 líneas
10	Leí hooks (useStudentNav) + routes (routes.tsx)	2 archivos, ~200 líneas
11	Verifiqué branch GitHub (test/quiz-session) para confirmar estado de contexts/ vs context/, design-system/, AtlasScreen.tsx	GitHub API calls
12	Compilé 18 hallazgos en 4 categorías con severidad, fix, y esfuerzo estimado	—
Prioridad de ejecución recomendada
🔴 F1 — Single-file GLB loading (sin esto, la feature principal no funciona)
🔴 Q1 — 4× err: any en studentApi.ts (puede causar runtime crashes)
🟡 P2 — useMemo en WelcomeView
🟡 P3 — React.memo en SectionCard/ModelCard
🟡 F3 — Keyboard shortcuts en visor 3D (UX quick win)

---

## AGENTE M — Modularización Dashboard + Organización de Estudio (v4.5)

> Fecha: 13 Marzo 2026 | Branch: `refactor/mastery-schedule-split`
> Scope: 10 archivos de dominio en `content/` + 2 archivos grandes en `dashboard/` y `schedule/`
> Resultado: **~6474 → ~2541 líneas (-61%)** con **41+ archivos nuevos** extraídos

### Estado de archivos por directorio

#### `components/dashboard/` (9 archivos)
| Archivo | Líneas | Origen | Notas |
|---|---|---|---|
| `MasteryOverview.tsx` | 283 | REESCRITO (era 772) | Consume hook + types + KeywordRow |
| `useMasteryOverviewData.ts` | 339 | NUEVO (extraído de MasteryOverview) | Hook: fetch tree→summ→kw→sub→BKT |
| `masteryOverviewTypes.ts` | 96 | NUEVO (extraído de MasteryOverview) | Types, color helpers, filter logic |
| `KeywordRow.tsx` | 139 | NUEVO (extraído de MasteryOverview) | Fila expandible con subtopics |
| `ActivityHeatMap.tsx` | 358 | Sin cambios | GitHub-style heatmap |
| `DashboardCharts.tsx` | 156 | Sin cambios | Recharts wrappers |
| `DashboardStudyPlans.tsx` | 162 | Sin cambios | Plan cards en dashboard |
| `StatsCards.tsx` | 237 | Sin cambios | KPI cards |
| `StudyStreakCard.tsx` | 90 | Sin cambios | Racha de estudio |

#### `components/schedule/` (6 archivos)
| Archivo | Líneas | Origen | Notas |
|---|---|---|---|
| `StudyPlanDashboard.tsx` | 433 | REESCRITO (era 677) | Consume 2 sidebars extraídos |
| `PlanCalendarSidebar.tsx` | 115 | NUEVO (extraído de StudyPlanDashboard) | Mini-calendar + checklist |
| `PlanProgressSidebar.tsx` | 234 | NUEVO (extraído de StudyPlanDashboard) | Progress gauge + plan list |
| `DefaultScheduleView.tsx` | 351 | Sin cambios | Vista cuando no hay planes |
| `QuickNavLinks.tsx` | 106 | Sin cambios | Links rápidos de navegación |
| `scheduleFallbackData.ts` | 57 | Sin cambios | Datos fallback |

#### Subdirectorios ya modularizados (rondas anteriores)
| Directorio | Archivos | Descripción |
|---|---|---|
| `components/wizard/` | 6 | Wizard de creación de plan de estudio |
| `components/review/` | 5 | Sesión de repaso (flashcards, quiz) |
| `components/heatmap/` | 4 | Heatmap helpers y subcomponentes |
| `components/mastery/` | 5 | Mastery dashboard + daily sidebar |
| `components/studyhub/` | 4 | Study hub (organizador principal) |
| `components/student-panel/` | 3 | Panel lateral del estudiante |
| `components/welcome/` | 3 | Welcome/onboarding view |
| `components/shared/` | 6+ | CircularProgress, InlineCalendar, PageStates, etc. |
| `utils/` | 4 | categoryStyles, studyMethodStyles, masteryColors, constants |

### Archivos de otros agentes (etiquetados en FM)
| Archivo | Dominio | Líneas | Header de dominio |
|---|---|---|---|
| `shared/ContentTree.tsx` | Compartido (Prof + Student) | 547 | ✅ Etiquetado |
| `shared/EditableKeyword.tsx` | Agente S (Contenido) | 571 | ❌ Pendiente (limitación tool) |
| `content/LessonGridView.tsx` | Agente S | 44 (stub) | ✅ Etiquetado |
| `content/StudyView.tsx` | Agente S | 34 (stub) | ✅ Etiquetado |
| `content/SummarySessionNew.tsx` | Agente S | 36 (stub) | ✅ Etiquetado |
| `content/flashcard/*` (9 archivos) | Agente S | ~800 total | Ya tiene sus propios headers |

### Bugs corregidos durante modularización
| Bug | Archivo | Severidad | Fix |
|---|---|---|---|
| `isOnTrack` siempre `true` | `PlanProgressSidebar.tsx:54` | Media | Cambiado `>= 0` → `>= 0.4` (40% umbral) |
| Imports muertos `headingStyle, components` | `StudyPlanDashboard.tsx:13` | Baja | Eliminados |

### Consolidaciones cross-file completadas
| Utilidad | Archivo | Consumidores |
|---|---|---|
| Category badge styles | `utils/categoryStyles.ts` | 4 componentes |
| Study method icons/colors | `utils/studyMethodStyles.tsx` | 3 componentes |
| Mastery color helpers (7) | `utils/masteryColors.ts` | 5 componentes |
| Circular progress | `shared/CircularProgress.tsx` | 3 componentes |
| Inline calendar picker | `shared/InlineCalendarPicker.tsx` | 2 componentes |

### Cadena de dependencias (verificada 13 Mar 2026)
```
pages/DashboardPage.tsx
  └── dashboard/MasteryOverview.tsx
        ├── dashboard/masteryOverviewTypes.ts
        ├── dashboard/useMasteryOverviewData.ts
        │     ├── context/AuthContext (useAuth)
        │     ├── lib/api (apiCall)
        │     ├── services/platformApi (getTopicSummaries, getAllBktStates)
        │     └── services/contentTreeApi (getContentTree)
        └── dashboard/KeywordRow.tsx
              ├── dashboard/masteryOverviewTypes.ts
              └── utils/devLog

content/ScheduleView.tsx
  └── schedule/StudyPlanDashboard.tsx
        ├── schedule/PlanCalendarSidebar.tsx
        ├── schedule/PlanProgressSidebar.tsx
        │     ├── schedule/QuickNavLinks.tsx
        │     └── context/AppContext (StudyPlan type)
        ├── shared/AxonPageHeader.tsx
        └── utils/studyMethodStyles.tsx
```

### Próximos pasos (Agente M)
- [ ] Ejecutar `~/axon-all.sh` (limpieza branches + post en Issue #27)
- [ ] Esperar Fase 1 del Agente S para iniciar Fase 2 en repo
- [ ] Candidatos menores de modularización restantes:
  - `ActivityHeatMap.tsx` (358 ln) — extraer tooltip y helpers de color
  - `DefaultScheduleView.tsx` (351 ln) — extraer empty state hero
