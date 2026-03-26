---
name: Autonomous execution — no confirmations
description: bypassPermissions active. Never ask permission. Execute all operations (commits, pushes, PRs, builds, agents) immediately. Only ask for genuinely ambiguous architectural decisions.
type: feedback
---

Execute ALL operations immediately without asking. User has bypassPermissions active.

**Includes:** git commits, push, PR creation, file edits, branch creation, deploys, running agents, builds/tests.
**Only exception:** genuinely ambiguous architectural decisions with multiple valid paths.
**Still applies:** never push to main — always feature branch + PR.
