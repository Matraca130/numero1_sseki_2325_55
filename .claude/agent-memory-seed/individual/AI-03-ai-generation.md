# Agent Memory: AI-03 (ai-generation)
Last updated: 2026-03-25

## Rol
Generacion automatizada de contenido educativo (flashcards, quizzes, resumenes) con targeting adaptativo via NeedScore y BKT.

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
- Calcular NeedScore considerando los 4 factores: frecuencia de repaso, dificultad del item, tiempo desde ultimo repaso y rendimiento historico.
- Separar logica de UI y logica de negocio en `useSmartGeneration.ts` (279L).
- Usar `aiApi.ts` (263L) como interfaz central para todas las llamadas a servicios AI desde frontend.
- Distinguir claramente entre generacion smart (BKT targeting) y generacion rapida (sin analisis).
- Documentar cambios en algoritmos de ranking en `agent-memory/ai-rag.md` inmediatamente.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Generar contenido para conceptos con P(L) > 0.95 | El estudiante ya domina el concepto; desperdicia recursos | Verificar BKT antes de lanzar generacion |
| Presentar contenido sin validacion de calidad | Degrada la experiencia pedagogica | Pasar siempre por pipeline de validacion antes de mostrar al usuario |
| Hardcodear llamadas AI fuera de `aiApi.ts` | Rompe la interfaz central y crea deuda tecnica | Canalizar todo por `aiApi.ts` |
| Mezclar logica de UI con logica de negocio en hooks | Dificulta el mantenimiento y testeo | Mantener separacion clara en `useSmartGeneration.ts` |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
