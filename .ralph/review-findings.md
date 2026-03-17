# Ralph QA Review - MINDMAP Worktree (feature/mindmap-knowledge-graph)

**Reviewed:** 2026-03-17
**Commits reviewed:** 7d4935d..658f6af (last 8 commits)

---

## CRITICAL

### C1 - API Endpoints Do Not Exist in Backend
- **File:** `src/app/services/mindmapAiApi.ts` (all functions)
- **Description:** The three AI endpoints (`/ai/analyze-knowledge-graph`, `/ai/suggest-student-connections`, `/ai/student-weak-points`) do not exist in the backend (`axon-backend/supabase/functions/server/routes/ai/`). The frontend falls back to mock data in DEV mode, but in production these calls will fail with 404 errors.
- **Impact:** AI Tutor Panel will be completely broken in production.
- **Fix:** Either (a) create the backend endpoints, or (b) add explicit feature-flag gating so these features are not shown to users until the backend is ready, or (c) keep the mock fallback in all environments with a visible "Preview" badge.
- **Status:** NOT FIXED (requires backend work or product decision)

---

## HIGH

### H1 - Excessive Hardcoded Colors (CLAUDE.md Rule #4 Violation)
- **Files:** `AiTutorPanel.tsx`, `ShareMapModal.tsx`, `PresentationMode.tsx`, `GraphToolbar.tsx`
- **CLAUDE.md Rule:** "SIEMPRE usar colores de `palette.ts` — nunca hardcodear hex colors"
- **Description:** At least 30+ instances of hardcoded hex colors (`#2a8c7a`, `#e8f5f1`, `#244e47`, `#1B3B36`, `#F0F2F5`) instead of using the design system's `colors.primary.*` or Tailwind tokens from `palette.ts`. Only `headingStyle` is imported from the design system.
- **Impact:** Violates project rules. Theme changes, dark mode, or brand updates won't propagate to these components.
- **Fix:** Replace hardcoded values with design system tokens. Example: `#2a8c7a` should be `colors.primary[500]`, `#e8f5f1` should be `colors.primary[50]`.

### H2 - ScriptProcessorNode is Deprecated (in related useRealtimeVoice)
- **File:** Referenced in perf worktree, but the mindmap branch doesn't touch this.
- **Status:** N/A for this branch

---

## MEDIUM

### M1 - `as any` in Test Files
- **File:** `src/app/components/content/mindmap/__tests__/graphHelpers.test.ts` (6 instances), `__tests__/useUndoRedo.test.ts` (2 instances)
- **Description:** Tests use `as any` to bypass type checking on test data. This weakens type safety in tests and can mask API contract drift.
- **Fix:** Create proper typed test fixtures or use `Partial<T>` with type assertions.

### M2 - Multiple eslint-disable Comments for react-hooks/exhaustive-deps
- **File:** `KnowledgeGraph.tsx` lines 552, 601
- **Description:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` with explanatory comments. The explanations are valid (avoiding double-render), but this pattern is fragile — any future change to deps could introduce stale closures.
- **Fix:** Consider extracting the data transformation into a `useRef`-based pattern or using `useSyncExternalStore` to avoid the need for suppression.

### M3 - Empty Catch Blocks in KnowledgeGraph
- **File:** `KnowledgeGraph.tsx` lines 524-526, 546, 574, 596, 653, 726, 800, 846
- **Description:** Many empty catch blocks with `/* graph may be destroyed */` comments. While the reasoning is valid (G6 throws when the graph instance is destroyed during React unmount), this silences ALL errors, not just "graph destroyed" errors.
- **Fix:** Add specific error type checking: `catch (e) { if (!(e instanceof Error && e.message.includes('destroyed'))) console.warn(e); }`

### M4 - mindmapAiApi Mock Data Leaks Into Dev Console
- **File:** `src/app/services/mindmapAiApi.ts` lines 73, 102, 122
- **Description:** `console.info()` calls log mock usage in dev. Not harmful but noisy.
- **Fix:** Use the project's `logger` utility instead of raw `console.info`.

---

## LOW

### L1 - Unused Import Potential in AiTutorPanel
- **File:** `AiTutorPanel.tsx`
- **Description:** The `ArrowDown` icon from lucide-react is imported but only used in the pull-to-refresh indicator. If pull-to-refresh is disabled on desktop, the import is dead weight (though tree-shaking should handle it).

### L2 - Magic Numbers in Pull-to-Refresh
- **File:** `AiTutorPanel.tsx` lines 90, 128, 141-145
- **Description:** `PULL_THRESHOLD = 60`, timeout `600`, fade delay `2500` are magic numbers. Not wrong, but named constants or config would improve maintainability.

### L3 - shareUrl Computed on Every Render
- **File:** `ShareMapModal.tsx` line 38
- **Description:** `shareUrl` is computed every render using `window.location.origin`. Should be `useMemo`'d since it depends only on `topicId`.
- **Fix:** Wrap in `useMemo(() => ..., [topicId])`.
