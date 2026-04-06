# Agent Memory: SM-06 (text-highlighter)
Last updated: 2026-03-30

## Rol
Agente del sistema de highlighting de texto y anotaciones: gestiona la selección de texto, la toolbar flotante, el panel de anotaciones y la persistencia de highlights con código de colores sobre el contenido de resúmenes.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-26 | ReaderAnnotationsTab not reusable for block-level notes: different data model (backend TextAnnotation vs localStorage), color system overhead, ConfirmDialog dependency. Standalone component is the right call. | Evaluate adaptation cost before wrapping existing components |
| 2026-03-30 | KeywordChip popover interactive hover: needs `leaveTimer` + `cancelClose` pattern. Mouse leaving chip should NOT close if mouse enters popover within 100ms grace period. `pointer-events-auto` required on popover for interaction. | When making tooltips/popovers interactive, always add grace period timer + mouse handlers on BOTH trigger AND popover elements |
| 2026-03-30 | SafeBoundary error boundary in KeywordCrossSummaryPanel: wraps React Query hook usage so component degrades gracefully in tests without QueryClientProvider. Pragmatic but could mask real errors. | Use error boundaries around components that depend on context providers and may be rendered in isolation (tests, storybook) |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-26 | BlockAnnotationsPanel: standalone component with localStorage | ReaderAnnotationsTab is backend-coupled (TextAnnotation type, API callbacks, color system, ConfirmDialog). A wrapper/adapter would add complexity without benefit. | Wrapper around ReaderAnnotationsTab with blockId filter |
| 2026-03-30 | KeywordCrossSummaryPanel uses existing useKeywordSearchQuery hook — no new API needed. Deduplicates by summary_id since same keyword can appear multiple times in one summary. | Always check existing hooks/queries before creating new API calls. useKeywordSearchQuery already handles cross-summary keyword search. |

## Patrones que funcionan
- Flujo fijo e inviolable: text selection → highlight toolbar aparece → usuario elige color → POST annotation al backend
- `useTextAnnotations.ts` como hook central para todo el estado y las operaciones CRUD de anotaciones
- Colores de highlight alineados con los tokens del sistema de diseño — nunca valores hardcodeados
- Persistencia inmediata tras la creación: no usar buffers locales ni debounce para anotaciones
- `ReaderAnnotationsTab` sincronizado con los highlights visibles en el texto (misma fuente de verdad)
- `TextHighlighter.tsx` (422L) es el componente principal; refactorizar de forma incremental
- Interactive popover pattern: `leaveTimer` (100ms) + `cancelClose` on both chip and popover elements keeps popover open during mouse transition
- KeywordCrossSummaryPanel: compact cross-summary list reusing existing `useKeywordSearchQuery` — no new API, dedup by summary_id, graceful empty state

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Saltarse pasos del flujo (ej: POST directo sin toolbar) | Rompe la UX esperada y el contrato de interacción del sistema | Respetar siempre el flujo: selection → toolbar → persistencia |
| Usar colores de highlight fuera del sistema de diseño | Inconsistencia visual con el resto de la app | Usar solo los tokens de color predefinidos del design system |
| Bufferear o demorar la persistencia de anotaciones | El usuario pierde datos si cierra antes de que se guarden | Persistir inmediatamente en cada creación vía `sa-content.ts` |
| Modificar la sección de text-annotations en `sa-content.ts` sin coordinar con SM-01 | El archivo es compartido; cambios no coordinados rompen la integración con el reader | Coordinar explícitamente con SM-01 antes de cualquier cambio en esa sección |
| Refactorizar `TextHighlighter.tsx` en un solo commit masivo | Componente de 422L; cambios grandes aumentan el riesgo de regresión | Refactorizar incrementalmente, un bloque de lógica a la vez |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 2 | 2026-03-30 |
| Quality-gate PASS | 1 | 2026-03-30 |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
