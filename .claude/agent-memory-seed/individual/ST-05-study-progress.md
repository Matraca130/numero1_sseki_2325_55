# Agent Memory: ST-05 (study-progress)
Last updated: 2026-03-25

## Rol
Mantener y evolucionar el sistema de tracking de progreso y mastery: hooks BKT/FSRS, contextos compartidos, helpers de cálculo, APIs de mastery y servicios de progreso que alimentan a todos los demás agentes de Study.

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
- Respetar la Delta Mastery Scale como estándar inmutable: Gray (<sin datos>) / Red (p_know < 0.3) / Yellow (0.3–0.6) / Green (0.6–0.85) / Blue (>= 0.85). Cambios requieren aprobación.
- Mantener `mastery-helpers.ts` y `grade-mapper.ts` como funciones puras sin side effects.
- Usar React Query con `staleTime` apropiado en todos los hooks de mastery para evitar refetches innecesarios.
- Memoizar contextos (`TopicMasteryContext`, `StudyTimeEstimatesContext`) para minimizar re-renders.
- Mantener separación clara en `keywordMasteryApi.ts` (~529L): CRUD, agregación y caché en secciones distintas.
- La agregación de `p_know` a nivel de tema es promedio ponderado de keywords; a nivel de curso, agregación desde temas.
- Este agente es proveedor de mastery para ST-01, ST-03 y ST-04: cambios en interfaces de hooks tienen impacto cross-agent.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Alterar la Delta Mastery Scale sin aprobación | Rompe la consistencia visual en toda la plataforma | Escalar al Arquitecto (XX-01) |
| Side effects en `mastery-helpers.ts` o `grade-mapper.ts` | Rompe la pureza y dificulta testing | Mantener puros; side effects en hooks o servicios |
| Modificar estados FSRS directamente | Responsabilidad exclusiva de ST-02 | Solo consumir FSRS para métricas de progreso |
| Cambiar interfaces públicas de hooks sin coordinar | ST-01, ST-03, ST-04 dependen de estas interfaces | Auditar consumidores antes de cambiar firmas |
| Re-renders excesivos en contextos de mastery | Degrada performance en toda la app | `useMemo` / `useCallback` con dependencias precisas |
| Mezclar CRUD, agregación y caché en `keywordMasteryApi.ts` | Hace el archivo inmanejable (~529L) | Mantener secciones bien delimitadas |
| Usar `any` en TypeScript | Rompe la seguridad de tipos | Tipar explícitamente |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
