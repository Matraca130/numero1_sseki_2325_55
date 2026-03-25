---
name: No auto-merge PRs
description: NEVER merge PRs automatically. Only create PRs — user wants to review before merge.
type: feedback
---

Do NOT merge PRs automatically. Only create branches and PRs. The user wants to review and merge manually.

**Why:** User explicitly said "no merge nada" — wants control over what gets merged.

**How to apply:** All agents should create branch → push → create PR → STOP. Never include `gh pr merge` in agent prompts. Report the PR URL back to the user.
