# Agent Memory: QZ-04 (quiz-adaptive)
Last updated: 2026-03-25

## Parámetros críticos (NO cambiar sin aprobación)
- BKT v4: P_LEARN=0.18, P_FORGET=0.25, RECOVERY=3.0
- Máquina de estados: 5 fases (idle, loading, answering, feedback, complete)
- Tracking BKT: fire-and-forget (nunca bloquear UI)

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
| 2026-03-25 | BKT tracking es fire-and-forget | Las llamadas a bktApi se disparan sin await para no bloquear la UI | await bloqueante en el flujo del quiz |
| 2026-03-25 | Máquina de estados de 5 fases es sagrada | Cualquier cambio requiere revalidar todas las transiciones | Máquina simplificada de 3 fases |

## Patrones que funcionan
- useQuizBkt.ts como wrapper limpio del modelo BKT
- useBktStates.ts para estados derivados (mastery level, etc.)
- Separación clara: modal (UI) vs hook (lógica) vs service (API)

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| await bktApi calls en UI flow | Bloquea la experiencia del quiz | Fire-and-forget con error logging |
| Cambiar params BKT sin tests | Los params están calibrados contra datos reales | Validar con suite de tests + comparar contra baseline |
| Mezclar lógica de gamificación con BKT | Son concerns separados | useQuizGamificationFeedback.ts maneja gami, useQuizBkt.ts maneja BKT |

## Métricas
## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `bkt-v4.ts` (backend) | `computeBktV4Update`, `calculateRecoveryMultiplier`, `getTypeMultiplier`, `updateMastery`, `calculateDisplayMastery` | Funciones puras, sin side-effects | `isCorrect` threshold es `grade >= 3`; Hard(2) INCORRECTO para BKT pero correcto para FSRS |
| `useQuizBkt.ts` | `useQuizBkt()`, `computeBktMastery()` | Refs mutables acumulan mastery sin re-renders | BKT v3.1 inline ≠ backend v4; RECOVERY_FACTOR=0.15 aditivo |
| `useBktStates.ts` | `useBktStates(questions)` → `{ bktStates, bktBySubtopic, hasBktData }` | Fetch batch por subtopic_ids; Map O(1) lookup | Flag `cancelled` evita setState post-unmount (FIX H5-4) |
| `useAdaptiveQuiz.ts` | `useAdaptiveQuiz()` → `{ phase, count, result, error, quizId, generate, reset }` | State machine: `idle→config→generating→success/error` | Fases DISTINTAS a las 5 del motor BKT — dos state machines separadas |
| `bktApi.ts` | `upsertBktState()`, `getBktStates()`, `getAllBktStates()` | graceful degradation (catch → `[]`) | `subtopic_id` y `subtopic_ids` mutuamente excluyentes; batch max 200 |

| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Archivos tocados (promedio) | — | — |
