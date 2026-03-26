# Agent Memory: FC-01 (flashcards-frontend)
Last updated: 2026-03-26

## Rol
Agente frontend de la sección Flashcards de AXON: implementa y modifica componentes React del módulo Flashcards (Student + Professor).

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-26 | motion/react mock: use Proxy pattern from StudyHubHero.test.tsx, strip `initial/animate/transition/whileHover/whileTap/exit/layout` props. AnimatePresence renders children directly. | Copy from existing tests, don't reinvent |
| 2026-03-26 | SessionScreen returns null + calls onBack when cards empty. Test both: container.innerHTML === '' AND onBack called. | Guard clause pattern: useEffect + early return null |
| 2026-03-26 | Keyboard events on SessionScreen: use fireEvent.keyDown(window, ...) not on a specific element, because the component attaches listener to window | Check component source for addEventListener target |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- Usar `apiCall()` de `lib/api.ts` para todas las llamadas HTTP (nunca fetch directo)
- TanStack Query para server state; hooks en `src/app/hooks/useFlashcard*.ts` y `useReview*.ts`
- Commits atómicos: 1 commit por cambio lógico
- Leer `agent-memory/flashcards.md` al inicio de sesión para contexto de sección
- Verificar existencia de `src/app/components/content/flashcard/` antes de operar
- Escalar al Arquitecto (XX-01) ante conflictos cross-section o decisiones fuera de zona
- For flashcard component tests: mock motion/react with Proxy pattern, clsx as passthrough, lucide-react as spans with data-testid
- SessionScreen props are all passed in (no hooks inside), making it easy to test with controlled props
- RATINGS from flashcard-types is pure data -- mock with inline array to avoid import chain issues

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| `console.log` | Ruido en producción | Usar `logger` de `lib/logger.ts` |
| `any` en TypeScript | Rompe strict mode | Tipar correctamente siempre |
| `fetch` directo | Bypass de manejo de errores centralizado | `apiCall()` de `lib/api.ts` |
| Glassmorphism / gradientes en botones | Fuera del design system AXON | Pill-shaped buttons, teal #14b8a6, rounded-2xl cards |
| Modificar lógica en archivos de otra zona sin escalar | Viola aislamiento de agentes | Escalar al lead via SendMessage |
| Reimplementar lógica FSRS en frontend | FSRS vive en `lib/fsrs-v4.ts` (backend) | Consumir via API |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 1 | 2026-03-26 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
