# Agent Memory: AI-05 (ai-backend)
Last updated: 2026-03-25

## Rol
Route handlers del backend AI (17 rutas REST/WebSocket), agente de horarios y integracion con OpenAI Realtime API para voz en tiempo real.

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
- Aplicar estructura consistente en las 17 rutas: validacion → procesamiento → respuesta.
- Validar autenticacion y autorizacion antes de cualquier procesamiento en rutas AI.
- Implementar rate limiting especifico para operaciones AI (mas restrictivo que rutas generales).
- Reconexion automatica obligatoria en el WebSocket de `as-realtime.ts` (297L).
- Considerar zonas horarias del usuario en todo cambio a `as-schedule.ts` (236L).
- Documentar cambios en rutas y servicios de tiempo real en `agent-memory/ai-rag.md`.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Rutas AI sin validacion de auth | Expone endpoints sensibles | Siempre validar auth/authz primero |
| Ignorar reconexion en WebSocket Realtime | Interrumpe sesiones de voz del usuario | Implementar reconexion automatica en `as-realtime.ts` |
| Latencia > 200ms en audio bidireccional | Degrada la experiencia de voz | Optimizar pipeline en `useRealtimeVoice.ts` (309L) |
| Omitir zonas horarias en el agente de horarios | Genera planes de estudio incorrectos | Siempre resolver timezone del usuario en `as-schedule.ts` |
| Rate limiting identico al de rutas generales | Las ops AI son mas costosas; sobrecarga el sistema | Configurar rate limits especificos y mas restrictivos |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
