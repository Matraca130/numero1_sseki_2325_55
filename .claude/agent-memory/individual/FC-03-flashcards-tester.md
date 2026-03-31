# Agent Memory: FC-03 (flashcards-tester)
Last updated: 2026-03-27

## Rol
Agente tester de la sección Flashcards de AXON.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-27 | mockApiCall + vi.mock ANTES del import (hoisting) | Siempre al tope del archivo |
| 2026-03-27 | motion/react requiere Proxy mock genérico para todos los elementos HTML | Proxy dinámico |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| vi.mock hoisting | 0 | — | NUEVA |

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- `updateFlashcard` usa PUT (no PATCH) — contrato explícito con backend
- Keyboard shortcuts testeados via `fireEvent.keyDown(window, { key: '...' })`
- No hay tests backend (fsrs_v4_test.ts) en este repo frontend

## [2026-03-27] Especialización: Conocimiento de código

| File | Type | Suites/Cases | Gotcha |
|------|------|-------------|--------|
| `flashcard-api-contracts.test.ts` | API contract | 7 suites, ~30 cases | vi.mock apiCall inspects URL + payload |
| `SessionScreen.test.tsx` | UI/component | 1 suite, 14 cases | motion/react Proxy mock; lucide-react spans; RATINGS const |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
