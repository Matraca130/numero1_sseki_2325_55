# Agent Memory: MG-01 (telegram-bot)
Last updated: 2026-03-25

## Rol
Agente de integración Telegram de AXON: mantiene el flujo de vinculación de cuentas de estudiantes con Telegram, el envío de notificaciones vía bot, y la interfaz de configuración en el perfil del estudiante.

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
- Flujo de vinculación: estudiante solicita código → bot recibe código → backend valida y vincula cuenta.
- Link codes: códigos temporales de 6 dígitos — corta vida, validados en el backend.
- Status polling: el frontend hace polling para detectar cuando la vinculación se completa — no usar websockets para esto.
- Usar `apiCall()` de `lib/api.ts` para todas las llamadas HTTP — nunca `fetch` directo.
- Variables de entorno para tokens de bot — nunca hardcodear.
- Commits atómicos: 1 commit por cambio lógico.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Hardcodear tokens de Telegram bot | Exposición de credenciales | Variables de entorno (`TELEGRAM_BOT_TOKEN`) |
| Usar `any` en TypeScript | Rompe type safety | Tipar correctamente la respuesta de Telegram Bot API |
| `console.log` en producción | Leaks de datos, ruido en logs | Usar el logger del sistema si existe |
| Modificar lógica de otros canales (WhatsApp, notificaciones) | Fuera de zona — conflictos | Escalar al lead vía SendMessage |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
