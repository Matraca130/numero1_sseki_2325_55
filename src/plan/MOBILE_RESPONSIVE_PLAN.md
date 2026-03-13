# Mobile Responsive Plan — Axon v4.5
## GitHub Issue #52 | Rama: feat/mobile-responsive

---

## FASE 0 — Layout Shell (COMPLETADA)
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 0.0 | MobileDrawer.tsx | NUEVO — drawer reutilizable + scroll lock con counter global | ✅ v2 |
| 0.1 | useIsMobile.ts | NUEVO — hook compartido en /hooks/ | ✅ |
| 0.2 | StudentLayout.tsx | Sidebar overlay <lg + desktop collapse + useIsMobile hook | ✅ v3 |
| 0.3 | Sidebar.tsx | Static width + touch targets + clean imports | ✅ v2 |
| 0.4 | CourseSwitcher.tsx | Fixed positioning on mobile, extracted CourseList | ✅ v2 |
| 0.5 | UserProfileDropdown.tsx | No duplicates, touch targets | ✅ v2 |
| 0.6 | TopicSidebar.tsx | hidden lg:flex + drawer en mobile + touch targets | ✅ |
| 0.7 | RoleShell.tsx | MobileDrawer + auto-close + extracted SidebarContent | ✅ v2 |

## FASE 1A — WelcomeView (COMPLETADA)
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 1.0 | layout.ts (design-system) | paddingX/Y responsive, rightPanel full-width mobile | ✅ |
| 1.1 | WelcomeView.tsx | flex-col lg:flex-row, sidebar w-full lg:w-[360px] | ✅ |
| 1.2 | CourseCard.tsx | YA RESPONSIVE (grid via layout token) | ✅ sin cambios |
| 1.3 | WelcomePerformanceSidebar.tsx | YA RESPONSIVE (width del padre) | ✅ sin cambios |
| 1.4 | QuickShortcuts.tsx | YA RESPONSIVE (grid via layout token) | ✅ sin cambios |
| 1.5 | AxonPageHeader.tsx | Usa token wrapper + override padding responsive | ✅ v2 |

## FASE 1B — DashboardView (COMPLETADA)
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 1.6 | DashboardView.tsx | layout tokens, subject header wrap, action btn responsive | ✅ |
| 1.7 | DashboardCharts.tsx | legend wrap, header stack, chart height responsive, % radii | ✅ |
| 1.8 | KPICard.tsx | YA RESPONSIVE (grid-cols-1 sm:2 lg:4 en padre) | ✅ sin cambios |
| 1.9 | MasteryOverview.tsx | YA RESPONSIVE (flex-col sm:flex-row, search w-36 sm:w-44) | ✅ sin cambios |
| 1.10 | StudyStreakCard.tsx | YA RESPONSIVE (centered card, text-based) | ✅ sin cambios |
| 1.11 | DashboardStudyPlans.tsx | header stack, btn full-width mobile, touch targets | ✅ |

## FASE 1C — ScheduleView (COMPLETADA)
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 1.12 | StudyPlanDashboard.tsx | 3-col -> tabs mobile | ✅ |
| 1.13 | PlanCalendarSidebar.tsx | hidden lg:flex + tab | ✅ |
| 1.14 | PlanProgressSidebar.tsx | hidden lg:flex + tab | ✅ |
| 1.15 | DefaultScheduleView.tsx | 2-col -> stack | ✅ |
| 1.16 | QuickNavLinks.tsx | grid-cols-2 mobile | ✅ |

## FASE 2 — Secundarias (COMPLETADA)
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 2.1 | StudentSummaryReader.tsx | Breadcrumb simplificado, tabs scrollable | ✅ |
| 2.2 | KeywordPopup.tsx | w-[calc(100vw-2rem)] mobile, bottom sheet | ✅ |
| 2.3 | PanelSidebar.tsx | Hidden mobile | ✅ |
| 2.4 | DailyPerformanceSidebar.tsx | Full-width mobile | ✅ |

## FASE 3 — Dashboard & Revisiones (COMPLETADA)
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 3.1 | ReviewSessionView.tsx | Tabla 5-col -> card stack mobile, p-4 lg:p-6, touch targets 44px, pagination responsive | ✅ |
| 3.2 | StudyDashboardsView.tsx | px-4 lg:px-8, chart legend flex-wrap, chart overflow-x-auto min-w-[480px], tabs scroll horizontal, settings p-4 lg:p-8, touch targets | ✅ |
| 3.3 | KnowledgeHeatmapView.tsx | Sidebar hidden lg:flex + MobileDrawer, calendar cells min-h-[60px] lg:min-h-[120px], events hidden lg:block + dot indicators mobile, popover mobile positioning, px-4 lg:px-8 | ✅ |
| 3.4 | MasteryDashboardView.tsx | Sidebar hidden lg:flex + MobileDrawer, calendar cells responsive, events hidden lg:block + dot indicators mobile, view mode tabs responsive, px-4 lg:px-8 | ✅ |

---

## Auditoria Cruzada (post Fase 0+1A+1B)

| # | Severidad | Issue | Fix |
|---|-----------|-------|-----|
| 1 | amarillo | MobileDrawer scroll lock race condition (2 drawers) | Counter global `openDrawerCount` |
| 2 | amarillo | AxonPageHeader perdia token `components.pageHeader.wrapper` | Usa token base + `!px` override |
| 3 | naranja | `useIsMobile` duplicado inline en StudentLayout | Extraido a `/hooks/useIsMobile.ts` |

## Auditoria Cruzada — Fase 3

| # | Severidad | Issue | Fix |
|---|-----------|-------|-----|
| 1 | rojo | Import path MobileDrawer incorrecto (`shared/` en vez de `layout/`) en KnowledgeHeatmapView y MasteryDashboardView | Corregido a `@/app/components/layout/MobileDrawer` |
| 2 | rojo | Prop `open` no existe en MobileDrawer (real: `isOpen`), prop `title` tampoco existe | Corregido a `isOpen={sidebarOpen}`, removido `title` |
| 3 | amarillo | Popover en KnowledgeHeatmapView usaba `window.innerWidth` (viola CSS-first) | Cambiado a `matchMedia` query para desktop positioning |
| 4 | amarillo | Import `PanelRightOpen` sin usar en KnowledgeHeatmapView | Removido |
| 5 | amarillo | Tab label cambiado innecesariamente en StudyDashboardsView | Restaurado texto original `Config. Algoritmo` |
| 6 | verde | MobileDrawer width=280 default chico para sidebar content | Agregado `width={340}` explicito |

---

## Patrones Clave
```
hidden lg:flex          -> ocultar sidebar mobile
flex flex-col lg:flex-row -> stack -> row
w-full lg:w-72          -> full mobile -> fixed desktop
p-4 lg:p-6              -> padding reducido
px-4 lg:px-8            -> padding horizontal reducido
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 -> grid responsive
min-w-0                 -> prevent flex overflow
overflow-x-auto         -> horizontal scroll tablas/charts
min-h-[44px]            -> touch targets (Apple HIG)
min-h-[60px] lg:min-h-[120px] -> calendar cells responsive
hidden lg:block         -> ocultar detalle en mobile
hidden lg:table-cell    -> ocultar columnas tabla en mobile
MobileDrawer            -> sidebar content en drawer mobile
```

## Patrones Fase 3 (nuevos)
```
Tabla -> Card stack:
  hidden lg:block       -> tabla desktop
  lg:hidden             -> card list mobile
  
Calendar sidebar:
  hidden lg:flex        -> sidebar desktop
  MobileDrawer          -> sidebar content en drawer
  Boton toggle mobile   -> abre drawer
  
Calendar cells:
  min-h-[60px] lg:min-h-[120px]  -> celdas mas chicas mobile
  text-[10px] lg:text-sm          -> numeros mas chicos
  hidden lg:block (events)        -> solo dots en mobile
  dot indicators (lg:hidden)      -> resumen visual mobile

Chart responsive:
  overflow-x-auto       -> scroll horizontal si no cabe
  min-w-[480px]         -> minimo para que el chart sea legible
  flex-wrap (legend)    -> legend items wrappean en mobile
```

## Brand Colors (ya migrados)
- Dark Teal: #1B3B36 (bg-axon-dark)
- Teal Accent: #2a8c7a (bg-axon-accent)
- Hover Teal: #244e47 (bg-axon-hover)
- Dark Panel: #1a2e2a (bg-axon-panel)
- Fondo: #F0F2F5
- Claros: #e6f5f1 / #ccebe3 / #99d7c7
