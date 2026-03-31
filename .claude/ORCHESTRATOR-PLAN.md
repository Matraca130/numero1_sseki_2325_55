# Orchestrator Plan — Persistent Task Queue

> This file is the brain of the scheduled orchestrator.
> Each cycle reads this, picks the next PENDING task, executes it, marks DONE.

## Config
- max_parallel_agents: 5
- quality_gate_after_each: true
- repo: C:\dev\axon\frontend
- branch_rule: feature branch per task group, NEVER main

## Current Sprint: Post-Merge Polish + Token Migration

### Phase 1: Design Token Migration (no backend needed)
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 1.1 | Add Tailwind aliases for 5 CSS vars in tailwind.config (axon-dark, axon-accent, axon-mint, axon-teal-100, axon-page-bg) | **DONE** | feat/design-token-migration | IF-07 | PR #196 merged |
| 1.2 | Replace 48 hex literals in student/blocks/*.tsx with token aliases | **DONE** | feat/design-token-migration | SM-01 | PR #196 merged |
| 1.3 | Replace `#3cc9a8` phantom color — add to colors.ts or use nearest token | **DONE** | feat/design-token-migration | IF-07 | PR #196 merged |
| 1.4 | Quality gate on token migration | **DONE** | feat/design-token-migration | XX-02 | Build + 1080 tests pass |

### Phase 2: Professor Editor Color Decision
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 2.1 | Clarify CLAUDE.md: professor accent = violet is ALLOWED (add explicit note) | **DONE** | feat/design-token-migration | docs-writer | PR #196 merged |
| 2.2 | Replace `inputClass` focus ring violet→teal in all 10 forms | **DONE** | feat/design-token-migration | SM-01 | PR #196 merged |

### Phase 3: Missing Tests
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 3.1 | Write KeywordChip.test.tsx | **DONE** | feat/block-editor-tests | SM-03 | PR #197 merged |
| 3.2 | Write ViewerBlock.integration.test.tsx | **DONE** | feat/block-editor-tests | SM-03 | PR #197 merged |
| 3.3 | Write renderTextWithKeywords.test.tsx | **DONE** | feat/block-editor-tests | SM-03 | PR #197 merged |
| 3.4 | Quality gate on tests | **DONE** | feat/block-editor-tests | XX-02 | 1115 tests pass |

### Phase 4: UX Improvements (no backend)
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 4.1 | Add min-height to 7 form textareas | **DONE** | feat/block-editor-ux | SM-01 | PR #198 merged |
| 4.2 | Add empty state to ComparisonBlock, GridBlock, ListDetailBlock | **DONE** | feat/block-editor-ux | SM-01 | PR #198 merged |
| 4.3 | Add role="button" + tabIndex to upload dropzones | **DONE** | feat/block-editor-ux | SM-01 | PR #198 merged |
| 4.4 | Quality gate on UX | **DONE** | feat/block-editor-ux | XX-02 | Build + 1080 tests pass |

### Phase 5: Prototype Feature Waves (feat/block-based-summaries)
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 5.1 | Wave 1 — SidebarOutline, ReadingProgress, SearchBar | **DONE** | feat/wave1-reading-foundations | SM-01, IF-07, SM-06 | PR #199 merged, code review clean |
| 5.2 | Wave 2 — MasteryBar, useSummaryBlockMastery | **DONE** | feat/wave2-block-mastery | ST-05, SM-01, XX-02 | PR #200 merged, Agent Teams, QG APPROVE |
| 5.3 | Wave 3 — Bookmarks, Annotations, Quiz per block | **DONE** | feat/wave3-student-interaction | SM-01, SM-06, QZ-01, XX-02 | PR #201 merged, Agent Teams, QG APPROVE |
| 5.4 | Wave 4 — TTS, StudyTimer, ReadingSettingsPanel | **DONE** | feat/wave4-study-experience | SM-01, ST-05, IF-07, XX-02 | PR #202 merged, 1 fix (click-outside), QG APPROVE |
| 5.5 | Wave 5 — Dark mode (scoped to reader) | **DONE** | feat/wave5-advanced-features | IF-07, SM-01, XX-02 | PR #205 merged, 2 BLOCKs caught+fixed, QG APPROVE |
| 5.6 | Wave 6 — Undo/Redo + ResizableImage | **DONE** | feat/wave6-editor-polish | SM-01, XX-02 | PR #206 merged, 2 bugs found in code review+fixed |
| 5.7 | Undo/Redo no-op + perf regression bugfix | **DONE** | feat/wave6-editor-polish | SM-01, XX-02 | Commit cd7cc2b, Agent Teams |

### Infrastructure
| # | Task | Status | Branch | Notes |
|---|------|--------|--------|-------|
| I.1 | PreToolUse hook to enforce model: opus | **DONE** | main | .claude/hooks/check-agent-opus.cjs |
| I.2 | Track agent memory in git (un-gitignore) | **DONE** | main | PR #203 merged |
| I.3 | DB fix: add deleted_at to summary_blocks | **DONE** | — | Supabase migration applied directly |

### Pending
| # | Task | Status | Notes |
|---|------|--------|-------|
| P.1 | PR feat/block-based-summaries → main | **PENDING** | All 6 waves merged, needs final PR |
| P.2 | DrawingCanvas (Wave 5b) | DEFERRED | Low priority, complex |
| P.3 | Unit tests for useUndoRedo | DEFERRED | QG low-priority item |

## Execution Log
| Cycle | Timestamp | Tasks Executed | Result | Agents Used |
|-------|-----------|----------------|--------|-------------|
| 1 | 2026-03-26 | Phase 1-4 (1.1-4.4) | All DONE | SM-01, IF-07, SM-03, XX-02 |
| 2 | 2026-03-26/27 | Wave 1-6 (5.1-5.7) | All DONE | SM-01, ST-05, SM-06, QZ-01, IF-07, XX-02 |
| 3 | 2026-03-27 | Infrastructure (I.1-I.3) | All DONE | — |
| 4 | 2026-03-27 | Code reviews + merges (6 PRs) | All APPROVED | Threshold 50+ |

## Agent Learning Summary (2026-03-27)
| Agent | Sessions | Lessons | Key Learning |
|-------|----------|---------|-------------|
| SM-01 | 5 | 8 | blocksRef pattern, IIFE switch wrap, undo state must be consumed |
| ST-05 | 2 | 4 | STUDENT_BKT_STALE reuse, useRef for intervals |
| QZ-01 | 1 | 2 | AdaptiveQuizModal not reusable as wrapper |
| SM-06 | 1 | 1 | ReaderAnnotationsTab not adaptable for block notes |
| XX-02 | 1 | 3 | Hook return values must be consumed, RQ data in deps |
