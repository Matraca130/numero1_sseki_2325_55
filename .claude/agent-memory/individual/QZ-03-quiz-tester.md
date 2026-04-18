# Agent Memory: QZ-03 (quiz-tester)
Last updated: 2026-04-18

## Rol
Agente tester de la sección Quiz de AXON — escribe y ejecuta tests para quiz session, BKT logic, question rendering y smart generation.

## Parámetros críticos
- **Zona exclusiva**: solo Write en archivos de test
- **Frontend tests**: `src/__tests__/quiz-*.test.ts` **y** tests co-ubicados en `src/app/services/__tests__/quiz*.test.ts` / `src/app/lib/__tests__/quiz-*.test.ts` (patrón establecido por flashcardApi.test.ts etc.)
- **Backend tests**: `supabase/functions/server/tests/bkt_v4_test.ts`
- **Comandos**:
  - Frontend: `npm run test -- --testPathPattern=quiz` o archivos concretos `npm test -- <ruta>`
  - Backend: `deno test supabase/functions/server/tests/bkt_v4_test.ts`
  - Verificación TS: `npm run build`

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-04-18 | En `getQuizQuestions`, `offset=0` es falsy y NO se agrega al URL (usa `if (filters?.offset)`), mientras que `limit=0` tampoco. Asertar `toContain('offset=0')` falla. | Testear `offset=0` como caso "no presente" y solo asertar presencia cuando el valor es truthy. |
| 2026-04-18 | En el worktree, `node_modules/three` no siempre está populado → `npm run build` rompe por `ENOENT three`. No es fallo del test code. | Confirmar con `npx tsc --noEmit -p tsconfig.json` sobre los archivos nuevos si el build del worktree falla por módulos ausentes. |
| 2026-04-18 | `getQuizAttempts({})` genera URL `'/quiz-attempts?'` (con `?` final pero sin query) — es el comportamiento observado del `URLSearchParams`. | Asertar igualdad exacta en este caso; no asumir que el `?` se elide. |
| 2026-04-18 | `checkAnswer` para MCQ es strict equality (case-sensitive, whitespace-sensitive). Para true_false y fill_blank/open usa `normalizeText`. No asumir normalización en MCQ. | Separar suites por `question_type`; documentar en test que MCQ es strict. |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| Incluir casos negativos y edge cases | 1 (2026-04-18) | SÍ (pillé `offset=0` falsy quirk como edge case) | MEDIA |
| Tests sin mocks para lógica pura (quiz-utils) | 1 (2026-04-18) | SÍ (tests deterministas, sin setup frágil) | MEDIA |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-04-18 | Tests co-ubicados en `src/app/services/__tests__/` y `src/app/lib/__tests__/` en lugar de `src/__tests__/quiz-*.test.ts` | La tarea lo pidió explícitamente, y el patrón ya existe para flashcardApi/studentApi/etc. Mantiene consistencia con vecinos. | Poner todo en `src/__tests__/quiz-*.test.ts` → rompe la convención de co-ubicación que usan otros services. |
| 2026-04-18 | `vi.mock('@/app/lib/api', () => ({ apiCall: vi.fn() }))` + `vi.mocked(apiCall)` por archivo | Patrón ya usado por flashcardApi.test.ts (DRY). | `vi.fn()` suelto con referencia via `...args` → funciona pero es más verboso. |
| 2026-04-18 | Barrel tests verifican identidad de referencia (mismo objeto fn entre `quizApi` y los módulos origen) | Guard contra refactors que rompan el barrel sin que lo detectes. | Solo checkear `typeof === 'function'` → más débil, no detecta mis-wiring. |

## Patrones que funcionan
- Ejecutar `npm run build` siempre después de los tests para verificar TypeScript
- Separar tests frontend (Jest/vitest) de backend (Deno) — entornos distintos
- Naming `quiz-*.test.ts` para que el pattern de Jest los recoja automáticamente
- Co-ubicar tests de services en `src/app/services/__tests__/` — match con `vitest.config.ts` include `src/**/*.test.ts`
- Mockear `apiCall` una vez con `vi.mocked()` para type-safe assertions sobre URL/method/body
- Para lógica pura (`quiz-utils`), tests SIN mocks con casos deterministas (MCQ strict vs fill_blank flexible)
- Fixtures canónicos al inicio del archivo para evitar duplicación
- Tests para edge cases: `offset=0`, `is_active=false`, `time_limit_seconds=null`, string vs int difficulty

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Escribir en archivos fuera de `__tests__/quiz-*` o `tests/bkt_v4_test.ts` | Viola zona de ownership | Solo escribir en archivos de test asignados |
| Omitir `npm run build` tras los tests | TypeScript errors pueden quedar silenciosos | Siempre hacer build como paso final de verificación |
| Tests sin casos de error/edge | Cobertura incompleta de BKT y quiz session | Incluir casos negativos y edge cases en cada suite |
| Asumir que `offset=0` aparece en la URL de `getQuizQuestions` | El código usa `if (filters?.offset)` → 0 es falsy y se omite | Asertar explícitamente la ausencia cuando el valor sea falsy |
| Asumir que MCQ `checkAnswer` normaliza whitespace/case | Es strict equality por diseño (`userAnswer === q.correct_answer`) | Separar suites por `question_type` y documentar la diferencia |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 1 | 2026-04-18 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Tests escritos (acumulado) | 124 | 2026-04-18 |

## Sesión 2026-04-18
- Tarea: cobertura de quiz services (quizApi, quizAttemptsApi, quizQuestionsApi, quizzesEntityApi) + quiz-utils.
- Archivos creados (5):
  - `src/app/services/__tests__/quizApi.test.ts` (23 tests — barrel re-exports + identity)
  - `src/app/services/__tests__/quizAttemptsApi.test.ts` (15 tests — POST/GET contratos)
  - `src/app/services/__tests__/quizQuestionsApi.test.ts` (29 tests — CRUD + block_id + difficulty)
  - `src/app/services/__tests__/quizzesEntityApi.test.ts` (23 tests — CRUD + no-block_id invariant)
  - `src/app/lib/__tests__/quiz-utils.test.ts` (34 tests — LETTERS, normalizeText, checkAnswer por tipo)
- Resultado: 124/124 passing. `npm run build` falla en el worktree por `node_modules/three` ausente (no relacionado con mis cambios). `tsc --noEmit` sobre los archivos nuevos: sin errores.
- Zona respetada: solo Writes en `src/app/services/__tests__/` y `src/app/lib/__tests__/`, y update de memoria. Cero scope creep.

---

## Sesión 2026-04-18 (wave 2) — BKT + mastery hooks

**Archivos:** bktApi, smartGenerateApi, useKeywordMastery (Sistema C verificado, delta), useTopicMastery (Sistema B, absoluto).

**Resultado:** 88 tests verdes (23+15+27+23).

### Lecciones
1. **Arrays en deps de hook → referencias estables.** Pasar `['t-1']` literal en cada render triggerea loop infinito (13k+ spies). Usar `const IDS = Object.freeze(['t-1'])` hoisted y reutilizado.
2. **`??` no cubre `[]`.** El nullish-coalescing solo substituye `null`/`undefined`. Un array vacío pasa por el operador — testear explícitamente la rama `[]`.
3. **`mockRejectedValueOnce` cubre UNA sola call.** Si un test hace `expect(...).rejects.toThrow(/A/)` y luego `expect(...).rejects.toThrow(/B/)` sobre la misma función, hay que primear N veces. Mismo para `mockResolvedValueOnce`.
4. **Mockear `getAxonToday`** para determinismo en lógica `due < now` (date-sensitive tests).
