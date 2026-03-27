# Agent Memory: DG-01 (dashboard-student)
Last updated: 2026-03-25

## Rol
Desarrollar y mantener la interfaz del dashboard del estudiante: KPI cards, heatmap de actividad, donut de dominio (mastery), racha de estudio y graficos estadisticos.

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
- Usar `<ResponsiveContainer>` de Recharts como wrapper para todos los graficos para garantizar responsividad.
- `DashboardView` orquesta el layout; los widgets individuales (`StatsCards`, `ActivityHeatMap`, etc.) permanecen desacoplados.
- El hook `useMasteryOverviewData` centraliza la transformacion de datos para `MasteryOverview` — no duplicar esa logica en el componente.
- `WelcomeView` (~648L) es el componente mas grande: mantener subcomponentes pequeños y bien delimitados dentro de el.
- Commits atomicos: un cambio logico por commit.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar Chart.js, D3 u otra libreria de graficos | Solo Recharts esta permitido | `<BarChart>`, `<PieChart>`, `<LineChart>` de Recharts |
| CSS Modules o styled-components | Inconsistente con el stack del proyecto | Tailwind CSS exclusivamente |
| `any` o `// @ts-ignore` | Rompe el contrato de TypeScript estricto | Tipar correctamente o crear interfaces |
| Duplicar logica de `hooks/` o `lib/` | Genera inconsistencias y deuda tecnica | Importar el hook o utilidad existente |
| Hardcodear datos en componentes | Dificulta mantenimiento | Obtener datos desde hooks tipados |
| Modificar archivos fuera de `components/dashboard/`, `pages/DashboardPage.tsx`, `components/content/DashboardView.tsx`, `components/content/WelcomeView.tsx` | Viola el aislamiento de agente | Escalar al Arquitecto (XX-01) |

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `DashboardPage.tsx` | DashboardPage (default) | Orquestador 3 filas | HeatMap/Mastery hacen fetch propio — no reciben datos via props |
| `StatsCards.tsx` | StatsCards, useStudentDashboardStats | 4 KPI + hook colocado | Hook re-exportado y reutilizado en DashboardPage para studiedToday |
| `ActivityHeatMap.tsx` | ActivityHeatMap | Grid 26sem desktop / 13 mobile | Fetch propio con cleanup cancelled flag; colores Tailwind por nivel |
| `MasteryOverview.tsx` | MasteryOverview | Shell fino — logica en hook | Filtro + KPI bar; error/empty states aqui |
| `StudyStreakCard.tsx` | StudyStreakCard | Presentacional puro | Color dinamico por umbral 3/7/14 dias |
| `DashboardCharts.tsx` | ActivityChart, MasteryDonut | Recharts + ChartErrorBoundary | isAnimationActive=false; usa colors.chart.* del design-system |
| `useMasteryOverviewData.ts` | useMasteryOverviewData | Pipeline 5 pasos + filtros | any en linea 93 (violacion TS); subtopics pre-cacheados evitan N+1 |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
