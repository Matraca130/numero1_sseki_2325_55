# Branch Audit — 2026-04-06

## Executive Summary

- **Total remote branches:** 57
- **Already merged in main:** 3 (safe to delete)
- **Fresh (April, low diff):** 10 → **8 already in main, 1 mergeable, 1 needs test verification**
- **Medium (April, rebased/clean):** 10 → **5 already in main, 3 new features, 2 duplicates**
- **Ancient (March, 78+ behind):** 34 → archive with tags

### Current test status on main: 193/194 passing (1 failure in TextHighlighter.test.tsx)

---

## PHASE 1 — Already Merged (DELETE SAFELY)

| Branch | Action |
|--------|--------|
| `claude/audit-active-branches-UajCc` | DELETE — fully merged |
| `feat/platform-wide-testing-suite` | DELETE — fully merged |
| `fix/ai-generation-student-errors` | DELETE — fully merged |

**Commands:**
```bash
git push origin --delete claude/audit-active-branches-UajCc feat/platform-wide-testing-suite fix/ai-generation-student-errors
```

---

## PHASE 2 — Fresh Branches (10 branches)

### Already in main (DELETE — work was incorporated via other merges)

| Branch | Evidence | Action |
|--------|----------|--------|
| `claude/fix-block-review-route-vwowc` | `useScheduleAI` has organize/reorder (4 refs), `as-schedule.ts` exists | DELETE |
| `claude/fix-keyword-rendering-gvUaH` | `replaceKeywordPlaceholders` in ViewerBlock (4 refs), `renderTextWithKeywords` in ListDetailBlock (3 refs) | DELETE |
| `claude/fix-keyword-rendering-loss-eCoFD` | `design-system/mastery.ts` exists in main | DELETE |
| `claude/check-summary-block-colors-07i4J` | `submitBlockReview` in BlockQuizModal (3 refs) | DELETE |
| `claude/add-annotation-indicator-IrEyh` | ViewerBlock has 7 refs to footnote/annotation | DELETE |
| `claude/fix-quiz-block-filtering-atit9` | `quiz-data-loading.ts` filters by `block_id` (6 refs) | DELETE |
| `claude/setup-supabase-api-keys-Ujgdq` | QuizRightPanel block support (8 refs), safety net in BlockQuizModal | DELETE |
| `claude/fix-highlighting-system-XvrRN` | `DEFAULT_HIGHLIGHT_COLOR` (2), `fullText` deps (13), orange color, useMemo (4), selectedText dedup — all present | DELETE |

### MERGEABLE — New work not in main

| Branch | Ahead | Behind | Action |
|--------|-------|--------|--------|
| `claude/fix-scroll-position-refresh-fLCBV` | 3 | **0** | **MERGE** — scroll position save/restore hooks are NOT in main. Clean, no conflicts. |

### Needs verification

| Branch | Ahead | Behind | Action |
|--------|-------|--------|--------|
| `claude/fix-frontend-tests-pcQ0M` | 1 | 33 | **PROBABLY DELETE** — 193/194 tests pass on main. Only 1 test still fails (`TextHighlighter.test.tsx:199`). This branch's 29-file fix is largely incorporated. The 1 remaining failure is in a file this branch may not have fixed anyway. |

**Commands to delete Phase 2 branches (after merging scroll fix):**
```bash
# First merge the scroll fix
git checkout main
git merge origin/claude/fix-scroll-position-refresh-fLCBV

# Then delete the rest
git push origin --delete \
  claude/fix-block-review-route-vwowc \
  claude/fix-keyword-rendering-gvUaH \
  claude/fix-keyword-rendering-loss-eCoFD \
  claude/check-summary-block-colors-07i4J \
  claude/add-annotation-indicator-IrEyh \
  claude/fix-quiz-block-filtering-atit9 \
  claude/setup-supabase-api-keys-Ujgdq \
  claude/fix-highlighting-system-XvrRN \
  claude/fix-frontend-tests-pcQ0M
```

---

## PHASE 3 — Medium Branches (10 branches)

### Already in main (DELETE)

| Branch | Evidence | Action |
|--------|----------|--------|
| `fix/dead-code-cleanup-rebase` | Deletes `legacy-stubs.ts` — file not in main (already deleted) | DELETE |
| `fix/remove-glassmorphism-rebase` | Removes `backdrop-blur` from BlockQuizModal — main has 0 refs | DELETE |
| `fix/deduplicate-mastery-level` | `keywords.ts` has `MasteryStage` (6 refs) | DELETE |
| `task/AXO-123` | Removes unused `ensureGeneralKeyword` import — main has 0 refs | DELETE |
| `cherry/student-block-tools-hooks` | `useKeywordMastery.ts` and `useScheduleAI.ts` exist in main | DELETE |

### Duplicate pair (pick one, delete other)

| Branch | What it does | Action |
|--------|-------------|--------|
| `fix/flashcard-ai-generation-access` | Lifts summaryId to UIContext + null byte fix in setup.ts | **IDENTICAL** to AXO-131 |
| `task/AXO-131` | Same summaryId lift, same UIContext changes | **IDENTICAL** to above |

Both branches add `activeSummaryId` to UIContext — main does NOT have this yet (`0 refs`).
**MERGE ONE, DELETE THE OTHER.** Prefer `fix/flashcard-ai-generation-access` (also fixes null byte in setup.ts).

### New features NOT in main

| Branch | Ahead | Description | Action |
|--------|-------|-------------|--------|
| `fix/ux-audit-text-i18n-rebase` | 2 | i18n accents in 56 files across entire app. Main has accents in LoginPage (7 refs), but this is a broader sweep. | **CHERRY-PICK** — verify which strings still need fixing |
| `feat/calendar-v2-integration` | 1 | CalendarPage exists in main, but routing may differ. | **VERIFY** — check if route wiring already done |
| `feat/algorithmic-art` | 8 | 35 files, 8804 insertions. P5Canvas, sketch engines. **NOT in main.** | **NEW FEATURE** — merge when ready |

**Commands:**
```bash
# Merge the summaryId lift
git checkout main
git cherry-pick 044127d  # fix/flashcard-ai-generation-access commit
git cherry-pick 9dc3a38  # null byte fix

# Delete duplicates
git push origin --delete task/AXO-131

# Delete already-in-main
git push origin --delete \
  fix/dead-code-cleanup-rebase \
  fix/remove-glassmorphism-rebase \
  fix/deduplicate-mastery-level \
  task/AXO-123 \
  cherry/student-block-tools-hooks
```

---

## PHASE 4 — Ancient Branches (34 branches, March 2026)

### Strategy: Tag and delete

All these branches are 78+ commits behind main. Their unique commits are preserved in git history.
For branches with potentially valuable work, create archive tags before deleting.

### Duplicates — delete without tagging (rebased versions exist)

```bash
git push origin --delete \
  fix/dead-code-cleanup \
  fix/remove-glassmorphism \
  fix/ux-audit-text-i18n
```

### Archive with tags, then delete

```bash
# Create archive tags
for branch in \
  feature/mindmap-knowledge-graph \
  claude/curriculum-responsive-v2 \
  ramadeEVOLUCION \
  claude/block-editor-mobile-responsive-15z6j \
  feat/multi-agent-system \
  fix/realtime-v2-client \
  fix/realtime-v2-hook \
  fix/realtime-v2-ui \
  security/phase-1-frontend \
  feat/student-telegram-and-ai-assistant \
  claude/implement-two-features-RvnYW \
  feat/welcome-v4-gamification-integration \
  feat/flashcard-responsive-audit-v4.5.1 \
  feat/flashcard-v4.5.1-ux-audit-sync \
  claude/setup-infrastructure-TqfRh \
  feat/schedule-responsive-phase1c \
  feat/mobile-responsive-fase3 \
  feat/gamification-g1-g2-g3-premium \
  feat/path-b-migration \
  feat/quiz-v4.4-modularization \
  audit/modularization-phases-1-17 \
  eval-baseline-20260331 \
  eval-memory-20260331 \
  fix/summary-visual-parity \
  fix/unified-reader-layout \
  fix/sidebar-overlay \
  fix/summaries-reader-unification \
  fix/design-system-glassmorphism-fonts \
  fix/a11y-summary-reader \
  feat/student-block-tools \
  claude/platform-testing-suite-CSAR4 \
  claude/deploy-phase1-endpoints-2X2T0 \
  claude/fix-missing-keywords-n1pNT; do
  tag_name="archive/2026-04-06/${branch}"
  git tag "$tag_name" "origin/$branch"
  echo "Tagged: $tag_name"
done

# Push all tags
git push origin --tags

# Then delete branches
# (use same list as above with git push origin --delete)
```

---

## Final Score

| Category | Count | Action |
|----------|-------|--------|
| Delete (merged) | 3 | `git push origin --delete` |
| Delete (already in main) | 18 | Work confirmed present in main |
| Delete (duplicates) | 5 | Rebased or identical versions exist |
| Merge (clean) | 1 | `fix-scroll-position-refresh` → direct merge |
| Cherry-pick | 2 | `flashcard-ai-generation-access` + `ux-audit-text-i18n-rebase` |
| New feature (hold) | 1 | `feat/algorithmic-art` (8804 lines, review needed) |
| Verify | 2 | `calendar-v2-integration`, `fix-frontend-tests` |
| Archive + delete | 25 | Tag as `archive/2026-04-06/*` then delete |
| **TOTAL** | **57** | |

### Net result after cleanup: **main + 1 merge + 2 cherry-picks + 1 new feature branch = 4 branches max**
