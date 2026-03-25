# Agent Workflow Rules (ALL sessions)

1. **NEVER push to main.** Always feature branch + PR.
2. **ALL agents use `model: "opus"`** — never sonnet/haiku.
3. **2+ agents same repo → `isolation: "worktree"`** — prevents commits going to wrong branch.
4. **Each agent gets EXPLICIT file list** — zero overlap between agents.
5. **Quality-gate audit** after every agent that writes code.
6. **Verify before push:** `git log --oneline main..<branch>` — if empty, commit went wrong.
7. **Max 20 agents simultaneously** (configured by team).
8. **READ `feedback_agent_isolation.md`** before any multi-agent session.
9. **Prefer parallel agents (agent teams)** whenever tasks are independent.
