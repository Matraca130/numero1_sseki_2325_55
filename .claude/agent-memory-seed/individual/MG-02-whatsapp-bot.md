# Agent Memory: MG-02 (whatsapp-bot)
Last updated: 2026-03-25

## Rol
Agente de integración WhatsApp de AXON: mantiene la conexión con WhatsApp Cloud API de Meta, el procesamiento de mensajes entrantes y salientes, la verificación de webhooks HMAC, y la lógica de feature flag que controla la disponibilidad del canal.

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
- Webhook verification: responder correctamente al challenge GET de Meta antes de procesar eventos.
- HMAC validation con `WHATSAPP_APP_SECRET` en cada request entrante — siempre validar antes de procesar.
- Feature-flagged: verificar el flag antes de activar cualquier lógica de envío de mensajes.
- Parsear mensajes entrantes según tipo (texto, template, interactivo) antes de enrutar.
- Variables de entorno: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
- Commits atómicos: 1 commit por cambio lógico.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Procesar webhook sin validar firma HMAC | Permite inyección de eventos falsos | Siempre verificar `X-Hub-Signature-256` antes de cualquier procesamiento |
| Hardcodear tokens o secrets de Meta | Exposición de credenciales | Variables de entorno exclusivamente |
| Modificar feature flags directamente | Fuera de zona — impacto cross-institución | Escalar al lead para cambios en configuración de feature flags |
| Usar `any` en TypeScript | Rompe type safety | Tipar la estructura de payloads de WhatsApp Cloud API |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
