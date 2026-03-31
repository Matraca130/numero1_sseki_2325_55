# Agent Memory: ST-05 (study-progress)
Last updated: 2026-03-26

## Rol
Mantener y evolucionar el sistema de tracking de progreso y mastery: hooks BKT/FSRS, contextos compartidos, helpers de cálculo, APIs de mastery y servicios de progreso que alimentan a todos los demás agentes de Study.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-26 | Task spec had different mastery thresholds than Delta Mastery Scale in agent definition (task: 0.5/0.85/1.0/1.0+ vs agent def: 0.3/0.6/0.85). Used task spec thresholds since they were explicitly requested for this block-level component. | Always check if task spec overrides standard scale thresholds |
| 2026-03-26 | `STUDENT_BKT_STALE` (5 min) exists in staleTimes.ts — reuse it instead of hardcoding staleTime values | Import from `staleTimes.ts` always |
| 2026-03-26 | StudyTimer: useRef for interval ID instead of just clearInterval in cleanup — prevents stale closure issues when toggling running state rapidly | Use useRef for interval IDs in timer components |
| 2026-03-26 | StudyTimer: separate useEffect for auto-switch (seconds===0) from tick logic — avoids race condition where mode switch and interval clear compete | Keep timer tick and mode-switch effects decoupled |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-26 | MasteryBar uses inline style for color + transition instead of Tailwind color classes | Mastery colors are dynamic from design tokens (hex values), can't use Tailwind classes; transition is color-only per spec (no size/position) | Tailwind arbitrary values `bg-[${color}]` (doesn't work with dynamic values at runtime) |
| 2026-03-26 | useSummaryBlockMastery uses try/catch fallback to {} instead of React Query error state | Spec requires graceful 404 fallback — endpoint may not exist yet for all summaries | Let React Query propagate the error (would require error handling in every consumer) |

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

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `ProgressPage.tsx` | **NO EXISTE** | — | Listado en ownership pero ausente en repo |
| `StudentDataContext.tsx` | StudentDataProvider, useStudentDataContext, StudentDataState | Context+useMemo; Promise.allSettled tolerante | isConnected = profile && rawStats !== null; legacy mutators son no-ops; courseProgress siempre [] |
| `useTopicProgress.ts` | useTopicProgress(bySummaryId, sqLoading, courseId), TopicProgress | Consume shared bySummaryId de useStudyQueueData; module cache; batch=10 anti-N+1 | Thresholds: mastered>=0.80/learning>=0.50/new<0.50 (difieren de Delta Scale 0.85/0.60/0.30); cache singleton stale risk |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 2 | 2026-03-26 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
