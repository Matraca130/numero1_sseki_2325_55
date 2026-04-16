# Agent Memory: IF-02 (infra-ui)
Last updated: 2026-04-14

## Rol
Agente de infraestructura UI de AXON: mantiene componentes shared, design-kit, contextos globales, tipos, lib/utils y servicios API cross-cutting que consumen multiples secciones.

## Lecciones aprendidas
| Fecha | Leccion | Prevencion |
|-------|---------|------------|
| 2026-04-14 | `AxonAIAssistant` se importa via NAMED export desde `StudentLayout.tsx` (`m.AxonAIAssistant`), no via default. Wrappear solo el `default` con `memo()` NO memoiza al consumer real. | Siempre verificar con Grep los imports reales antes de memoizar un componente. Pattern correcto: `function FooInner() {...}; export const Foo = memo(FooInner); export default Foo;` |
| 2026-04-14 | La audit puede tener deps incorrectos en memos. El audit decia `cardTypeDistribution: useMemo([flashcards, grades])` pero `grades` no se usa dentro del memo, y ya estaba memoizado correctamente con `[flashcards]`. | NO copiar deps arrays de un audit ciegamente. Leer el cuerpo del memo y derivar los deps REALES de las variables referenciadas. |
| 2026-04-14 | `dayNames = [...]` dentro del componente es un array recreado cada render. Si se referencia desde un `useMemo`, pierde estabilidad. | Extraer constantes estaticas a nivel modulo con `const NOMBRE_CONST = [...]` antes de `export function Component()`. |
| 2026-04-14 | Los worktrees no copian `node_modules`. `npm run build` falla si no se corre `npm install` primero, y ese install modifica `package-lock.json`. | Correr `npm install` al crear un worktree y hacer `git checkout -- package-lock.json` antes del commit para no ensuciar la branch. |
| 2026-04-14 | En RoleShell, `sidebarProps` como objeto literal + handlers sin `useCallback` = memoizar el objeto es inutil porque los handlers cambian cada render. | Memoizar PRIMERO los handlers (`useCallback`), DESPUES el objeto (`useMemo`) que los contiene. Deps: incluir todos los handlers memoizados. |

## Efectividad de lecciones
| Leccion | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| Verificar named vs default import con Grep antes de memoizar | 1 | SI (habria memoizado solo el default, dejando el consumer real sin memo) | ALTA |
| Leer cuerpo del memo, no copiar deps del audit | 1 | SI (habria añadido `grades` como dep falsa) | ALTA |
| Cascading memoization (handlers → objeto) | 1 | SI (habria memoizado sidebarProps sin efecto) | ALTA |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrio), NUEVA (sin datos)

## Decisiones tecnicas (NO re-litigar)
| Fecha | Decision | Por que | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-04-14 | Renombrar `function AxonAIAssistant` a `AxonAIAssistantComponent` y exportar `const AxonAIAssistant = memo(...)` | El consumer real importa el named export (`m.AxonAIAssistant`). Wrappear solo `default` no memoiza. | Crear un nuevo named export `AxonAIAssistantMemoized` y actualizar StudentLayout.tsx (fuera de scope). |
| 2026-04-14 | NO memoizar `cardTypeDistribution` en `FlashcardReviewer` (la audit lo pedia) | YA estaba memoizado correctamente con `[flashcards]`. El audit estaba desactualizado. | Añadir `grades` como dep falsa — rompe correctness porque `grades` no se referencia. |
| 2026-04-14 | NO wrappear `renderChatPanel`/`renderFlashcardsPanel`/etc en `useCallback` en AxonAIAssistant | Son function declarations internas llamadas directamente en JSX, no props pasados a children React components. El win real es `memo()` a nivel componente. | Añadir useCallback innecesarios — ruido sin beneficio medible. |
| 2026-04-14 | Guardar solo `console.log` en BlockQuizModal, NO `console.warn`/`console.error` | Warnings y errors son telemetria util en produccion; logs informativos son ruido que debe eliminarse. | Guardar todos — perderia visibilidad de fallos en prod. |
| 2026-04-14 | Combinar `masteryData` + `totalCards` en un solo `useMemo` con destructuring de retorno | Comparten deps identicos `[bktStates, isConnected]`; un solo memo es mas eficiente que dos. | Dos memos separados — mas boilerplate, misma performance. |

## Patrones que funcionan
- Extraer constantes estaticas (arrays/objetos inmutables) a nivel modulo antes del componente — reference-stable cross renders.
- Pattern memo con named export: `function FooInner(...)` + `export const Foo = memo(FooInner)` + `export default Foo`. Funciona tanto para `import Foo from '...'` como `import { Foo } from '...'`.
- `useMemo` con destructuring del resultado combinado cuando varias derivaciones comparten deps.
- `useCallback` para handlers que se incluyen en un objeto `useMemo`ado (sino el memo del objeto es inutil porque los handlers cambian cada render).
- Pre-memoizar `topicKeywordIds` antes del memo consumidor para que sus deps usen la Set memoizada en lugar de `flashcards` raw.
- DEV guard pattern single-line: `if (import.meta.env.DEV) console.log(...)` — matches AuthContext.tsx style en el repo.
- Antes de wrappear un componente en `memo()`, hacer `grep -rn "NombreComponente" src --include="*.tsx"` para descubrir como lo importan (named vs default).
- Worktrees: `git checkout -- package-lock.json` antes del commit cuando `npm install` lo modifico.

## Patrones a evitar
| Pattern | Por que | Alternativa |
|---------|---------|-------------|
| Wrappear solo `export default` con `memo()` cuando consumers usan named import | El memo no se aplica al consumer real | Reexportar ambos desde una sola const memoizada |
| Copiar deps de un audit sin verificar el cuerpo del memo | Deps incorrectos → re-runs falsos o stale closures | Leer el codigo y derivar deps de variables referenciadas |
| `const foo = (...)(); // IIFE por cada render` para derivar data | Reconstruye en cada render sin memoizacion | Usar `useMemo` directo |
| Commitear `package-lock.json` modificado por `npm install` en un worktree | Contamina la PR con cambios irrelevantes | `git checkout -- package-lock.json` antes del commit |
| Guardar TODOS los `console.*` con DEV guard | Pierde visibilidad de errores en produccion | Solo guardar `.log` (ruido); dejar `.warn` y `.error` sin guard |
| Memoizar un objeto sin memoizar los handlers que contiene | El memo del objeto nunca re-usa su cache | Memoizar handlers con `useCallback` primero |
| Tocar archivos fuera de la zona de ownership sin coordinacion | Conflictos con otros agentes | Escalar al arquitecto (XX-01) |

## Metricas
| Metrica | Valor | Ultima sesion |
|---------|-------|---------------|
| Sesiones ejecutadas | 1 | 2026-04-14 (refactor/perf-quick-wins) |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Archivos tocados (sesion actual) | 5 | DashboardView.tsx, AxonAIAssistant.tsx, FlashcardView.tsx, RoleShell.tsx, BlockQuizModal.tsx |

## Zona de ownership (referencia rapida)
- `src/app/components/shared/`, `design-kit/`, `figma/`, `ai/AxonAIAssistant.tsx`, `video/`
- `src/app/context/` (excepto `AuthContext` que es del Lead)
- `src/app/types/`, `lib/`, `utils/`
- `src/app/services/platform-api/`, `ai-service/`, `student-api/` y `*Api.ts` cross-cutting
- Hooks cross-cutting en `src/app/hooks/`
- Catch-all en `components/student/` (archivos sin keyword de seccion)

## NO tocar
- `src/app/components/ui/` (shadcn — Lead)
- `src/app/design-system/` (Lead)
- `src/app/context/AuthContext.tsx` (Lead)
