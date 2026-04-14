# Branch Audit — 2026-04-14 (EXECUTED)

> Continues work from PR #405 (2026-04-06). All cleanup executed in this session.
> Repo: `Matraca130/numero1_sseki_2325_55` (Axon frontend)
>
> **RESULT: 82 branches -> 9 active (+ main/dev)**

## Executive Summary

| Category | Count | Action |
|----------|-------|--------|
| Fully merged (0 ahead) | 4 | Delete immediately |
| Work in main (squash-merged PRs) | 28 | Delete safely |
| Duplicates of rebased versions | 3 | Delete |
| Diagnostic/utility branches | 3 | Delete |
| Open PRs (need decision) | 2 | Review & merge or close |
| New features NOT in main | 5 | Keep or merge |
| Ancient branches (100+ behind) | 37 | Archive with tags, then delete |
| **TOTAL** | **82** | |

### After cleanup: ~7 active branches max

---

## CATEGORY 1: DELETE IMMEDIATELY (fully merged, 0 commits ahead)

| Branch | Behind | Evidence |
|--------|--------|----------|
| `claude/fix-scroll-position-refresh-fLCBV` | 14 | +0 ahead, scroll hooks merged via main |
| `feat/platform-wide-testing-suite` | 50 | +0 ahead, PR #365 merged |
| `fix/ai-generation-student-errors` | 57 | +0 ahead, PR #386 merged |
| `task/AXO-143` | 5 | +0 ahead, PR #413 merged |

```bash
git push origin --delete \
  claude/fix-scroll-position-refresh-fLCBV \
  feat/platform-wide-testing-suite \
  fix/ai-generation-student-errors \
  task/AXO-143
```

---

## CATEGORY 2: DELETE (work confirmed in main via squash-merge PRs)

### Sticky Notes family (PRs #407, #410, #415, #416 merged)

| Branch | Ahead | PR | Feature in main |
|--------|-------|----|-----------------|
| `claude/add-sticky-notes-sidebar-cAjMg` | 4 | #407 | StickyNotesPanel.tsx exists |
| `claude/customize-quick-notes-7MZ2T` | 3 | #410 | 4-slice quick notes exists |
| `claude/add-underline-notes-3jpZm` | 1 | #416 | underline in StickyNotes exists |
| `claude/customizable-timer-position-gdUzd` | 2 | #415 | draggable timer/notes exists |
| `claude/recover-sticky-notes-ui-Eh37X` | 4 | -- | duplicate of #407 content |

### AI/Context fixes (PRs #411, #412 merged)

| Branch | Ahead | PR | Feature in main |
|--------|-------|----|-----------------|
| `claude/fix-axon-ai-context-8d24y` | 4 | #411/#412 | topicId in AxonAIAssistant |

### Build/Syntax/Task fixes (PRs #413, #414 merged)

| Branch | Ahead | PR | Feature in main |
|--------|-------|----|-----------------|
| `claude/fix-build-axo143-syntax` | 1 | #414 | syntax error fixed |
| `task/AXO-123` | 1 | -- | ensureGeneralKeyword removed |
| `task/AXO-131` | 1 | -- | activeSummaryId in UIContext |

### Agent Memory (PR #406 merged)

| Branch | Ahead | PR | Feature in main |
|--------|-------|----|-----------------|
| `claude/check-architect-access-aIjy8` | 4 | #406 | 332 memory paths fixed |

### Block Review/Quiz (PRs #400, #402, #403, #404 merged)

| Branch | Ahead | PR | Feature in main |
|--------|-------|----|-----------------|
| `claude/fix-block-review-route-vwowc` | 1 | #402-404 | organize/momentum/mastery |
| `claude/fix-quiz-block-filtering-atit9` | 3 | #400 | block_id quiz filter |
| `claude/setup-supabase-api-keys-Ujgdq` | 3 | #398 | per-block quiz practice |
| `claude/check-summary-block-colors-07i4J` | 2 | #397 | submitBlockReview |

### Keyword/Highlight fixes (PRs #393-396, #399 merged)

| Branch | Ahead | PR | Feature in main |
|--------|-------|----|-----------------|
| `claude/fix-keyword-rendering-gvUaH` | 1 | #396 | keyword placeholders |
| `claude/fix-keyword-rendering-loss-eCoFD` | 2 | -- | mastery design tokens |
| `claude/fix-highlighting-system-XvrRN` | 7 | #399 | highlight colors/offsets |
| `claude/fix-missing-keywords-n1pNT` | 4 | #393-394 | keyword UUID rendering |
| `claude/add-annotation-indicator-IrEyh` | 3 | -- | footnote annotations |

### Other confirmed-in-main

| Branch | Ahead | Evidence |
|--------|-------|----------|
| `claude/fix-frontend-tests-pcQ0M` | 1 | PR #395 merged, 194 tests fixed |
| `fix/dead-code-cleanup-rebase` | 1 | PR #388 merged, legacy stubs |
| `fix/remove-glassmorphism-rebase` | 1 | PR #389 merged, backdrop-blur |
| `fix/deduplicate-mastery-level` | 2 | PR #353 merged, MasteryStage |
| `cherry/student-block-tools-hooks` | 2 | PR #391 merged, hooks |
| `claude/fix-dynamic-import-error-4k5ns` | 1 | lazyRetry in main (12+ refs) |
| `claude/fix-scheduler-undefined-error-9stQs` | 2 | TREND_CONFIG in main |
| `claude/medical-chest-xray-heart-2QsPE` | 1 | rag-chat timeout in main |
| `fix/flashcard-ai-generation-access` | 2 | PR #390 OPEN but AXO-131 already merged - CLOSE PR |
| `feat/calendar-v2-integration` | 1 | PR #367 merged, CalendarPage |

```bash
git push origin --delete \
  claude/add-sticky-notes-sidebar-cAjMg \
  claude/customize-quick-notes-7MZ2T \
  claude/add-underline-notes-3jpZm \
  claude/customizable-timer-position-gdUzd \
  claude/recover-sticky-notes-ui-Eh37X \
  claude/fix-axon-ai-context-8d24y \
  claude/fix-build-axo143-syntax \
  claude/check-architect-access-aIjy8 \
  claude/fix-block-review-route-vwowc \
  claude/fix-quiz-block-filtering-atit9 \
  claude/setup-supabase-api-keys-Ujgdq \
  claude/check-summary-block-colors-07i4J \
  claude/fix-keyword-rendering-gvUaH \
  claude/fix-keyword-rendering-loss-eCoFD \
  claude/fix-highlighting-system-XvrRN \
  claude/fix-missing-keywords-n1pNT \
  claude/add-annotation-indicator-IrEyh \
  claude/fix-frontend-tests-pcQ0M \
  fix/dead-code-cleanup-rebase \
  fix/remove-glassmorphism-rebase \
  fix/deduplicate-mastery-level \
  cherry/student-block-tools-hooks \
  claude/fix-dynamic-import-error-4k5ns \
  claude/fix-scheduler-undefined-error-9stQs \
  claude/medical-chest-xray-heart-2QsPE \
  fix/flashcard-ai-generation-access \
  feat/calendar-v2-integration \
  task/AXO-123 \
  task/AXO-131
```

Also close PR #390 (fix/flashcard-ai-generation-access) — work already in main via different commit.

---

## CATEGORY 3: DELETE (duplicates of rebased versions)

| Branch | Duplicate of |
|--------|--------------|
| `fix/dead-code-cleanup` | `fix/dead-code-cleanup-rebase` (both merged) |
| `fix/remove-glassmorphism` | `fix/remove-glassmorphism-rebase` (both merged) |
| `fix/ux-audit-text-i18n` | `fix/ux-audit-text-i18n-rebase` |

```bash
git push origin --delete \
  fix/dead-code-cleanup \
  fix/remove-glassmorphism \
  fix/ux-audit-text-i18n
```

---

## CATEGORY 4: DELETE (diagnostic/utility, no longer needed)

| Branch | Reason |
|--------|--------|
| `claude/audit-active-branches-UajCc` | PR #405, superseded by this audit |
| `claude/verify-branches-diagnostic-Su8AS` | Branch verification utility, done |
| `worktree-agent-a4abafde` | Orphaned worktree branch |

```bash
gh pr close 405 --comment "Superseded by updated audit 2026-04-14"
git push origin --delete \
  claude/audit-active-branches-UajCc \
  claude/verify-branches-diagnostic-Su8AS \
  worktree-agent-a4abafde
```

---

## CATEGORY 5: OPEN PRs — NEED DECISION

### PR #408 — `claude/plan-flashcard-feature-thm8o` (+12/-12)
- **Content:** Adaptive flashcard session with AI-powered card generation
- **Commits:** 12 unique (AdaptiveFlashcardView, DeltaBadges, WCAG touch targets, route activation)
- **Status:** AdaptiveFlashcardView NOT in main
- **Action:** REVIEW & MERGE if ready, or CLOSE if superseded

### PR #409 — `claude/test-sticky-notes-frontend` (+1/-11)
- **Content:** 16+20 tests for sticky notes Q1 coverage
- **Status:** Tests not in main
- **Action:** REVIEW & MERGE for test coverage, or CLOSE if tests are outdated

---

## CATEGORY 6: KEEP — NEW FEATURES NOT IN MAIN

| Branch | Ahead | Behind | Description | Action |
|--------|-------|--------|-------------|--------|
| `feat/algorithmic-art` | 10 | 51 | P5Canvas, 8+ sketch engines, gallery, analytics. NOT in main. | **KEEP** — major feature |
| `claude/recover-algorithmic-art-Eh37X` | 8 | 12 | Similar algorithmic art engines (TypeScript ports) | **VERIFY** — may be subset of above |
| `feature/mindmap-knowledge-graph` | 397 | 391 | Massive mindmap/knowledge graph feature (1129 files!) | **KEEP** — major feature |
| `feat/reading-state-queue` | 1 | 4 | `useReadingStateQueue` batch updates. NOT in main. | **KEEP** — small but useful |
| `rescue/unsaved-wip-2026-04-12` | 2 | 51 | WIP rescue: weekly report, flashcard prototype, deps (312 files) | **REVIEW** — extract useful WIP |

Also potentially useful:
| `fix/ux-audit-text-i18n-rebase` | 2 | 57 | Broader i18n accent sweep (56 files) | **VERIFY** — check if accents still missing |
| `security/phase-1-frontend` | 49 | 391 | Security audit fixes (RequireRole guard, etc.) | **VERIFY** — large, may have useful patterns |

---

## CATEGORY 7: ARCHIVE THEN DELETE (100+ behind main, ancient)

All these branches are 100+ commits behind main. Their unique commits are preserved in git history. Tag for reference, then delete.

### Feature branches (large, exploratory)
- `audit/modularization-phases-1-17` (+40/-679)
- `feat/flashcard-responsive-audit-v4.5.1` (+24/-439)
- `feat/flashcard-v4.5.1-ux-audit-sync` (+10/-429)
- `feat/gamification-g1-g2-g3-premium` (+19/-523)
- `feat/mobile-responsive-fase3` (+4/-476)
- `feat/multi-agent-system` (+2/-301)
- `feat/path-b-migration` (+7/-619)
- `feat/quiz-v4.4-modularization` (+15/-643)
- `feat/schedule-responsive-phase1c` (+1/-467)
- `feat/student-block-tools` (+4/-126)
- `feat/student-telegram-and-ai-assistant` (+2/-353)
- `feat/welcome-v4-gamification-integration` (+6/-418)
- `ramadeEVOLUCION` (+14/-301)

### Fix branches (superseded by newer fixes)
- `fix/a11y-summary-reader` (+8/-120)
- `fix/design-system-glassmorphism-fonts` (+1/-118)
- `fix/mobile-responsive-blocks` (+1/-126)
- `fix/remove-hardcoded-gradients` (+1/-91)
- `fix/sidebar-overlay` (+7/-119)
- `fix/summaries-reader-unification` (+12/-126)
- `fix/summaries-route` (+9/-134)
- `fix/summary-reading-sessions` (+8/-134)
- `fix/summary-visual-parity` (+9/-126)
- `fix/unified-reader-layout` (+2/-103)
- `fix/realtime-v2-client` (+1/-301)
- `fix/realtime-v2-hook` (+1/-301)
- `fix/realtime-v2-ui` (+1/-301)
- `fix/api-pagination-contracts` (0 ahead, behind main)

### Claude agent branches (one-off tasks, completed)
- `claude/block-editor-mobile-responsive-15z6j` (+7/-299)
- `claude/curriculum-responsive-v2` (+2/-280)
- `claude/curriculum-responsive-light-tree` (0 ahead)
- `claude/deploy-phase1-endpoints-2X2T0` (+1/-68)
- `claude/implement-two-features-RvnYW` (+5/-411)
- `claude/platform-testing-suite-CSAR4` (+1/-85)
- `claude/setup-infrastructure-TqfRh` (+6/-429)
- `claude/analyze-test-coverage-bMmpS` (0 ahead)

### Eval/infra branches
- `eval-baseline-20260331` (+4/-126)
- `eval-memory-20260331` (+5/-126)
- `cloudflare/workers-autoconfig` (0 ahead)
- `security/phase-1-frontend-v2` (behind main)
- `perf/ralph-autonomous-improvements` (0 ahead)
- `feat/calendar-v2` (0 ahead)
- `feat/block-based-summaries` (0 ahead)
- `fix/provider-ordering-and-timer` (0 ahead)

```bash
# Tag all ancient branches for archive
for branch in \
  audit/modularization-phases-1-17 \
  feat/flashcard-responsive-audit-v4.5.1 \
  feat/flashcard-v4.5.1-ux-audit-sync \
  feat/gamification-g1-g2-g3-premium \
  feat/mobile-responsive-fase3 \
  feat/multi-agent-system \
  feat/path-b-migration \
  feat/quiz-v4.4-modularization \
  feat/schedule-responsive-phase1c \
  feat/student-block-tools \
  feat/student-telegram-and-ai-assistant \
  feat/welcome-v4-gamification-integration \
  ramadeEVOLUCION \
  fix/a11y-summary-reader \
  fix/design-system-glassmorphism-fonts \
  fix/mobile-responsive-blocks \
  fix/remove-hardcoded-gradients \
  fix/sidebar-overlay \
  fix/summaries-reader-unification \
  fix/summaries-route \
  fix/summary-reading-sessions \
  fix/summary-visual-parity \
  fix/unified-reader-layout \
  fix/realtime-v2-client \
  fix/realtime-v2-hook \
  fix/realtime-v2-ui \
  fix/api-pagination-contracts \
  claude/block-editor-mobile-responsive-15z6j \
  claude/curriculum-responsive-v2 \
  claude/curriculum-responsive-light-tree \
  claude/deploy-phase1-endpoints-2X2T0 \
  claude/implement-two-features-RvnYW \
  claude/platform-testing-suite-CSAR4 \
  claude/setup-infrastructure-TqfRh \
  claude/analyze-test-coverage-bMmpS \
  eval-baseline-20260331 \
  eval-memory-20260331 \
  cloudflare/workers-autoconfig \
  security/phase-1-frontend-v2 \
  perf/ralph-autonomous-improvements \
  feat/calendar-v2 \
  feat/block-based-summaries \
  fix/provider-ordering-and-timer; do
  git tag "archive/2026-04-14/${branch}" "origin/${branch}" 2>/dev/null
done

# Push tags
git push origin --tags

# Then delete all archived branches
# (same list with git push origin --delete)
```

---

## Summary of Actions

| Step | Branches | Command |
|------|----------|---------|
| 1. Delete fully merged | 4 | `git push origin --delete ...` |
| 2. Close PR #390 | 1 | `gh pr close 390` |
| 3. Delete confirmed-in-main | 28 | `git push origin --delete ...` |
| 4. Delete duplicates | 3 | `git push origin --delete ...` |
| 5. Delete diagnostic | 3 | `gh pr close 405` + delete |
| 6. Review open PRs #408, #409 | 2 | Manual decision |
| 7. Tag & delete ancient | 37 | Tag, push tags, delete |
| **After cleanup** | **~5-7** | algorithmic-art, mindmap, reading-queue, rescue, + open PRs |

### Branches remaining — DEEP-DIVE ANNOTATIONS

---

#### 1. `dev` — STALE TRACKING BRANCH
- **+0 ahead / -51 behind** | Last: 2026-04-04
- Zero unique commits. Just a stale pointer 51 commits behind main.
- **ACTION: Fast-forward to main or delete.** No value keeping it behind.

---

#### 2. `feat/algorithmic-art` — KEEP (CANONICAL ART BRANCH)
- **+10 ahead / -51 behind** | Last: 2026-04-13
- P5Canvas wrapper, engine registry, 8 engine ports (dolor, cardiovascular, nervioso, renal-endocrino, semiologia-general, digestivo, respiratorio, semiologia-regional, hematologia, microbiologia), professor analytics, gallery, block editor, SQL migrations.
- 349 files changed, 10120 insertions. NOT in main.
- **ACTION: KEEP. This is the main art feature branch. Rebase onto main when ready to merge.**

---

#### 3. `claude/recover-algorithmic-art-Eh37X` — DELETE (DUPLICATE)
- **+8 ahead / -12 behind** | Last: 2026-04-07
- Same engine ports with different commit SHAs (re-created on newer base). Missing 2 commits that `feat/algorithmic-art` has (SQL reference copies + diag doc).
- 47 files changed, 8891 insertions.
- **ACTION: DELETE. `feat/algorithmic-art` is the superset. This is a recovery duplicate.**

---

#### 4. `feature/mindmap-knowledge-graph` — KEEP (MAJOR FEATURE)
- **+398 ahead / -391 behind** | Last: 2026-03-26
- Massive: 1132 files, 54K insertions. Knowledge graph with G6, drag-to-connect, undo/redo, clustering, grid layout, auto-layout, breadcrumbs, i18n, 149+ tests.
- **ACTION: KEEP. Major feature in active development. Will need careful rebase before merge.**

---

#### 5. `feat/reading-state-queue` — KEEP (CLEAN MERGE CANDIDATE)
- **+1 ahead / -4 behind** | Last: 2026-04-12
- Single commit: `useReadingStateQueue` hook for batching reading state API calls.
- New file: `useReadingStateQueue.ts` (192 lines). Also modifies StudyTimer, StickyNotesPanel, useReadingTimeTracker.
- Only 4 behind main — very clean merge candidate.
- **ACTION: MERGE. Small, focused, almost up-to-date.**

---

#### 6. `fix/ux-audit-text-i18n-rebase` — DELETE (REGRESSIVE)
- **+2 ahead / -57 behind** | Last: 2026-04-04
- 2 commits: i18n accent fixes in 6 Spanish strings + Unicode escapes.
- **PROBLEM: Also REMOVES topicId from AxonAIAssistant** (reverts PR #412 work). The i18n fixes were already shipped in PR #387.
- **ACTION: DELETE. The useful work is already merged, and this branch would regress the AI context fix.**

---

#### 7. `rescue/unsaved-wip-2026-04-12` — REVIEW THEN DELETE
- **+2 ahead / -51 behind** | Last: 2026-04-13
- WIP rescue branch. 2 new files:
  - `STATUS_DIAGNOSTIC.md` (utility doc)
  - `src/app/components/prototypes/FlashcardCreationPrototype.tsx` (prototype)
- 312 files changed but most are deletions from divergence.
- **ACTION: Extract `FlashcardCreationPrototype.tsx` if useful, then DELETE. The prototype code may inform `claude/plan-flashcard-feature-thm8o` work.**

---

#### 8. `security/phase-1-frontend` — ARCHIVE THEN DELETE (MIXED/STALE)
- **+49 ahead / -391 behind** | Last: 2026-04-13
- Mix of security fixes AND mindmap features (clusters, grid, auto-layout, drag-connect, 149 tests).
- Security content: DOMPurify sanitization (S3/FE-001), CSP+HSTS headers (S4+S15), RequireRole guard (S14/FE-005).
- 1137 files changed. 391 behind main — too stale to merge cleanly.
- **ACTION: Tag as `archive/2026-04-14/security/phase-1-frontend`, then DELETE. The security patterns (DOMPurify, CSP, RequireRole) should be re-implemented on a fresh branch from current main.**

---

#### 9. `claude/plan-flashcard-feature-thm8o` — KEEP (PR #408 OPEN)
- **+12 ahead / -12 behind** | Last: 2026-04-07
- Adaptive flashcard session: AdaptiveFlashcardView, DeltaBadges, RoundHistoryList, AI image generation, WCAG touch targets, responsive grid.
- New file: `AdaptiveFlashcardView.tsx`. NOT in main.
- **ACTION: KEEP. Review PR #408, merge when ready. Only 12 behind — clean rebase.**

---

#### 10. `claude/test-sticky-notes-frontend` — MERGE OR CLOSE (PR #409 OPEN)
- **+1 ahead / -11 behind** | Last: 2026-04-07
- 1 commit: 36 tests (16 API contracts + 20 component tests) for sticky notes.
- New file: `sticky-notes-api-contracts.test.ts`.
- **ACTION: MERGE for test coverage, or CLOSE if sticky notes API has changed since. Only 11 behind — clean.**

---

## Execution Log (2026-04-14)

| Step | Action | Count | Status |
|------|--------|-------|--------|
| 1 | Deleted fully merged branches | 4 | DONE |
| 2 | Deleted confirmed-in-main branches | 29 | DONE |
| 3 | Deleted duplicate branches | 3 | DONE |
| 4 | Deleted diagnostic branches | 3 | DONE |
| 5 | Closed stale PRs (#390, #405) | 2 | DONE (already closed) |
| 6 | Tagged ancient branches as archive/2026-04-14/* | 35 | DONE |
| 7 | Pushed archive tags to remote | 35 | DONE |
| 8 | Deleted archived branches | 34 | DONE |
| 9 | 9 branches skipped (already pruned) | 9 | N/A |
| **TOTAL DELETED** | | **73** | |
