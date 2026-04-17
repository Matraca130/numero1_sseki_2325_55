# Refactoring Review Report — 2026-04-16

Automated scan by refactor-scout agent. **17 findings** across the codebase.

> **Note on finding IDs:** This report uses its own numbering scheme (C1, H1, M1, etc.) which is independent from existing codebase audit references (e.g., `H6-2`, `M4-FIX`, `PERF-S2`, `3DP-3` found in `error-utils.ts` and `models3dApi.ts`). When implementing fixes, cross-reference both systems to maintain a clear audit trail.

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH     | 7 |
| MEDIUM   | 4 |
| LOW      | 3 |

---

## CRITICAL

### C1 — Imports from non-existent module `@/app/data/courses`

Two files import types from `@/app/data/courses`, but that module was deleted. This causes TypeScript/build errors or only works accidentally due to `skipLibCheck`.

- `src/app/context/NavigationContext.tsx:2` — `import type { Course, Topic } from '@/app/data/courses'`
- `src/app/hooks/useTreeCourses.ts:11` — `import type { Course } from '@/app/data/courses'`

**Action:** Change imports to `@/app/types/content` (which defines `Course` and `Topic` with the same nested shape).

### C2 — Duplicate types: Course, Semester, Section, Topic defined 2x

Content hierarchy types are defined in two locations with different interfaces:

- `src/app/types/platform.ts:170-207` — Flat DB types (Course, Semester, Section, Topic)
- `src/app/types/content.ts:45-72` — Nested UI types (Course, Semester, Section, Topic)

Both have the same names but different properties (e.g., `content.ts` Course has `semesters: Semester[]` nested, `platform.ts` Course is flat with `institution_id`).

**Action:** Rename nested types in `content.ts` to `UICourse`, `UISemester`, etc., or use a dedicated namespace. Document which to use in each context.

### C3 — Duplicate `ApiError` class in two files

Two distinct and incompatible `ApiError` classes:

- `src/app/lib/error-utils.ts:21` — Constructor: `(message, status, path)`, used by quiz domain
- `src/app/services/apiConfig.ts:33` — Constructor: `(message, code, status)`, used by `models3dApi.ts`

An `instanceof ApiError` check can fail if the wrong class was imported.

**Action:** Remove the one in `apiConfig.ts` and migrate `models3dApi.ts` to use `error-utils.ts`. Or unify both into a single canonical definition. Note that `apiCall` in `lib/api.ts` must also be updated to throw this canonical `ApiError` (it currently throws generic `Error` on lines 149, 166, etc.), otherwise `instanceof ApiError` checks will fail after migration.

---

## HIGH

### H1 — `apiConfig.ts` duplicates `lib/api.ts` logic (175 lines of redundant code)

`src/app/services/apiConfig.ts` (175 lines) reimplements GET deduplication, header building, and request logic that already exists in `src/app/lib/api.ts`. Only consumed by `models3dApi.ts` (via `realRequest`); `figmaRequest` has no active production consumers.

**Action:** Migrate `models3dApi.ts` to use `apiCall` from `lib/api.ts` and delete `apiConfig.ts`.

### H2 — `buildTopicMap` duplicated between two files

Identical function defined in:

- `src/app/utils/studyPlanMapper.ts:37`
- `src/app/hooks/study-plans/helpers.ts:14`

Only `helpers.ts` is imported by real code (`useStudyPlans.ts`). `studyPlanMapper.ts` is only imported by its own test file — effectively dead code.

**Action:** Delete `studyPlanMapper.ts` and its test. Use `helpers.ts` as the canonical source.

### H3 — Two error extraction utilities: `getErrorMsg` vs `getErrorMessage`

- `src/app/lib/error-utils.ts:38` — `getErrorMsg(err: unknown): string` (used by 13 files in quiz domain)
- `src/app/utils/getErrorMessage.ts:12` — `getErrorMessage(err: unknown): string` (used by 3 files)
- `src/app/hooks/useAdaptiveQuiz.ts:44` — THIRD local version `getErrorMessage()` inline

**Action:** Consolidate into one utility. `error-utils.ts` is more complete (handles `ApiError`). Migrate consumers of `getErrorMessage`.

### H4 — 725 uses of `any` in 176 files (~430 in prod, ~295 in tests)

Top offenders in production:

| File | Count |
|------|-------|
| `hooks/useFlashcardNavigation.ts` | 20 |
| `context/ContentTreeContext.tsx` | 8 |
| `content/useFlashcardsManager.ts` | 7 |
| `quiz-selection/quiz-data-loading.ts` | 9 |
| `quiz-selection/QuizSelection.tsx` | 6 |
| `services/studentSummariesApi.ts` | 6 |
| `services/summariesApi.ts` | 6 |
| `video/MuxVideoPlayer.tsx` | 6 |
| `context/AuthContext.tsx` | 5 |

Most common pattern: `apiCall<any>(...)` (40+ instances) and `catch (err: any)` (40+ blocks).

**Action:** Prioritize typing API responses with dedicated interfaces. Change the default generic in `apiCall` to `<T = unknown>` (currently `<T = any>` in `src/app/lib/api.ts`) to enforce explicit typing at call sites and prevent new untyped calls. Replace `catch (err: any)` with `catch (err: unknown)` + `getErrorMsg()`.

### H5 — 30 instances of `onError: (err: any)` in query hooks

All hooks under `src/app/hooks/queries/` use the unsafe pattern `onError: (err: any) => toast.error(err.message || '...')`.

Affected: `useKeywordConnectionsQueries.ts`, `useVideosManagerQueries.ts`, `useKeywordsManagerQueries.ts`, `useKeywordPopupQueries.ts`, `useProfessorNotesQueries.ts`, `useSummaryReaderMutations.ts`, `useTopicDetailQueries.ts`, `useSubtopicMutations.ts`, `useSummaryViewQueries.ts`, `useAnnotationMutations.ts`, `useBlockNotes.ts`.

**Action:** Use `onError: (err: unknown) => toast.error(getErrorMsg(err))` uniformly.

### H6 — Dead files (orphan files)

| File | Lines | Reason |
|------|-------|--------|
| `src/app/components/DiagnosticsPage.tsx` | 415 | Exports `DiagnosticsPage` but nobody imports it or references it in routes |
| `src/app/routes/professor-placeholders.tsx` | ~55 | 5 exported functions, none imported (real professors already exist) |
| `src/app/components/content/StudentPlaceholder.tsx` | 89 | Exports component, never imported |
| `src/app/utils/studyPlanMapper.ts` | ~85 | Only imported by its own test (logic duplicated in helpers.ts) |

**Action:** Delete these files and their associated tests.

### H7 — Dead stub functions in `types/keywords.ts`

4 exported functions that always return `null` or `[]`:

- `findKeyword()` — line 62
- `getAllKeywordTerms()` — line 66
- `getKeywordsNeedingCards()` — line 78
- `getKeywordStats()` — line 86

None are imported by any file. They are legacy stubs from the old `data/keywords.ts`.

**Action:** Delete the 4 functions from `src/app/types/keywords.ts`. Keep the interfaces and types that are actually used.

---

## MEDIUM

### M1 — `content.ts` contains hardcoded mock data

`src/app/types/content.ts:78-105` exports a `courses` array with mock data for "Anatomia Humana". Nobody imports it. Also exports `getLessonsForTopic()` that returns `[]` — also not imported.

**Action:** Delete `courses` const and `getLessonsForTopic` stub from `content.ts`. Keep only the interfaces.

### M2 — 41 `console.log` in production (28 unguarded)

Worst offenders without `import.meta.env.DEV` guard:

| File | Unguarded count |
|------|----------------|
| `src/app/components/student/BlockQuizModal.tsx` | 5 |
| `src/app/hooks/useAdaptiveSession.ts` | 1 (line 354) |

**Action:** Wrap all `console.log` in `if (import.meta.env.DEV)` or replace with `logger.debug()`.

### M3 — Files >500 lines (split candidates)

| File | Lines | Suggestion |
|------|-------|------------|
| `components/content/GamificationView.tsx` | 566 | Extract sub-components (badges, XP history, level display) |
| `roles/pages/owner/OwnerDashboardPage.tsx` | 554 | Extract chart sections, stats cards |
| `hooks/useFlashcardNavigation.ts` | 540 | Extract cardCache and enrichment logic to pure helpers |
| `components/content/ReviewSessionView.tsx` | 536 | Extract quiz result section and session summary |
| `professor/block-editor/BlockEditor.tsx` | 494 | Near threshold — monitor |
| `professor/FlashcardFormModal.tsx` | 486 | Near threshold — extract form sections |
| `content/useFlashcardsManager.ts` | 486 | Near threshold — extract data fetching logic |

### M4 — Deprecated `masteryConfig` in `keywords.ts`

`src/app/types/keywords.ts:46` — `masteryConfig` is marked `@deprecated` with instruction to use `getDeltaColorClasses` from `mastery-helpers.ts` instead.

**Action:** Verify if any file still imports `masteryConfig` and migrate to `mastery-helpers.ts`.

---

## LOW

### L1 — `src/app/contexts/` referenced in CLAUDE.md but no longer exists

CLAUDE.md documents `src/app/contexts/AuthContext.tsx` as "Canonical auth context", but the `contexts/` directory no longer exists. All contexts live in `src/app/context/` (no s).

**Action:** Update CLAUDE.md to remove the reference to `src/app/contexts/`.

### L2 — `legacy-stubs.ts` deleted but still referenced in documentation

Agent memory and `cross-cutting.md` mention `legacy-stubs.ts` as "marked for deletion" but the file was already successfully deleted. The technical debt was already resolved.

**Action:** Update `cross-cutting.md` and agent memory to reflect that `legacy-stubs.ts` was deleted.

### L3 — Inconsistent pattern: barrel re-exports vs direct modules

Several components have a 6-7 line barrel re-export file in the root that simply re-exports from a subdirectory. This is a consistent and acceptable pattern, but adds indirection. Not a critical issue.

**Action:** Informational only — no change needed. The barrel pattern is consistent across the codebase and serves as a stable import path.

---

## Trend vs Previous Scan (2026-03-25)

| Metric | Previous | Current | Trend |
|--------|----------|---------|-------|
| `legacy-stubs.ts` | Existed (128L) | DELETED | Resolved |
| Duplicate types (Course etc.) | 3x | 2x | Improved |
| AxonAIAssistant.tsx | 1106L | 6L (refactored to barrel) | Resolved |
| useFlashcardNavigation.ts | 567L | 540L | Slight improvement |
| Total `any` types | Not measured | 725 (176 files) | Baseline |
| Total console.log | Not measured | 41 (14 files) | Baseline |
| Files >500L | 2 known | 4 confirmed | Baseline updated |
| Unused exports | Not measured | 9+ dead functions | Baseline |

## Top 3 Highest Impact Actions

1. **Fix imports from `@/app/data/courses`** (C1) — potential build break
2. **Consolidate `ApiError` into a single class** (C3) — prevents instanceof bugs
3. **Delete 4 dead files** (H6) — removes ~570 lines of dead code
