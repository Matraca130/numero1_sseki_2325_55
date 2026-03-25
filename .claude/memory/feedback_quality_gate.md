---
name: Quality-gate runs immediately per agent
description: Launch quality-gate Opus agent IN BACKGROUND the instant any agent finishes. Don't wait for others. Audit in parallel.
type: feedback
---

When agent X completes: immediately launch quality-gate in background.
Prompt: "Audit changes by {agent-name}. Check git diff for modified files in {repo}. Run full quality checklist."
After ALL agents + ALL gates finish: present consolidated results. Fix NEEDS FIX items before committing.
