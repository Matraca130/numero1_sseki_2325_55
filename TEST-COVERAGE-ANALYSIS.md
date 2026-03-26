# Test Coverage Analysis — Axon Platform

**Date**: 2026-03-26
**Test runner**: Vitest 3.2.1 + React Testing Library + jsdom
**Current results**: 42 test files, 601 tests (584 passing, 17 failing)

---

## Current State

| Area | Source Files | Test Files | Tests | Coverage |
|------|-------------|------------|-------|----------|
| Student blocks | 11 | 11 | ~200 | Good |
| Quiz logic/helpers | 8+ | 6 | ~120 | Moderate |
| Dashboard/Charts | 4 | 4 | ~50 | Moderate |
| Professor block-editor | 10+ | 1 | ~80 | Low |
| Gamification | 5+ | 2 | ~30 | Low |
| **Services (API layer)** | **57** | **1** | ~10 | **Critical gap** |
| **Custom hooks** | **69** | **0** | 0 | **Critical gap** |
| **Auth system** | **6** | **0** | 0 | **Critical gap** |
| **Context providers** | **11** | **0** | 0 | **Critical gap** |
| **Lib/utilities** | **28** | **2** | ~15 | **Critical gap** |
| **Flashcard system** | **25** | **0** | 0 | **Critical gap** |
| **AI components** | **3** | **0** | 0 | **Critical gap** |
| **3D viewer** | **19** | **0** | 0 | **Critical gap** |
| **Routes** | **11** | **2** | ~20 | Low |
| **Summary components** | **2+** | **0** | 0 | Gap |
| **TOTAL** | **~648** | **42** | 601 | **~6.5%** |

---

## Failing Tests (17)

All 17 failures are in `professor/block-editor/forms/__tests__/forms.test.tsx` — likely caused by form label/placeholder text changes that weren't updated in tests. This should be a quick fix.

---

## Priority Recommendations

### P0 — Critical (security + core business logic)

#### 1. Auth System (0 tests, 6 files)
**Why**: Authentication is the security boundary. Bugs here expose the entire platform.
**Files to test**:
- `RequireAuth.tsx` — redirects unauthenticated users
- `RequireRole.tsx` — enforces role-based access
- `PostLoginRouter.tsx` — routes users by role after login
- `AuthContext.tsx` / `contexts/AuthContext.tsx` — session management, token handling

**Suggested tests**:
- Unauthenticated user is redirected to login
- Role mismatch redirects to correct layout
- Token refresh/expiry handling
- `X-Access-Token` header is set correctly (never in Authorization)
- Institution selection flow

#### 2. API Service Layer (1 test file out of 57)
**Why**: Every user action flows through these services. Incorrect API calls silently corrupt data.
**Files to test (highest priority)**:
- `src/app/lib/api.ts` — the central `apiCall()` wrapper (header construction, error parsing)
- `src/app/services/quizApi.ts` — quiz CRUD, session management
- `src/app/services/flashcardApi.ts` — flashcard CRUD, review submission
- `src/app/services/studentApi.ts` — student data fetching
- `src/app/services/summariesApi.ts` — summary CRUD
- `src/app/services/authApi.ts` — login, token refresh

**Suggested tests**:
- `apiCall()` sets `Authorization: Bearer <ANON_KEY>` and `X-Access-Token: <jwt>` correctly
- Error responses (`{ error: "..." }`) are properly thrown/returned
- Each API function constructs the correct URL, method, and body
- Network error handling

#### 3. FSRS Engine (`src/app/lib/fsrs-engine.ts`)
**Why**: Core spaced repetition algorithm — if it miscalculates, students study the wrong cards at the wrong time.
**Suggested tests**:
- New card scheduling
- Correct/incorrect review interval calculation
- Edge cases (first review, long gaps, overdue cards)

### P1 — High Priority (core features with complex logic)

#### 4. Custom Hooks (0 tests, 69 files)
**Why**: Hooks contain most of the app's business logic. Many are complex state machines.
**Highest-priority hooks to test**:
- `useFlashcardEngine.ts` — flashcard session state machine
- `useQuizBkt.ts` — Bayesian Knowledge Tracing computation
- `useCourseMastery.ts` — mastery score calculation
- `useStudyPlans.ts` — study plan scheduling logic
- `useSmartGeneration.ts` — AI content generation orchestration
- `useSchedulingIntelligence.ts` — study scheduling algorithms

**Suggested approach**: Test hooks with `renderHook()` from `@testing-library/react`, mocking API calls.

#### 5. Flashcard System (0 tests, 25 files)
**Why**: Core learning feature with complex state (session flow, adaptive difficulty, FSRS integration).
**Files to test**:
- `SessionScreen.tsx` — main review session flow
- `DeckScreen.tsx` — deck management
- `AdaptiveFlashcard.tsx` — adaptive difficulty rendering
- `FlashcardKeywordPopup.tsx` — keyword connections

#### 6. Context Providers (0 tests, 11 files)
**Why**: These provide data to the entire app. A broken context breaks all downstream components.
**Files to test**:
- `StudentDataContext.tsx` — student data loading, caching
- `PlatformDataContext.tsx` — owner/admin/professor data
- `GamificationContext.tsx` — XP, streaks, badges
- `ContentTreeContext.tsx` — curriculum tree navigation

### P2 — Medium Priority (important but lower blast radius)

#### 7. Lib/Utilities (2 test files out of 28)
**Files to test**:
- `api-helpers.ts` — request/response helpers
- `flashcard-utils.ts` — flashcard data transformations
- `quiz-utils.ts` — quiz scoring, grading
- `grade-mapper.ts` — grade calculation
- `mastery-helpers.ts` — mastery score computations
- `date-helpers.ts` — date formatting (locale-sensitive)

#### 8. Route Definitions (2 test files out of 11)
**Why**: Broken routes = users can't access features.
**Suggested tests**:
- All route paths resolve to valid components
- Lazy loading works for all routes
- Role guards are applied to correct routes
- No duplicate paths across role files

#### 9. AI Components (0 tests, 3 files)
**Files to test**:
- `AxonAIAssistant.tsx` — RAG chat interface
- `SmartFlashcardGenerator.tsx` — AI flashcard generation
- `VoiceCallPanel.tsx` — voice interaction

#### 10. 3D Viewer (0 tests, 19 files)
**Why**: Complex WebGL code that's hard to debug in production.
**Suggested tests** (unit-testable logic):
- Annotation pin positioning math
- Layer visibility toggle logic
- Model part selection logic
- Camera position calculations

### P3 — Lower Priority (UI rendering, less logic)

- Summary components (ChunkRenderer, SummaryHeader)
- Design system token validation
- Static page rendering (landing pages, error pages)

---

## Recommended Testing Strategy

### Phase 1: Fix existing failures + add test infrastructure (1-2 days)
1. Fix the 17 failing `forms.test.tsx` tests (label/placeholder mismatches)
2. Add API mocking utilities (e.g., `msw` or a lightweight `apiCall` mock)
3. Add a `renderWithProviders()` test utility that wraps components in required contexts

### Phase 2: Cover critical paths (1-2 weeks)
1. Auth system tests (P0)
2. `apiCall()` and top 5 API services (P0)
3. FSRS engine (P0)
4. Top 6 hooks (P1)
5. Context providers (P1)

### Phase 3: Feature coverage (2-4 weeks)
1. Flashcard session flow (P1)
2. Remaining API services (P1)
3. Utility functions (P2)
4. Route integrity (P2)
5. AI components (P2)

### Phase 4: Edge cases + integration (ongoing)
1. 3D viewer logic (P3)
2. Cross-context integration tests
3. Error boundary behavior
4. Accessibility testing

---

## Quick Wins (high value, low effort)

| Test | Effort | Value | Why |
|------|--------|-------|-----|
| `apiCall()` header tests | 1h | Very High | Catches auth header bugs that break all API calls |
| FSRS scheduling tests | 2h | Very High | Pure functions, easy to test, critical algorithm |
| `mastery-helpers.ts` | 1h | High | Pure computation, affects dashboard accuracy |
| `grade-mapper.ts` | 30m | Medium | Small file, prevents grading errors |
| Route integrity (all roles) | 2h | High | Catches broken navigation after refactors |
| Fix 17 failing tests | 30m | Medium | Gets suite to green, establishes CI trust |

---

## Suggested Tooling Additions

1. **`msw` (Mock Service Worker)** — mock API calls at the network level for service tests
2. **Coverage reporting** — add `--coverage` flag to vitest config to track progress
3. **CI gate** — run `npm test` in CI and block merges on test failure
4. **`@testing-library/user-event`** — already available, prefer over `fireEvent` for realistic interactions
