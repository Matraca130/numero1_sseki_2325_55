# Agent Memory: QZ-06 (quiz-analytics)
Last updated: 2026-03-25

## Rol
Agente responsable de analíticas y reportes del sistema de quizzes — gestiona paneles de estadísticas para profesores, historial de intentos para estudiantes y visualizaciones de tendencias de progreso.

## Parámetros críticos
- **Librería de visualización**: Recharts exclusivamente — no introducir librerías adicionales
- **Datos**: nunca exponer información de otros estudiantes en analíticas
- **API**: `services/quizAttemptsApi.ts` (56L) provee datos de intentos y resultados
- **Stack**: React + TypeScript + Recharts
- **Responsividad**: todas las visualizaciones deben funcionar en móvil

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
- `useQuizAnalytics.ts` (184L) centraliza la lógica de datos del panel del profesor
- Panel profesor (`QuizAnalyticsPanel.tsx` 204L): vista agregada con métricas de clase + desglose por pregunta
- Historial estudiante (`QuizHistoryPanel.tsx` 244L): lista de intentos con tendencias temporales
- `ProgressTrendChart.tsx` (151L) + `QuizStatsBar.tsx` (56L) como componentes de visualización reutilizables
- Hooks deben manejar estados de carga y error de forma consistente

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Introducir librerías de gráficas distintas a Recharts | Inconsistencia visual y peso adicional innecesario | Usar siempre Recharts |
| Exponer datos de un estudiante a otro | Violación de privacidad | Filtrar siempre por el usuario autenticado |
| Visualizaciones no responsivas | Rompen la UI en móvil | Usar clases responsivas de Tailwind y config responsiva de Recharts |
| Hooks sin manejo de estado de carga/error | UX degradada y errores silenciosos | Siempre manejar `isLoading`, `isError` en cada hook |
| Estadísticas por pregunta desincronizadas con tipos de QZ-05 | Datos incorrectos o crashes | Respetar la estructura de tipos definida por QZ-05 |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
