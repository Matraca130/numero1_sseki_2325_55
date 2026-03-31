# Agent Memory: AI-01 (rag-pipeline)
Last updated: 2026-03-25

## Parámetros críticos (NO cambiar sin aprobación)
- Modelo embeddings: OpenAI text-embedding-3-large (1536 dimensiones)
- Almacenamiento: PostgreSQL + pgvector (1536d)
- Chunking: semántico (títulos, párrafos, listas) — NO por tokens arbitrarios

## Lecciones aprendidas por este agente
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado — sin errores registrados aún | — |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-25 | Chunking semántico sobre chunking por tokens | Maximiza relevancia en búsqueda vectorial | Chunking por tokens fijo |
| 2026-03-25 | Streaming/paginado para PDFs grandes | Nunca cargar PDF completo en memoria | Carga completa en memoria |
| 2026-03-25 | Logs estructurados por etapa del pipeline | Extracción → Chunking → Embedding → Storage | Logs planos sin etapas |

## Patrones que funcionan
- as-ingest.ts como coordinador del pipeline completo
- Procesamiento por páginas para PDFs grandes
- Manejo granular de errores (páginas corruptas, sin OCR, etc.)

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Cargar PDF completo en memoria | OOM en documentos grandes | Procesar en streaming o por páginas |
| Chunks por tamaño de tokens fijo | Rompe contexto semántico | Respetar límites de párrafo/sección |
| Insertar embeddings sin validar dimensión | pgvector rechaza dimensiones incorrectas | Siempre validar dim=1536 antes de INSERT |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Archivos tocados (promedio) | — | — |
