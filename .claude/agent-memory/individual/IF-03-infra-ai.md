# Agent Memory: IF-03 (infra-ai)
Last updated: 2026-03-25

## Rol
Agente de infraestructura AI de AXON: mantiene los AI providers (OpenAI, Gemini, Claude), el RAG pipeline, el pipeline de smart generation, y todas las rutas AI del backend.

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
- Embeddings con OpenAI `text-embedding-3-large` (1536d) — no mezclar con el modelo antiguo de Gemini (768d).
- Gemini 2.5 Flash para generación de contenido; Claude para análisis — respetar la división por caso de uso.
- RAG con multi-query + HyDE + re-ranking + strategy selection en `retrieval-strategies.ts`.
- `generate-smart.ts` es compartido por Quiz y Flashcards — coordinar con quiz-ai y flashcards-ai antes de modificarlo.
- `ai-normalizers.ts` como capa de normalización de respuestas de distintos proveedores — no normalizar en las rutas individuales.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar `generate-smart.ts` sin coordinar con quiz-ai y flashcards-ai | Rompe ambos módulos simultáneamente | Avisar a ambos agentes y coordinar el cambio |
| Llamar providers AI directamente desde rutas sin pasar por los módulos de provider | Lógica duplicada, retry/normalización inconsistente | Usar `gemini.ts`, `claude-ai.ts`, `openai-embeddings.ts` como wrappers |
| Mezclar dimensiones de embeddings (768d vs 1536d) | Búsqueda vectorial rota | Usar siempre `text-embedding-3-large` (1536d) |
| Tocar archivos fuera de la zona de ownership sin coordinación | Conflictos con otros agentes | Escalar al arquitecto (XX-01) |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
