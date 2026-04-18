# Agent Memory: IF-01 (infra-plumbing)
Last updated: 2026-03-25

## Rol
Agente de infraestructura backend de AXON: mantiene los cimientos (CRUD factory, DB layer, auth helpers, validation, rate limiting, rutas de contenido compartidas y búsqueda) que todos los demás agentes backend usan.

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
- `crud-factory.ts` genera CRUD endpoints con scoping automático por institución — usarlo en lugar de endpoints manuales.
- `ok()` / `err()` de `db.ts` para respuestas consistentes en todos los endpoints.
- `validateFields()` de `validate.ts` antes de cualquier operación de escritura.
- Rate limiting via sliding window 120 req/min/user — no reimplementar en rutas individuales.
- Antes de cambiar interfaces públicas de `crud-factory.ts`, `db.ts` o `auth-helpers.ts`, avisar al lead (alto impacto cross-agente).
- Cambios en `validate.ts` son low-risk y no requieren escalación.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar interfaces públicas de `crud-factory.ts` sin avisar | Rompe todos los agentes que lo importan | Avisar al lead antes de cambiar firmas públicas |
| Registrar rutas nuevas en `index.ts` sin avisar | Alto impacto en el servidor de entrada | Escalar al lead antes de tocar routes registration |
| Reimplementar validación fuera de `validate.ts` | Duplicación, riesgo de inconsistencias | Usar `validateFields()` / `isUuid()` / `isEmail()` del módulo existente |
| Tocar archivos fuera de la zona de ownership sin coordinación | Conflictos con otros agentes | Escalar al arquitecto (XX-01) |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |

---

## Sesión 2026-04-18 — Cobertura tests para lib core y services transversales

**Tarea:** Escribir tests Vitest para utilidades core y services transversales sin cobertura.

**Archivos creados (solo tests, sin modificar código productivo):**
- `src/app/lib/__tests__/concurrency.test.ts` (10 tests)
- `src/app/lib/__tests__/session-stats.test.ts` (20 tests)
- `src/app/lib/__tests__/content-tree-helpers.test.ts` (tests varios)
- `src/app/lib/__tests__/flashcard-utils.test.ts` (transformaciones)
- `src/app/lib/__tests__/sessionAnalytics.test.ts` (9 tests)
- `src/app/services/__tests__/platformApi.test.ts` (55 tests)
- `src/app/services/__tests__/searchApi.test.ts` (tests de URL/método/body)

**Total:** 150+ tests, todos verdes localmente.

**Lecciones:**
- Las utilidades puras (concurrency, session-stats, sessionAnalytics, flashcard-utils, content-tree-helpers) se testean mejor sin mocks. Tests deterministas.
- Services (searchApi, platformApi) usan `vi.mock('@/app/lib/api', () => ({ apiCall: vi.fn() }))`. Asserts de URL, método, body, query string.
- No tocar código productivo — solo archivos `__tests__/`.

**Métricas actualizadas:**
| Métrica | Valor |
|---------|-------|
| Sesiones ejecutadas | 1 |
| Tests nuevos | 150+ |
| Quality-gate PASS | 1 |
| Scope creep | 0 |
