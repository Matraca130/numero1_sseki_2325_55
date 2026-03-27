# Agent Memory: FC-04 (flashcards-fsrs)
Last updated: 2026-03-25

## Parámetros críticos (NO cambiar sin aprobación)
- FSRS v4 weights: w8=1.10, w11=2.18, w15=0.29, w16=2.61
- Rating scale: 5-point (1-5) → 4-point GRADES (Again=0.0, Hard=0.35, Good=0.65, Easy=1.0)
- Persistencia: localStorage para batches de review

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
| 2026-03-25 | Los pesos FSRS son constantes calibradas | Cualquier cambio requiere aprobación explícita del usuario | Pesos ajustables dinámicamente |
| 2026-03-25 | localStorage para persistencia de batches | Sobrevive recargas, no depende de backend | sessionStorage, IndexedDB |

## Patrones que funcionan
- useFlashcardEngine.ts como orquestador central del motor
- grade-mapper.ts como traductor único de ratings → grades
- useReviewBatch.ts para gestión de cola de reviews

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar weights sin tests | Los weights están calibrados matemáticamente | Siempre correr suite de tests antes y después |
| await en persistencia de batch | Bloquea la UI durante navegación | Fire-and-forget con catch para errores |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Archivos tocados (promedio) | — | — |
