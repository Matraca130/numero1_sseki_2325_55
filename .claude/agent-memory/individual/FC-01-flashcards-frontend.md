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

## [2026-04-14] Session: Complete Fase 5 adaptive flashcard flow (host + route)
- **Task**: Create `AdaptiveFlashcardView.tsx`, register `/student/adaptive-session` route, mirror the P0 grade-mapping fix in `useAdaptiveSession.ts`, add a smoke test, and open PR #425 on `feat/adaptive-flashcards-fase5`.
- **Learned**:
  - `useAdaptiveSession` returns a full ready-to-render API (`phase`, `currentCard`, `sessionCards`, `generationProgress`, etc.), so the host is basically a phase-to-screen router + URL param parsing + professor-card loader. The hook owns ALL state.
  - `smRatingToFsrsGrade` (SM-2 rating 1-5 → FSRS grade 1-4) must be applied EVERYWHERE before `useReviewBatch.queueReview`. Any rating>=4 would otherwise reach the backend as 4 or 5 and get silently clamped. The `fix/flashcards-session-p0` branch fixed it in `useFlashcardEngine` but `useAdaptiveSession` was a second offender.
  - `FlashcardItem` (flashcardApi) and `Flashcard` (types/content) are close but not identical: `front_image_url`/`back_image_url` vs `frontImageUrl`/`backImageUrl`. A local `mapItemToCard` in the host duplicates the module-private `mapApiCard` in `useFlashcardNavigation.ts`.
- **Pattern**: For adaptive-style phase-driven views, keep the host dumb: read URL params → fetch initial data → pass into hook → switch on `phase` under an `<AnimatePresence mode="wait">`. Delegate back navigation via `useNavigate` with a constant back route.
- **Mistake**: Expected the broader adaptive test suite to pass out-of-the-box after the grade-mapping fix — it didn't, because the existing `useAdaptiveSession.test.ts` asserted the PRE-fix `grade: 4`. Learning: when mirroring a fix from another branch, grep the tests of the modified file and align expectations in the SAME commit.
- **Zone edge case**: `useAdaptiveSession.ts` does NOT match my glob (`useFlashcard*.ts`) nor contain "flashcard" in its filename. The task explicitly told me to fix it there. Flagged in the PR body for architect review.
- **Files touched**:
  - `src/app/hooks/useAdaptiveSession.ts` (P0 fix)
  - `src/app/components/content/AdaptiveFlashcardView.tsx` (new)
  - `src/app/routes/flashcard-student-routes.ts` (new route)
  - `src/app/hooks/__tests__/useAdaptiveSession.test.ts` (align to P0 fix)
  - `src/__tests__/e2e-adaptive-flashcard-session.test.tsx` (new, 6 cases)
- **PR**: https://github.com/Matraca130/numero1_sseki_2325_55/pull/425
- **Tests**: 6/6 new + 190/190 flashcard-adaptive suite
- **Build**: Local `vite build` blocked by pre-existing env issue (workerd darwin-arm64 vs windows-64 in node_modules); CI will validate.
