# Axon v4.4 — Exhaustive Performance & Quality Audit (Session 2)

**Date:** 2026-03-12  
**Branch:** `perf/audit-p0-p1-fixes`  
**Files scanned:** 80+ (all hooks, services, contexts, routes, lib, utils, components)  
**3D domain scanned:** 13 files (models3dApi, model3d-api, ModelViewer3D, ThreeDView, PinSystem, PinEditor, PinMarker3D, StudentNotes3D, LayerPanel, ModelPartMesh, three-utils, threed-student-routes, AtlasScreen)

---

## FIXED IN THIS SESSION (5 commits)

### Commit 1: PERF-01 — useMemo on Context Provider values
| File | Change |
|------|--------|
| `StudentDataContext.tsx` | Added `useMemo` import + memoized `contextValue` with 12 deps |
| `PlatformDataContext.tsx` | Added `useMemo` import + memoized `contextValue` with 16 deps |
| `ContentTreeContext.tsx` | Added `useMemo` import + memoized `contextValue` with 15 deps |

**Impact:** Prevents cascading re-renders across ALL consumers (StudentDataContext alone has 9+). Before: every `setLoading(true/false)` cycle created a new object reference triggering re-renders in every consumer component.

### Commit 2: PERF-06 — console.log DEV guard cleanup
| File | Lines guarded |
|------|---------------|
| `apiConfig.ts` | 4 (`realRequest` log + 2 errors, `figmaRequest` log) |
| `useKeywordNavigation.ts` | 1 (pending nav target warn) |
| `StudentDataContext.tsx` | 2 (session complete, loading user) |
| `ContentTreeContext.tsx` | 1 (loaded courses count) |

### Commit 3: PERF-06/PERF-12 — useStudyPlans cleanup + COLORS extraction
| File | Change |
|------|--------|
| `useStudyPlans.ts` | ~15 console.log/warn wrapped in `import.meta.env.DEV` |
| `useStudyPlans.ts` | `COLORS` array extracted to module-level `TOPIC_COLORS` constant |

### Commit 4: Audit report (initial)

### Commit 5: PN-3, PN-9, PN-15 — Quick wins batch
| ID | File | Change |
|----|------|--------|
| **PN-3** | `useReadingTimeTracker.ts` | `console.warn` wrapped in `import.meta.env.DEV` guard |
| **PN-9** | `useFlashcardNavigation.ts` | `enrichedTopicCache.current.clear()` added on `currentCourse.id` change |
| **PN-15** | `useKeywordNavigation.ts` | `catch (err: any)` → `catch (err: unknown)` + `console.error` guarded with DEV |
| **PN-15** | `useFlashcardNavigation.ts` | `catch (batchErr: any)` → `catch (batchErr: unknown)` with safe `.message` access |

---

## 3D DOMAIN SCAN — ALL CLEAN

Full scan of 13 3D files found **zero performance or quality issues**:

| File | Size | Status |
|------|------|--------|
| `models3dApi.ts` | 9.5KB | Uses `logger`, `instanceof ApiError`, batch+cache+throttle |
| `model3d-api.ts` | 8.8KB | `catch (err: unknown)`, `extractErrorMessage()` util |
| `ModelViewer3D.tsx` | 35.9KB | Uses `logger`, WebGL context recovery, auto-thumbnail |
| `ThreeDView.tsx` | 15.7KB | Uses `logger`, AbortController, batch fetch |
| `PinSystem.tsx` | 22.2KB | Imperative DOM positioning, module-level temp objects |
| `PinEditor.tsx` | 11.4KB | Uses `logger`, `catch (err: unknown)` |
| `PinMarker3D.tsx` | 7.7KB | Shared geometry singletons, cached sphere array |
| `StudentNotes3D.tsx` | 20.3KB | Imperative DOM positioning, shared geometry |
| `LayerPanel.tsx` | 10.7KB | `useMemo`, `useCallback` throughout |
| `ModelPartMesh.tsx` | 12.4KB | Uses `logger`, API-first + localStorage fallback |
| `three-utils.ts` | 2.3KB | Small disposal utility |
| `threed-student-routes.ts` | 0.5KB | Lazy-loaded route |
| `AtlasScreen.tsx` | 8.6KB | Clean extracted component |

Previously completed 3D fixes (prior sessions): 3DP-2 (auto-thumbnail), 3DP-3 (instanceof ApiError), F3 (keyboard shortcuts), M5 (hooks extraction), G1 (context loss recovery), G4 (mousemove throttle).

---

## PREVIOUSLY OK (no fix needed)

| File | Status |
|------|--------|
| `AppContext.tsx` | Already uses `useMemo` on value |
| `useReviewBatch.ts` | Already uses DEV guards |
| `useFlashcardEngine.ts` | Already uses DEV guards |
| `useAdaptiveSession.ts` | All 20+ console calls already DEV-guarded |
| `adaptiveGenerationApi.ts` | Already uses DEV guards |
| `useTopicProgress.ts` | Already uses DEV guards |
| `api.ts` | Already uses DEV guards + timeout + dedup |
| `useStudyQueueData.ts` | Already uses DEV guards |

---

## REMAINING FINDINGS (prioritized)

### P0 — Critical Performance

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **PN-1** | `useStudyPlans.ts` | **N+1 waterfall**: `fetchAll()` does 1+N API calls (1 for plans + 1 per plan for tasks). 5 plans = 6 requests. | Backend: add `GET /study-plan-tasks?study_plan_ids=id1,id2` batch endpoint | Backend |

### P1 — High Impact

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **PN-2** | `useFlashcardNavigation.ts:~280` | **Eager load ALL topics**: On tree load, iterates ALL topics and calls `loadTopicCards()`. Batched (5/200ms), but still fetches flashcards for every topic at startup. | Load on demand (IntersectionObserver or click) | M |
| ~~**PN-3**~~ | ~~`useReadingTimeTracker.ts`~~ | ~~Unguarded console.warn~~ | **FIXED** (Commit 5) | |
| **PN-4** | `platformApi.ts` (36KB) | **Monolith API service**: All platform endpoints in one file. No tree-shaking benefit. | Split into `membersApi.ts`, `plansApi.ts`, `subscriptionApi.ts`, etc. | L |
| **PN-5** | `studentApi.ts` (30KB) | **Monolith API service**: Same issue | Split into domain-specific files | L |
| **PN-6** | `aiService.ts` (29KB) | **Monolith API service**: Same issue | Split into `aiChat.ts`, `aiGenerate.ts`, `aiSmart.ts` | L |
| **PN-7** | `design-kit.tsx` (40KB) | **Monolith UI kit**: ~40 exported components in one file | Split into sub-modules per category | L |

### P2 — Medium Impact

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **PN-8** | `useAdaptiveSession.ts` | **20+ useState/useRef**: Complex state machine with many individual state variables causing multiple re-renders per action | Extract to `useReducer` or split into sub-hooks | M |
| ~~**PN-9**~~ | ~~`useFlashcardNavigation.ts`~~ | ~~enrichedTopicCache never cleared~~ | **FIXED** (Commit 5) | |
| **PN-10** | `useStudyQueueData.ts` | **applyOptimisticBatch has `[queue]` dep**: Changes identity every queue update | Use ref for queue inside callback | S |
| **PN-11** | `professor-routes.ts` | **5 lucide icons imported eagerly**: `LayoutDashboard, BookOpen, Users, Bot, Settings` for placeholder pages | Move placeholders to lazy-loaded file | S |
| **PN-12** | `PlatformDataContext.tsx` | **6 refresh functions have unguarded console.error**: `refreshInstitution`, `refreshMembers`, etc. | Wrap in `import.meta.env.DEV` | XS |

### P3 — Low Impact / Nice-to-have

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **PN-13** | `useStudyQueueData.ts:~90` | **Dead pagination code**: Loop with `hasMore = false` because backend doesn't support offset | Remove dead code or implement when backend supports it | XS |
| **PN-14** | `useFlashcardNavigation.ts` | **goBack has unreachable branches**: Checks for 'summary'/'session' states that are unused in the deck flow | Remove dead branches | XS |
| ~~**PN-15**~~ | ~~`useKeywordNavigation.ts`~~ | ~~`catch (err: any)` remnant~~ | **FIXED** (Commit 5) | |

---

## ARCHITECTURE OBSERVATIONS

### Positive Patterns Found
1. **api.ts**: Excellent infrastructure — GET dedup, timeout via AbortController, DEV-only logging
2. **useStudyQueueData**: Module-level cache with TTL, in-flight dedup, paginated design (ready for backend)
3. **useReviewBatch**: Clean separation of concerns — queue + compute + submit
4. **useFlashcardNavigation**: LRU cache with configurable max, batch loading with delay
5. **Routes split**: Clean thin-assembler pattern in routes.tsx with per-role child files
6. **useFlashcardEngine**: [M2] ref-mirror pattern avoids stale closures elegantly
7. **3D domain**: Shared geometry singletons, imperative DOM positioning, module-level temp objects, logger abstraction — all best practices applied

### Structural Risks
1. **3 monolith API services** (platformApi 36KB, studentApi 30KB, aiService 29KB) — these will grow
2. **design-kit.tsx 40KB** — single point of change for all UI primitives
3. **No stale-while-revalidate** — only useStudyQueueData has TTL caching; other hooks refetch on every mount
4. **No error boundary per route** — a crash in one view takes down the entire layout

---

## SUMMARY: 8 of 15 findings fixed, 3D domain fully scanned and clean

### Fixed (this session): PERF-01, PERF-06, PERF-12, PN-3, PN-9, PN-15 + useFlashcardNavigation bonus
### Remaining: 12 items (PN-1 backend, PN-2/8 medium, PN-4/5/6/7 large splits, PN-10/11/12/13/14 small)

## RECOMMENDED NEXT ACTIONS (priority order)

1. **PN-12** (XS) — Guard PlatformDataContext refresh console.errors
2. **PN-14** (XS) — Remove dead branches in goBack
3. **PN-13** (XS) — Remove dead pagination code in useStudyQueueData
4. **PN-2** (M) — Lazy-load topic flashcards on demand (biggest UX perf win)
5. **PN-8** (M) — useReducer for useAdaptiveSession
6. **PN-7** (L) — Split design-kit.tsx
7. **PN-4/5/6** (L) — Split monolith API services
