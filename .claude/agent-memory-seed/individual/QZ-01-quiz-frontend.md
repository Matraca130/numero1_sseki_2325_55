# Agent Memory: QZ-01 (quiz-frontend)
Last updated: 2026-03-25

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

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- Question renderers en `components/student/renderers/` — un renderer por tipo de pregunta
- Estado de sesión via hooks: `useQuizSession`, `useQuizNavigation`, `useQuizBackup`
- Professor side: `QuizFormModal` para crear/editar, `QuizzesManager` para listar
- Hooks de queries: `useQuiz*.ts`, `useQuestion*.ts` en `src/app/hooks/queries/`
- Archivos clave de sesión: `QuizView.tsx`, `QuizSessionView.tsx`, `QuizResultsScreen.tsx`

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Viola TypeScript strict, rompe type safety | Tipar correctamente o usar `unknown` |
| `console.log` en producción | Ruido en logs, posible leak de datos | Eliminar antes de commit |
| Llamadas directas a fetch/axios | Bypasea interceptores y manejo de errores centralizado | Usar `apiCall()` de `lib/api.ts` |
| Modificar archivos fuera de zona de ownership | Rompe aislamiento de agentes | Escalar al Arquitecto (XX-01) |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
