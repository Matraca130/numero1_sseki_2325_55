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
| 1.1 | Add Tailwind aliases for 5 CSS vars in tailwind.config (axon-dark, axon-accent, axon-mint, axon-teal-100, axon-page-bg) | PENDING | feat/design-token-migration | IF-07 | Enables `text-axon-dark` etc. |
| 1.2 | Replace 48 hex literals in student/blocks/*.tsx with token aliases | PENDING | feat/design-token-migration | SM-01 | Depends on 1.1 |
| 1.3 | Replace `#3cc9a8` phantom color — add to colors.ts or use nearest token | PENDING | feat/design-token-migration | IF-07 | 3 occurrences |
| 1.4 | Quality gate on token migration | PENDING | feat/design-token-migration | XX-02 | After 1.1-1.3 |

### Phase 2: Professor Editor Color Decision
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 2.1 | Clarify CLAUDE.md: professor accent = violet is ALLOWED (add explicit note) | PENDING | feat/design-token-migration | docs-writer | Resolves XX-08 contradiction |
| 2.2 | Replace `inputClass` focus ring violet→teal in all 10 forms (focus ring is interaction, not accent) | PENDING | feat/design-token-migration | SM-01 | Only focus rings, not badges/labels |

### Phase 3: Missing Tests
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 3.1 | Write KeywordChip.test.tsx | PENDING | feat/block-editor-tests | SM-03 | Render + popover + dark mode |
| 3.2 | Write ViewerBlock.integration.test.tsx | PENDING | feat/block-editor-tests | SM-03 | Route all 10 edu types + legacy |
| 3.3 | Write renderTextWithKeywords.test.tsx | PENDING | feat/block-editor-tests | SM-03 | Parse {{keyword}}, fallback, empty |
| 3.4 | Quality gate on tests | PENDING | feat/block-editor-tests | XX-02 | After 3.1-3.3 |

### Phase 4: UX Improvements (no backend)
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 4.1 | Add min-height to 7 form textareas | PENDING | feat/block-editor-ux | SM-01 | KeyPoint, Callout, Stages, ListDetail, Grid, TwoColumn, ImageRef |
| 4.2 | Add empty state to ComparisonBlock, GridBlock, ListDetailBlock | PENDING | feat/block-editor-ux | SM-01 | "Sin datos" placeholder |
| 4.3 | Add role="button" + tabIndex to upload dropzones (ProseForm, ImageRefForm) | PENDING | feat/block-editor-ux | SM-01 | a11y fix |
| 4.4 | Quality gate on UX | PENDING | feat/block-editor-ux | XX-02 | After 4.1-4.3 |

### Phase 5: Future (needs backend)
| # | Task | Status | Branch | Agent IDs | Notes |
|---|------|--------|--------|-----------|-------|
| 5.1 | AI Sparkles button (per-block content generation) | PENDING | feat/ai-block-gen | SM-01, AI-01 | Needs new backend endpoint |
| 5.2 | Per-block quiz generation | PENDING | feat/ai-block-quiz | SM-01, QZ-02 | Needs backend scoping |
| 5.3 | Mastery borders on blocks (BKT integration) | PENDING | feat/block-mastery | SM-01, BKT-01 | Needs BKT per-block data |
| 5.4 | Undo/Redo system | PENDING | feat/block-undo-redo | SM-01 | Frontend only, port from prototype |

## Execution Log
| Cycle | Timestamp | Tasks Executed | Result | Agents Used |
|-------|-----------|----------------|--------|-------------|
| — | — | — | — | — |
