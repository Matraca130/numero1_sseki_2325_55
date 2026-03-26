# Agent Memory: IF-02 (infra-ui)
Last updated: 2026-03-25

## Rol
Agente de infraestructura UI de AXON: mantiene todos los shared components, contexts, types, lib/utils, y cross-cutting API services que afectan a múltiples secciones del frontend.

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
- Shared components en `src/app/components/shared/` y `design-kit/` — reutilizar antes de crear componentes nuevos.
- Contexts existentes (ContentTreeContext, StudyPlansContext, TopicMasteryContext, GamificationContext) — suscribirse a ellos desde features en lugar de duplicar estado.
- `platform-api/` (pa-content, pa-flashcards, pa-student-data) como capa de servicio unificada para todas las secciones.
- `ai-service/` (as-chat, as-generate, as-realtime) como wrappers de cliente AI — no llamar APIs AI directamente desde features.
- Query keys centralizadas en `hooks/queries/queryKeys.ts` y stale times en `staleTimes.ts`.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Tocar `src/app/components/ui/` (shadcn) | Protected by Lead | No modificar — usar los primitivos tal como están |
| Tocar `src/app/design-system/` | Protected by Lead | No modificar — referenciar los tokens existentes |
| Duplicar lógica de contexto en componentes feature | Estado desincronizado | Consumir el context existente (useContentTree, etc.) |
| Fetch directo en componentes sin pasar por services | Bypasea la capa de API unificada | Usar los servicios en `platform-api/`, `ai-service/`, `student-api/` |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
