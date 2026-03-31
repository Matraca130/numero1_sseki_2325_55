# Agent Memory: QZ-01 (quiz-frontend)
Last updated: 2026-03-27

## Rol
Agente frontend de la sección Quiz de AXON — implementa y modifica componentes React del módulo Quiz (Student + Professor).

## Parámetros críticos
- **Stack**: React 18 + TypeScript strict + Tailwind v4
- **BKT**: v4 para knowledge tracing (backend en `lib/bkt-v4.ts`)
- **Quiz types**: MCQ, True/False, Open-ended
- **Design system**: Georgia headings, Inter body, teal `#14b8a6`, pill buttons, `rounded-2xl` cards
- **API**: usar siempre `apiCall()` de `lib/api.ts`

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-26 | AdaptiveQuizModal es para AI-generated quizzes con fases (config/generating/success/error) — no sirve como wrapper para quiz simple de bloque. Crear componente separado. | Evaluar siempre si adaptar o crear, pero no forzar wrapper cuando la complejidad del original no encaja |
| 2026-03-26 | quizDesignTokens.ts tiene MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER, FEEDBACK, BTN_CLOSE — reutilizar para consistencia visual entre modales quiz | Importar tokens compartidos en vez de hardcodear clases |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| Usar quizDesignTokens.ts para tokens compartidos | 1 | SI — evitó inconsistencia visual | NUEVA |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-26 | Crear BlockQuizModal standalone en vez de wrapper de AdaptiveQuizModal | AdaptiveQuizModal tiene 4 fases complejas (config/generating/success/error) que no aplican a un quiz simple de bloque con preguntas mock | Wrapper con blockId prop sobre AdaptiveQuizModal |

## Patrones que funcionan
- Question renderers en `components/student/renderers/` — un renderer por tipo de pregunta
- Estado de sesión via hooks: `useQuizSession`, `useQuizNavigation`, `useQuizBackup`
- Professor side: `QuizFormModal` para crear/editar, `QuizzesManager` para listar
- Hooks de queries: `useQuiz*.ts`, `useQuestion*.ts` en `src/app/hooks/queries/`
- Archivos clave de sesión: `QuizView.tsx`, `QuizSessionView.tsx`, `QuizResultsScreen.tsx`
- Importar tokens de `quizDesignTokens.ts` para modales quiz (MODAL_OVERLAY, MODAL_CARD, FEEDBACK, etc.)
- Promise.allSettled en handleSelectSummary: cargar quizzes+preguntas en paralelo sin bloquear si uno falla
- Promise.all en useQuizSession init: session creation + question loading en paralelo (E16 FIX)
- submittingRef + savedAnswersRef como ref-mirrors de state: evitan stale closures en async callbacks
- Gamification celebrations exclusivamente en QuizResults via useQuizGamificationFeedback — nunca en QuizTaker
- quiz-session-helpers.ts para funciones puras (loadAndNormalizeQuestions, checkAndProcessBackup)

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Viola TypeScript strict, rompe type safety | Tipar correctamente o usar `unknown` |
| `console.log` en producción | Ruido en logs, posible leak de datos | Eliminar antes de commit |
| Llamadas directas a fetch/axios | Bypasea interceptores y manejo de errores centralizado | Usar `apiCall()` de `lib/api.ts` |
| Modificar archivos fuera de zona de ownership | Rompe aislamiento de agentes | Escalar al Arquitecto (XX-01) |
| Prefijos `_` para props no usadas aún (blockId, summaryId) | Son necesarios para futura integración con backend | Mantener en la interfaz, usar prefijo `_` solo temporalmente en destructuring |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 2 | 2026-03-27 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| QuizView.tsx | QuizView | State-machine thin orchestrator (selection→session) | Siempre <100 líneas; lógica en sub-components |
| QuizSessionView.tsx | QuizSessionView | @deprecated Phase 14 — reemplazado por QuizTaker+QuizResults | No usar en código nuevo |
| QuizResultsScreen.tsx | QuizResultsScreen | @deprecated Phase 14 — reemplazado por student/QuizResults.tsx | No usar en código nuevo |
| QuizSelection.tsx | QuizSelection | Sidebar tree + right panel; Promise.allSettled para quizzes+questions | Filtra q.is_active; fallback si quiz_id filter falla |
| QuizOverview.tsx | QuizOverview | PLACEHOLDER_PROGRESS decorativo — NO conectado a BKT real | Progress % es falso; no confundir con mastery real |
| quiz-helpers.ts | checkAnswer, LETTERS, SavedAnswer | open/fill_blank usan fuzzy match bidireccional | MCQ exacto; normalizeText quita acentos antes de comparar |
| QuizTaker.tsx | QuizTaker | Phase-based (loading/error/recovery/session/results); gamification SOLO en QuizResults | BUG-020: time_limit_seconds inerte — columna falta en DB |
| useQuizSession.ts | useQuizSession, QuizPhase | Session init+submit+backup; Promise.all session+questions en paralelo | savedAnswersRef evita stale closures; submittingRef previene doble-submit |
| useQuizNavigation.ts | useQuizNavigation | Extracción R2 de QuizTaker; nav+live-input+submit wrappers | Hook existe pero QuizTaker aún inlinea parte de esta lógica |
| useQuizBackup.ts | saveQuizBackup, clearQuizBackup, validateAndReorderBackup | localStorage TTL 24h, key axon_qb_{quizId}, nunca lanza | MIN_MATCH_RATIO=0.5 para validar backup vs preguntas actuales |
| useQuizBkt.ts | useQuizBkt | BKT v3.1 inline; fire-and-forget upsertBktState | P_TRANSIT=0.1, P_SLIP=0.1, P_GUESS=0.25, RECOVERY_FACTOR=0.15 |
| renderers/McqRenderer.tsx | McqRenderer | React.memo; LETTERS importado de lib/quiz-utils (no content/quiz-helpers) | FeedbackBlock como sub-componente separado |
| quiz-types.ts | SavedAnswer, GroupStat | Tipos compartidos entre QuizTaker sub-components | SavedAnswer.answer = raw string; selectedOption solo para MCQ display |
| quizDesignTokens.ts | PROFESSOR_COLORS, STUDENT_COLORS, FEEDBACK, MODAL_*, BTN_* | Single source of truth; profesor usa #2a8c7a, student usa axon CSS vars | Siempre importar tokens, nunca hardcodear clases quiz |
| quizApi.ts | barrel re-export | Thin barrel re-exporta 6 sub-módulos | Importar desde aquí para backwards compat |
| quiz-student-routes.ts | quizStudentRoutes | Route única /quizzes → QuizView con lazyRetry | lazyRetry = retry automático en chunk load failure |
| QuizFormModal.tsx (professor) | QuizFormModal | create/edit modal con time_limit_seconds UI | BUG-020: backend no tiene columna — campo se pierde en save |
| QuizzesManager.tsx (professor) | QuizzesManager | Lista quizzes + QuizFormModal + QuizQuestionsEditor + QuizAnalyticsPanel | QuizErrorBoundary desde shared/ (no student/) |
| AdaptiveQuizModal.tsx | AdaptivePhase re-export | 4 fases AI: config/generating/success/error | No usar como wrapper para quizzes simples |
