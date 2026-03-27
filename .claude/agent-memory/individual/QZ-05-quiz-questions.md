# Agent Memory: QZ-05 (quiz-questions)
Last updated: 2026-03-25

## Rol
Agente responsable del CRUD de preguntas y sus renderizadores — gestiona creación, edición y eliminación de preguntas, y los componentes de renderizado por tipo.

## Parámetros críticos
- **Tipos de pregunta**: MCQ (opción múltiple), True/False, Fill-blank, Open-ended
- **Etiquetas MCQ**: letras A-H para opciones — convención fija, no cambiar
- **Arquitectura**: patrón renderer — `QuestionRenderer` es dispatcher central, delega al renderer específico sin lógica de negocio interna
- **Stack**: React + TypeScript, formularios controlados con validación completa antes de envío a API
- **API**: `services/quizQuestionsApi.ts` (148L) maneja todas las operaciones CRUD

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
- Cada tipo de pregunta tiene su propio renderer independiente en `components/student/renderers/`
- `FeedbackBlock` reutilizable por cualquier tipo de pregunta
- `QuestionFormModal` (317L) con `AnswerEditor` (157L) integrado para CRUD del profesor
- `useQuestionForm.ts` (284L) + `useQuestionCrud.ts` (75L) para lógica de formulario separada de UI
- Separación clara: vista estudiante (renderers) vs. vista profesor (CRUD)

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Lógica de negocio dentro de `QuestionRenderer` | Es dispatcher puro — debe solo delegar | Poner lógica en el renderer específico del tipo |
| Cambiar etiquetas MCQ de A-H a números u otro sistema | Rompe convención del sistema y posibles persistencias | Mantener siempre letras A-H |
| Validación parcial en formularios del profesor | Datos inválidos llegan al API | Validar completamente antes de llamar a `quizQuestionsApi.ts` |
| `FeedbackBlock` acoplado a un solo tipo de pregunta | Pierde reutilizabilidad | Mantenerlo genérico y sin dependencias de tipo específico |
| Modificar archivos de QZ-04 o QZ-06 sin coordinación | Rompe contratos de datos entre agentes | Leer sus archivos para entender contratos; escalar al Arquitecto si hay cambio necesario |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |

## [2026-03-27] Especialización: Conocimiento de código

- **Task**: Relevamiento exhaustivo de renderers y hooks de CRUD de preguntas
- **Learned**: `QuestionRenderer` es dispatcher puro sin lógica de negocio; todos los renderers usan `React.memo` + `FeedbackBlock` inline para feedback visual
- **Pattern**: Los 3 renderers comparten paleta de estados: teal (seleccionado), emerald (correcto), rose (incorrecto), gray (neutro/deshabilitado)

### Tabla compacta — Renderers y Hooks

| Archivo | Exports | Props clave | Patrón |
|---------|---------|-------------|--------|
| `renderers/McqRenderer.tsx` | `McqRenderer`, `McqRendererProps` | options, correctAnswer, selectedAnswer, showResult, isReviewing, onSelectOption | Radio-group de botones; LETTERS[i] de `quiz-utils` para etiquetas A-H |
| `renderers/TrueFalseRenderer.tsx` | `TrueFalseRenderer`, `TrueFalseRendererProps` | correctAnswer, tfAnswer, showResult, isReviewing, onSelectTF | Botones true/false con íconos CheckCircle2/XCircle de lucide |
| `renderers/OpenRenderer.tsx` | `OpenRenderer`, `OpenRendererProps` | questionType ('open'\|'fill_blank'), textAnswer, isCorrectResult, onChangeText, onSubmitText | Textarea; Enter sin Shift = submit; aria-describedby para a11y |
| `student/QuestionRenderer.tsx` | `QuestionRenderer`, `QuestionRendererProps` | question, questionIndex, + todas las props de los 3 renderers | Dispatcher puro — switch por `question_type`; aria-live para screen readers |
| `professor/useQuestionCrud.ts` | `useQuestionCrud(loadQuestions)` | showModal, editingQuestion, handlers (Delete/Restore/Edit/Create/Saved/CloseModal) | Extrae estado de modal + handlers CRUD; delega API a `quizApi` |
| `professor/useQuestionForm.ts` | `useQuestionForm`, params/return types | summaryId, question, onSaved, quizId, keywordRequired | 284L de lógica de formulario: tipos, validación, opciones, submit |

### Contratos de datos relevantes
- `QuizQuestion` y `QuestionType` de `@/app/services/quizApi`
- `QUESTION_TYPE_LABELS`, `DIFFICULTY_TO_INT`/`INT_TO_DIFFICULTY` de `@/app/services/quizConstants`
- `LETTERS` (A-H) de `@/app/lib/quiz-utils`
- **Métricas actualizadas**: Sesiones ejecutadas → 1 (2026-03-27)
