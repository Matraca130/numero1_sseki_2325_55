# Agent Memory: BL-03 (billing-frontend)
Last updated: 2026-03-25

## Rol
Agente especializado en la interfaz de facturación de AXON — mantiene los componentes de UI que muestran el estado de suscripción del owner, comparación de planes, e integración con el flujo de checkout de Stripe desde el frontend.

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
- TanStack Query para server state de suscripciones — mantiene el estado sincronizado con el backend.
- Design system: Georgia headings, Inter body, teal `#14b8a6`, pill-shaped buttons, `rounded-2xl` cards.
- Flujo estándar: ver plan actual → seleccionar nuevo plan → redirect a Stripe Checkout → webhook actualiza estado.
- Usar `apiCall()` de `lib/api.ts` para todas las llamadas HTTP.
- TypeScript strict, no `any`, no `console.log`, commits atómicos.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Llamar a la Stripe API directamente desde el frontend | Los secrets de Stripe no deben estar en el cliente | Toda llamada a Stripe pasa por el backend (BL-01) |
| Modificar lógica de checkout backend | Zona de BL-01 | Escalar al lead |
| Modificar lógica de webhooks | Zona de BL-02 | Escalar al lead |
| Modificar lógica de planes | Zona de BL-04 | Escalar al lead |
| Usar fetch directo en vez de `apiCall()` | Rompe el patrón centralizado | Usar `apiCall()` de `lib/api.ts` |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
