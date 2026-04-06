# Agent Memory: AI-02 (rag-chat)
Last updated: 2026-03-25

## Parámetros críticos (NO cambiar sin aprobación)
- LLM: Gemini 2.5 Flash para generación
- Streaming: SSE (Server-Sent Events)
- Stream convention: enviar BOTH ?stream=1 AND body.stream (decisión final, NO re-litigar)
- Sanitización: DOMPurify para todo output AI renderizado

## Lecciones aprendidas por este agente
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | BUG-035 (stream param mismatch) ya resuelto | Siempre enviar ambos: query param Y body field |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-25 | Dual stream param (query + body) | Backend checks ambos; eliminar uno rompe streaming | Solo query param, solo body param |
| 2026-03-25 | DOMPurify obligatorio | Previene XSS en output del LLM | Renderizar HTML crudo del LLM |
| 2026-03-25 | Reconexión automática en SSE | El usuario no debe perder contexto si la conexión se cae | Sin reconexión automática |

## Patrones que funcionan
- AxonAIAssistant.tsx (1106L) como componente monolítico — refactors deben ser incrementales
- Renderizado incremental de streaming (no esperar mensaje completo)
- Ventana de historial limitada para no exceder tokens del modelo

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Enviar solo ?stream=1 sin body.stream | Backend checkea ambos → streaming falla silenciosamente | Siempre enviar AMBOS |
| Renderizar HTML del LLM sin sanitizar | XSS via prompt injection | DOMPurify.sanitize() siempre |
| Refactor big-bang de AxonAIAssistant | 1106 líneas, alto riesgo de regresión | Refactors incrementales con tests |
| Historial ilimitado en contexto | Excede límite de tokens del modelo | Ventana deslizante de N turnos |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Archivos tocados (promedio) | — | — |
