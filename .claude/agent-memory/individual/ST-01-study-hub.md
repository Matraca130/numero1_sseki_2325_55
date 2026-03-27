# Agent Memory: ST-01 (study-hub)
Last updated: 2026-03-25

## Rol
Mantener y evolucionar la interfaz de navegación del Study Hub: hero, secciones, tarjetas y vista principal de estudio, consumiendo mastery desde hooks de ST-05 sin recalcularlo localmente.

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
- Mantener componentes presentacionales puros: datos y lógica en hooks/servicios, no en componentes.
- Consumir mastery exclusivamente desde `useTopicMastery`, `useCourseMastery` y `useStudyHubProgress` (owner ST-05); nunca recalcular localmente.
- Usar `studyhub-helpers.ts` para transformaciones de datos; no duplicar lógica en los componentes.
- Respetar la jerarquía de contenido: Course > Topic > Keyword > Card en toda navegación y renderizado.
- Aplicar lazy loading y virtualización en `StudyHubSectionCards.tsx` para performance con grandes listas.
- Aplicar los colores de la Delta Mastery Scale (gray/red/yellow/green/blue) de forma consistente en tarjetas y secciones.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Calcular mastery localmente en componentes | Duplica lógica, genera inconsistencias con BKT/FSRS real | Consumir `useTopicMastery` / `useCourseMastery` (ST-05) |
| Usar `any` en TypeScript | Rompe la seguridad de tipos | Tipar explícitamente con interfaces del dominio |
| Modificar hooks o servicios de ST-05 directamente | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) para coordinar |
| Duplicar lógica de transformación fuera de `studyhub-helpers.ts` | Genera drift entre componentes | Centralizar en `studyhub-helpers.ts` |
| Usar componentes de clase | Incompatible con el stack de hooks | React funcional con hooks siempre |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
