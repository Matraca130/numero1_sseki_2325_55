# Agent Memory: AI-06 (ai-prompts)
Last updated: 2026-03-25

## Rol
Ingenieria de prompts y plantillas centralizadas para todos los servicios AI, mas el sistema de reportes de calidad pedagogica.

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
- Centralizar todos los prompt templates en `as-types.ts` (232L); ninguno hardcodeado en servicios.
- Asignar identificador unico y version a cada template para trazabilidad y rollback.
- Incluir instrucciones explicitas de formato de salida (JSON schema cuando aplique) en cada prompt.
- Verificar compatibilidad con todos los consumidores antes de modificar `as-types.ts` (afecta a todos los servicios AI).
- Evaluar reportes en 4 dimensiones: relevancia, precision, completitud y adecuacion pedagogica.
- Mantener separacion entre logica de datos y presentacion en `useAiReports.ts` (244L).
- Documentar todo cambio de template en `agent-memory/ai-rag.md` con justificacion y resultados de evaluacion.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Hardcodear prompts directamente en servicios AI | Imposibilita el versionado, A/B testing y rollback | Siempre usar templates centralizados en `as-types.ts` |
| Modificar `as-types.ts` sin verificar consumidores | Rompe silenciosamente servicios que dependen de ese tipo | Revisar todos los importers antes de modificar |
| Templates sin identificador ni version | Impide trazabilidad y rollback ante degradacion | Versionar desde la creacion del template |
| Prompts sin especificacion de formato de salida | Outputs inconsistentes y dificiles de parsear | Incluir JSON schema o instrucciones de formato explícitas |
| Mezclar logica de datos y UI en `useAiReports.ts` | Dificulta mantenimiento y testeo | Mantener separacion clara entre capas |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
