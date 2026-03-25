# Agent Memory: DG-02 (dashboard-professor)
Last updated: 2026-03-25

## Rol
Desarrollar y mantener la interfaz del dashboard del profesor: pagina principal, panel de analiticas de quizzes, gamificacion del profesor y graficos de rendimiento estudiantil.

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
- `useQuizAnalytics` (~184L) consume la API, transforma datos crudos a estructuras Recharts y maneja carga/error/vacio — mantener esa separacion de responsabilidades.
- Los datos de `useQuizAnalytics` deben estar memoizados con `useMemo` para evitar re-renders costosos.
- `QuizAnalyticsPanel` (~204L) solo presenta datos; no contiene logica de transformacion.
- `ProfessorGamificationPage` (~103L) consume datos del backend de gamificacion (DG-04) — nunca modifica logica de XP o badges.
- `ProfessorDashboardPage` orquesta widgets del profesor; delegar la logica a componentes y hooks especializados.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar `components/dashboard/` | Ownership de DG-01 | Solo lectura; escalar si hay conflicto |
| Modificar `components/gamification/` | Ownership de DG-03 | Solo lectura; escalar si hay conflicto |
| Logica de XP o badges en este agente | Responsabilidad de DG-03/DG-04 | Consumir datos via API, nunca calcularlos |
| `useQuizAnalytics` sin `useMemo` | Re-renders innecesarios en tablas de datos grandes | Memoizar siempre el resultado del hook |
| `any` o `// @ts-ignore` | Rompe TypeScript estricto | Tipar correctamente |
| Llamadas directas a la API sin el hook | Duplicacion de logica de transformacion | Usar `useQuizAnalytics` como unica fuente |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
