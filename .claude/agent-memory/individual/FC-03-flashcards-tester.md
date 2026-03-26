# Agent Memory: FC-03 (flashcards-tester)
Last updated: 2026-03-25

## Rol
Agente tester de la sección Flashcards de AXON: escribe y ejecuta tests para flashcard UI, FSRS logic, batch review y adaptive generation.

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
- Tests frontend: `npm run test -- --testPathPattern=flashcard` (desde directorio frontend)
- Tests backend: `deno test supabase/functions/server/tests/fsrs_v4_test.ts` y `batch_review_validators_test.ts`
- Correr `npm run build` después de tests para verificar TypeScript
- Mockear Supabase client cuando los tests lo requieran
- Testear edge cases: null, empty, invalid input
- Registrar errores encontrados en `.claude/agent-memory/flashcards.md`

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Tests no determinísticos | Resultados inconsistentes entre ejecuciones | Mockear estado externo, seeds fijos |
| Modificar source code | Fuera de zona (solo Write en archivos de test) | Reportar al agente dueño del archivo |
| Tests que dependen de estado de DB real | Frágiles y lentos | Mockear Supabase client |
| Ignorar edge cases (null, empty, invalid) | Bugs silenciosos en producción | Cubrir explícitamente en cada suite |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
