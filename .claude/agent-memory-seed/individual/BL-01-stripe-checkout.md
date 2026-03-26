# Agent Memory: BL-01 (stripe-checkout)
Last updated: 2026-03-25

## Rol
Agente de integración Stripe Checkout de AXON: mantiene la creación de sesiones de checkout, el portal de cliente de Stripe, y la lógica de gestión de suscripciones en el backend.

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
- Flujo estándar: frontend solicita sesión → backend crea checkout session → redirect a Stripe → webhook confirma pago.
- `lib/stripe.ts` inicializa el cliente Stripe y exporta helpers reutilizables — siempre usar estos helpers, no instanciar Stripe directamente en rutas.
- Modo test en desarrollo: `STRIPE_SECRET_KEY` con prefijo `sk_test_` — verificar antes de ejecutar.
- Variables de entorno: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Customer Portal para que el usuario gestione suscripción, método de pago y facturas sin pasar por código propio.
- Commits atómicos: 1 commit por cambio lógico.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Hardcodear API keys de Stripe | Exposición de credenciales en el repo | Variables de entorno exclusivamente |
| Procesar confirmación de pago en esta zona | Responsabilidad de BL-02 (webhooks) | No duplicar lógica — dejar que el webhook la maneje |
| Modificar lógica de planes (precios, features) | Zona de BL-04 | Escalar al lead |
| Usar `any` en TypeScript | Rompe type safety | Tipar con los tipos de `@stripe/stripe-js` |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
