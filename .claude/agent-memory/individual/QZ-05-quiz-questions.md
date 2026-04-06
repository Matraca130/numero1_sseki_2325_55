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
