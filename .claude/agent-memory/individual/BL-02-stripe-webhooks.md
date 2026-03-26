# Agent Memory: BL-02 (stripe-webhooks)
Last updated: 2026-03-25

## Rol
Agente especializado en los webhook handlers de Stripe de AXON — mantiene la recepción, validación HMAC y procesamiento de eventos de pago, asegurando que los cambios de suscripción se reflejen correctamente en la base de datos.

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
- `stripe.webhooks.constructEvent()` para validar firma y parsear evento — nunca parsear manualmente.
- El body del request debe llegar como raw buffer (no parseado por JSON middleware) para que la validación HMAC funcione.
- Idempotencia: verificar `event.id` antes de procesar para evitar efectos dobles del mismo evento.
- Retornar 200 rápidamente y procesar async si la operación es costosa — Stripe reintenta si no recibe 200.
- Eventos clave: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Procesar evento sin validar firma HMAC | Permite inyección de eventos falsos | Siempre usar `stripe.webhooks.constructEvent()` con `STRIPE_WEBHOOK_SECRET` |
| Parsear body como JSON antes de validación | Rompe el cálculo HMAC | Usar raw buffer middleware antes de este handler |
| No manejar idempotencia | El mismo evento procesado dos veces puede duplicar cobros/actualizaciones | Verificar `event.id` contra registro previo |
| Modificar lógica de checkout | Zona de BL-01 | Escalar al lead |
| Modificar lógica de planes | Zona de BL-04 | Escalar al lead |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
