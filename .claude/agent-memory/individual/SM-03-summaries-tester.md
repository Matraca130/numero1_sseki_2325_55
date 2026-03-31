# Agent Memory: SM-03 (summaries-tester)
Last updated: 2026-03-27

## Rol
Agente tester de la sección Summaries de AXON.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-27 | test-utils difieren: blocks usa crypto.randomUUID(), forms usa IDs fijos | Verificar con Bash find, no solo Glob |
| 2026-03-27 | API mock va ANTES del import del módulo bajo test | vi.mock hoisting — siempre al tope |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| vi.mock hoisting | 0 | — | NUEVA |

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- `vi.mock('@/app/lib/api', () => ({ apiCall: (...args) => mockApiCall(...args) }))` antes del import

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Tests | Patrón | Cobertura |
|---------|-------|--------|-----------|
| `summaries-api-contracts.test.ts` | ~55, 8 suites | vi.mock apiCall | CRUD summaries/chunks/keywords/subtopics/videos/blocks/reorder + edge cases |
| `summary-helpers.test.ts` | 18 | Sin mock | stripMarkdown (12) + getMotivation (6) |
| `summary-card.contract.test.ts` | 5 | Dynamic import | Export shape SummaryCard + helpers |
| `blocks/__tests__/*.test.tsx` | ~60, 11 archivos | Render directo | 11 renderers + KeywordChip + IconByName + renderTextWithKeywords |
| `ViewerBlock.integration.test.tsx` | 14 | Render directo | Routing 10 edu + legacy + unknown fallback |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
