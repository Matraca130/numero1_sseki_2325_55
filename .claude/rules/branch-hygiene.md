# Branch Hygiene Rules

## Problem
Switching between branches during a session causes stash accumulation, dirty worktrees, and commits on wrong branches.

## Rules

### 1. ALWAYS check current branch before any git operation
```bash
git branch --show-current  # FIRST command of any git workflow
```

### 2. NEVER use git stash for branch switching
Instead of `git stash && git checkout X`:
- If changes are uncommitted: commit them first (WIP commit OK), then checkout
- If changes belong to another branch: use `git worktree` for parallel work
- If changes are exploratory: `git checkout -- .` to discard (only if truly disposable)

### 3. ONE branch per task, decided at task start
- Decide the target branch BEFORE making any changes
- If the task needs multiple branches, use separate Agent tool calls with `isolation: "worktree"`
- Never drift between branches mid-task

### 4. Clean stash list after each session
```bash
git stash list  # Review
git stash drop stash@{N}  # Drop resolved stashes
```

### 5. Verify commit landed on correct branch
```bash
git log --oneline -1  # Verify last commit
git branch --show-current  # Verify current branch
```

### 6. For infrastructure changes (CLAUDE.md, .claude/*, .gitignore)
- These should ALWAYS go to main directly (they are config, not features)
- Use: `git checkout main && <make changes> && git commit && git push && git checkout -`
- NEVER commit infrastructure changes on a feature branch by accident

### 7. Stash accumulation = code smell
If `git stash list` shows 3+ entries, something went wrong. Stop and clean up before proceeding.
