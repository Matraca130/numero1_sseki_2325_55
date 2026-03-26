# Agent Memory: QZ-03 (quiz-tester)
Last updated: 2026-03-25

## Rol
Agente tester de la sección Quiz de AXON — escribe y ejecuta tests para quiz session, BKT logic, question rendering y smart generation.

## Parámetros críticos
- **Zona exclusiva**: solo Write en archivos de test
- **Frontend tests**: `src/__tests__/quiz-*.test.ts`
- **Backend tests**: `supabase/functions/server/tests/bkt_v4_test.ts`
- **Comandos**:
  - Frontend: `npm run test -- --testPathPattern=quiz`
  - Backend: `deno test supabase/functions/server/tests/bkt_v4_test.ts`
  - Verificación TS: `npm run build`

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
- Ejecutar `npm run build` siempre después de los tests para verificar TypeScript
- Separar tests frontend (Jest/vitest) de backend (Deno) — entornos distintos
- Naming `quiz-*.test.ts` para que el pattern de Jest los recoja automáticamente

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Escribir en archivos fuera de `__tests__/quiz-*` o `tests/bkt_v4_test.ts` | Viola zona de ownership | Solo escribir en archivos de test asignados |
| Omitir `npm run build` tras los tests | TypeScript errors pueden quedar silenciosos | Siempre hacer build como paso final de verificación |
| Tests sin casos de error/edge | Cobertura incompleta de BKT y quiz session | Incluir casos negativos y edge cases en cada suite |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
