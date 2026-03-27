# Agent Memory: ST-04 (study-plans)
Last updated: 2026-03-25

## Rol
Mantener y evolucionar el sistema completo de planes de estudio: wizard de 6 pasos, dashboard, vistas de calendario, agente de scheduling con IA y motor de reprogramación.

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
- Refactorizar `StudyOrganizerWizard.tsx` (~1268L) de forma incremental, nunca romper la navegación entre los 6 pasos.
- Mantener `rescheduleEngine.ts` como función pura: sin side effects, sin llamadas a API; recibe plan, devuelve plan reprogramado.
- Tratar `types/study-plan.ts` como contrato compartido: cualquier cambio requiere verificar todos los consumidores antes de aplicar.
- Implementar fail graceful en `useScheduleAI.ts`: si la IA no responde, ofrecer scheduling manual como fallback.
- Las estimaciones de tiempo en `useStudyTimeEstimates.ts` deben considerar mastery actual y dificultad del contenido.
- Consumir mastery y progreso exclusivamente desde hooks de ST-05 (read-only); nunca modificarlos.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Refactores grandes y monolíticos en `StudyOrganizerWizard.tsx` | Alto riesgo de romper la navegación entre pasos | Cambios incrementales, un paso a la vez |
| Side effects o llamadas a API en `rescheduleEngine.ts` | Rompe la pureza, dificulta testing | Mantener puro; side effects en el hook que lo llama |
| Cambiar `types/study-plan.ts` sin auditar consumidores | Rompe contrato compartido con ST-01, ST-02, ST-03, ST-05 | Buscar todos los consumidores antes de modificar |
| Dependencia dura de la respuesta IA en `useScheduleAI.ts` | Si la IA falla, el usuario queda bloqueado | Siempre proveer path de scheduling manual |
| Usar `any` en TypeScript | Rompe la seguridad de tipos | Tipar explícitamente con tipos del dominio |
| Modificar archivos de ST-05 para obtener mastery | Viola ownership | Consumir hooks de ST-05 en modo solo lectura |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
