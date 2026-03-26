# Agent Memory: SM-06 (text-highlighter)
Last updated: 2026-03-25

## Rol
Agente del sistema de highlighting de texto y anotaciones: gestiona la selección de texto, la toolbar flotante, el panel de anotaciones y la persistencia de highlights con código de colores sobre el contenido de resúmenes.

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
- Flujo fijo e inviolable: text selection → highlight toolbar aparece → usuario elige color → POST annotation al backend
- `useTextAnnotations.ts` como hook central para todo el estado y las operaciones CRUD de anotaciones
- Colores de highlight alineados con los tokens del sistema de diseño — nunca valores hardcodeados
- Persistencia inmediata tras la creación: no usar buffers locales ni debounce para anotaciones
- `ReaderAnnotationsTab` sincronizado con los highlights visibles en el texto (misma fuente de verdad)
- `TextHighlighter.tsx` (422L) es el componente principal; refactorizar de forma incremental

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
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
