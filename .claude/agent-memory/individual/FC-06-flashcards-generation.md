# Agent Memory: FC-06 (flashcards-generation)
Last updated: 2026-03-25

## Rol
Agente de generación de flashcards con IA de AXON: gestiona el generador inteligente, priorización por NeedScore, targeting por BKT y generación por lotes.

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
- NeedScore como criterio principal de priorización (no sobrescribir con lógica ad-hoc)
- Hooks compartidos entre panel del profesor y generador del estudiante para mantener DRY
- Manejo de errores parciales en batch: no perder cards ya generadas ante fallo parcial
- Llamadas a IA con timeout y retry con backoff exponencial
- Revisar generador y hooks al iniciar sesión para entender estado actual
- Verificar ranking NeedScore y targeting BKT al iniciar sesión
- Leer contratos de datos de FC-04 y FC-05 antes de tocar integraciones

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Sobrescribir NeedScore con lógica ad-hoc | Rompe la priorización inteligente del sistema | Extender NeedScore si se necesita ajuste |
| Generar flashcards duplicadas por keyword en la misma sesión | Degrada la experiencia del alumno | Verificar duplicados antes de generar |
| Llamadas a IA sin timeout ni retry | Fallos silenciosos y UX rota | Timeout explícito + backoff exponencial |
| Modificar archivos fuera de zona sin coordinación | Viola aislamiento de agentes | Coordinar explícitamente via SendMessage |
| Duplicar lógica entre `AiGeneratePanel.tsx` y `SmartFlashcardGenerator.tsx` | Viola principio DRY | Extraer a hook compartido (`useSmartGeneration`, `useQuickGenerate`) |
| Ignorar errores parciales en batch | Pérdida de cards ya generadas | Manejar errores parciales explícitamente |

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `adaptiveGenerationApi.ts` | batch generation con `parallelWithLimit` | `MAX_CONCURRENT=3`, AbortSignal, onProgress | Manejo de errores parciales |
| `aiFlashcardGenerator.ts` | LEGACY wrapper | Compat con SmartFlashcardGenerator | Real flow va via `aiService.generateSmart` |
| `SmartFlashcardGenerator.tsx` | Student-facing modal | `smartGenerateFlashcards`, NeedScore urgency | `generateWithImage` toggle |
| `AiGeneratePanel.tsx` | Professor quiz question panel | `useAiGenerate`; manual vs bulk modes | NOT flashcards — es para quiz questions |
| `useSmartGeneration.ts` | Unified hook flashcard+quiz | Chunks of 10; abort support | Computa uniqueKeywords/uniqueSubtopics/avgPKnow |
| `useQuickGenerate.ts` | Single flashcard hook | `isGeneratingRef` guard | Previene double-click |
| `generate-smart.ts` (backend) | POST `/ai/generate-smart` | RPC `get_smart_generate_target`; 2h dedup window | Plan limit enforcement; adaptive Claude prompt |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
