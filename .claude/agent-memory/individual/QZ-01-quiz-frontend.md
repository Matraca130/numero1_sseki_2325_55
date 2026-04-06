# Agent Memory: QZ-01 (quiz-frontend)
Last updated: 2026-03-26

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
| Sesiones ejecutadas | 1 | 2026-03-26 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
