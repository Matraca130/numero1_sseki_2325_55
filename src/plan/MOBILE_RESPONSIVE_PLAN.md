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

## FASE 1C — ScheduleView
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 1.12 | StudyPlanDashboard.tsx | 3-col → tabs mobile | ⬜ |
| 1.13 | PlanCalendarSidebar.tsx | hidden lg:flex + tab | ⬜ |
| 1.14 | PlanProgressSidebar.tsx | hidden lg:flex + tab | ⬜ |
| 1.15 | DefaultScheduleView.tsx | 2-col → stack | ⬜ |
| 1.16 | QuickNavLinks.tsx | grid-cols-2 mobile | ⬜ |

## FASE 2 — Secundarias
| # | Archivo | Cambio | Estado |
|---|---------|--------|--------|
| 2.1 | StudentSummaryReader.tsx | Breadcrumb simplificado, tabs scrollable | ⬜ |
| 2.2 | KeywordPopup.tsx | w-[calc(100vw-2rem)] mobile, bottom sheet | ⬜ |
| 2.3 | PanelSidebar.tsx | Hidden mobile | ⬜ |
| 2.4 | DailyPerformanceSidebar.tsx | Full-width mobile | ⬜ |

---

## Auditoría Cruzada (post Fase 0+1A+1B)

| # | Severidad | Issue | Fix |
|---|-----------|-------|-----|
| 1 | 🟡 | MobileDrawer scroll lock race condition (2 drawers) | Counter global `openDrawerCount` |
| 2 | 🟡 | AxonPageHeader perdía token `components.pageHeader.wrapper` | Usa token base + `!px` override |
| 3 | 🟠 | `useIsMobile` duplicado inline en StudentLayout | Extraído a `/hooks/useIsMobile.ts` |

---

## Patrones Clave
```
hidden lg:flex          → ocultar sidebar mobile
flex flex-col lg:flex-row → stack → row
w-full lg:w-72          → full mobile → fixed desktop
p-4 lg:p-8              → padding reducido
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 → grid responsive
min-w-0                 → prevent flex overflow
overflow-x-auto         → horizontal scroll tablas
min-h-[44px]            → touch targets (Apple HIG)
```

## Brand Colors (ya migrados)
- Dark Teal: #1B3B36 (bg-axon-dark)
- Teal Accent: #2a8c7a (bg-axon-accent)
- Hover Teal: #244e47 (bg-axon-hover)
- Dark Panel: #1a2e2a (bg-axon-panel)
- Fondo: #F0F2F5
- Claros: #e6f5f1 / #ccebe3 / #99d7c7
