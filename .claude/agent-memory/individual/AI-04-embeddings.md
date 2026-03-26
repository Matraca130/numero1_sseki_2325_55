# Agent Memory: AI-04 (embeddings)
Last updated: 2026-03-25

## Parámetros críticos (NO cambiar sin aprobación)
- Modelo: OpenAI text-embedding-3-large (1536 dimensiones)
- Storage: PostgreSQL + pgvector
- Índices: IVFFlat (datasets grandes) o HNSW (mayor precisión)
- Distancia: coseno

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
| 2026-03-25 | IVFFlat como índice default | Balance entre velocidad y precisión para volumen actual | HNSW (mayor precisión pero más lento para este volumen) |
| 2026-03-25 | Cache local en useRagAnalytics | Evitar llamadas excesivas al backend para stats de cobertura | Sin cache, polling directo |
| 2026-03-25 | Nunca eliminar embeddings sin verificar referencias | Conversaciones activas pueden referenciar chunks | DELETE directo sin auditoría |

## Patrones que funcionan
- as-analytics.ts para stats de cobertura centralizadas
- Cache local en hooks para métricas que cambian poco
- Validación de dimensión (1536) antes de INSERT

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Full table scan para stats de cobertura | Muy lento en datasets grandes | Queries con COUNT + índices |
| DELETE de embeddings sin verificar refs | Rompe conversaciones activas | Check referencias antes de DELETE |
| Insertar sin validar dimensión | pgvector rechaza silenciosamente | Validar dim=1536 en capa de servicio |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Archivos tocados (promedio) | — | — |
