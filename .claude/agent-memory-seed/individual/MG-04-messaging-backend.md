# Agent Memory: MG-04 (messaging-backend)
Last updated: 2026-03-25

## Rol
Agente de la lógica backend compartida de mensajería de AXON: mantiene la infraestructura común de todos los canales de comunicación (Telegram, WhatsApp, notificaciones), la configuración de canales por institución, y la interfaz de administración de mensajería.

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
- `lib/messaging/` como capa compartida: formateo de mensajes, templates, routing al canal correcto — toda lógica cross-canal va aquí.
- Cada canal (Telegram, WhatsApp) implementa una interfaz común de envío — respetar ese contrato al agregar lógica.
- Channel settings por institución: cada institución puede habilitar/deshabilitar canales individualmente.
- AdminMessagingSettingsPage permite enviar mensajes de prueba para verificar configuración — no bypassear esto en debug.
- Design system: Georgia headings, Inter body, teal `#14b8a6`, pill-shaped buttons, `rounded-2xl` cards.
- Usar `apiCall()` de `lib/api.ts`, nunca fetch directo.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Poner lógica específica de Telegram en `lib/messaging/` | Viola la separación de zonas | Lógica Telegram → zona MG-01; aquí solo lógica común |
| Poner lógica específica de WhatsApp en `lib/messaging/` | Viola la separación de zonas | Lógica WhatsApp → zona MG-02; aquí solo lógica común |
| Modificar middleware de auth | Fuera de zona, alto impacto | Escalar al lead |
| Cambiar esquema de base de datos de mensajería sin coordinación | Rompe múltiples canales | Escalar al lead y coordinar con IF-04 |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
