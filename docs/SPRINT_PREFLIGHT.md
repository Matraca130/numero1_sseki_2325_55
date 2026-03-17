# Sprint Preflight Checklist — Axon Modularization

> **Origin**: Near-miss on 2026-03-16. Sprint 2 was planned against
> `SummarySessionNew.tsx` (52KB) — a file that **never existed** in any
> branch. The name was a stale placeholder carried across planning notes.
> Additionally, `StudentSummaryReader.tsx` had **already been modularized**
> (Phase B: 51KB → 21KB) but was almost targeted for redundant extraction.

---

## Mandatory checks BEFORE opening a sprint branch

### 1. Target file exists on `main`

```bash
# From repo root — MUST return a valid path + size
git show main:<path-to-file> | wc -c
# Example:
git show main:src/app/components/content/StudentSummaryReader.tsx | wc -c
```

If the command fails or returns 0, the file is a **phantom reference**. Do NOT proceed — verify the actual filename in the directory listing:

```bash
git ls-tree --name-only main src/app/components/content/
```

### 2. Check modularization history

```bash
git log --all --oneline -- <path-to-file> | head -10
grep -n "REFACTORED\|Phase\|Sprint\|Extracted" <path-to-file> | head -5
```

If the file header says "REFACTORED" or lists extracted sub-components, read it fully before planning new extractions.

### 3. Cross-check with other agents' domains

| Agent   | Domain                           | Key files (do NOT touch)                                          |
|---------|----------------------------------|-------------------------------------------------------------------|
| Agent 5 | Welcome + Gamification           | GUIDELINES.md, WelcomeView.tsx, GamificationView.tsx              |
| Self    | StudyHub → Session → Reader      | StudyHubView.tsx, StudentSummariesView.tsx, StudentSummaryReader.tsx |

### 4. Verify file size justifies a sprint

| Size      | Action                                            |
|-----------|---------------------------------------------------|
| < 10KB    | Palette audit only (inline in another sprint)     |
| 10-25KB   | Palette + 1-2 extractions = 1 sprint              |
| 25-50KB   | Full modularization sprint                         |
| > 50KB    | Split into 2 sprints                               |

### 5. Confirm no local-only files will be pushed

These files exist locally but MUST NOT be pushed:

- `StudentSummaryRedirect.tsx`
- `SectionStudyPlanView.tsx`

```bash
git diff --cached --name-only | grep -E "Redirect|StudyPlan"
```

---

## Post-incident log

| Date       | Error                                           | Root cause                                                                 | Prevention     |
|------------|--------------------------------------------------|----------------------------------------------------------------------------|----------------|
| 2026-03-16 | Planned Sprint 2 against `SummarySessionNew.tsx` | Stale placeholder name in planning notes; no existence check               | Added check #1 |
| 2026-03-16 | Almost re-modularized `StudentSummaryReader.tsx`  | Didn't read file header showing Phase B already done                       | Added check #2 |
