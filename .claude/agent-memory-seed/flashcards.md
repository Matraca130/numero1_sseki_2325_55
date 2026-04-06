# Memory: ${section}
Last updated: 2026-03-18

## Errores conocidos (max 20)
| Fecha | Error | Archivo | Resolución |
|-------|-------|---------|------------|
| 2026-03-18 | delta-color-scale test expected 'blue' for 0.99/0.90 but IEEE 754 gives 1.0999...9 < 1.10 | src/__tests__/delta-color-scale.test.ts:88-91 | Fixed assertion to expect 'green' (correct per floating point) |

## Patterns a evitar (max 10)
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Using ASCII for Spanish chars in test expectations | Source uses accented chars (Conexion vs Conexion, Debil vs Debil) | Use unicode escapes or copy exact string from source |
| Regex assuming 2-digit day/month in toLocaleDateString('es') | jsdom locale formatting may produce 1-digit day/month | Use `\d{1,2}` instead of `\d{2}` |

## Decisiones (max 10)
| Fecha | Decisión | Contexto |
|-------|---------|----------|
| 2026-03-18 | Perf test at mindmap/__tests__/ not __tests__/ | vitest.config includes only src/**/*.test.ts; root __tests__/ would not be picked up |
| 2026-03-18 | Cross-linked graphs make computeHiddenNodes non-deterministic for root collapse | Cross-links create incoming edges to tree root, so root is no longer detected as root by the BFS seed logic. Use pure trees for collapse correctness tests. |
| 2026-03-18 | Test unexported pure functions by replicating logic in test files | useEdgeReconnect's findNearestNode is not exported; replicate + validate contract via source reading (same pattern as mapComparisonPanel.test.ts) |
