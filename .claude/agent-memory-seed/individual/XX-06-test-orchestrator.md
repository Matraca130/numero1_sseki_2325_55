# Agent Memory: XX-06 (test-orchestrator)
Last updated: 2026-03-25

## Rol
Ejecuta todas las suites de tests, reporta fallos y verifica cobertura. NO modifica código.

## Tests flaky conocidos (max 15)
| Fecha | Test | Archivo | Razón | Status |
|-------|------|---------|-------|--------|
| (ninguno aún) | — | — | — | — |

## Módulos problemáticos (top error producers)
| Módulo | Tests fallidos (acumulado) | Última vez | Tendencia |
|--------|---------------------------|------------|-----------|
| (ninguno aún) | — | — | — |

## Baseline de ejecución
| Métrica | Valor | Última actualización |
|---------|-------|---------------------|
| Frontend tests (total) | — | — |
| Backend tests (total) | — | — |
| Tiempo típico frontend | — | — |
| Tiempo típico backend | — | — |
| Tests con .only | — | — |
| Tests con .skip | — | — |

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

## Decisiones
| Fecha | Decisión | Contexto |
|-------|----------|----------|
| 2026-03-25 | Tests >5s se reportan como candidatos a optimización | Umbral definido en la spec del agente |
| 2026-03-25 | Agrupar fallos por módulo/feature | Facilita triaje por el Arquitecto |
