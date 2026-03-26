# Session Bootstrap (ALL sessions)

## 1. Memory System — Mandatory at session start

Before any multi-agent work, verify memory is bootstrapped:
```bash
bash .claude/bootstrap-memory.sh
```
If memory already exists, the script exits cleanly (no-op).

## 2. Agent Memory — Mandatory for every agent invocation

Every Agent tool call MUST include in its prompt:
```
Lee tu memoria en .claude/agent-memory/individual/<ID>-<nombre>.md
```
And at session end, every agent MUST append to its memory file following `.claude/AGENT-MEMORY-PROTOCOL.md`.

## 3. Agent Teams — Default execution mode

When a task decomposes into 3+ independent units:
- Launch agents in parallel (single message block with multiple Agent tool calls)
- Each agent gets `isolation: "worktree"` if writing code
- Each agent gets `run_in_background: true` for parallelism
- Quality Gate (XX-02) audits after all agents complete

## 4. Session Start Checklist

At the beginning of every session:
1. Run `git fetch origin main` to check for upstream changes
2. Verify agent memory exists (`ls .claude/agent-memory/individual/ | wc -l` should be 70+)
3. If memory is missing, run bootstrap script
4. Read `.claude/AGENT-MEMORY-PROTOCOL.md` for current protocol version

## 5. Session End Checklist

Before ending a session:
1. Each agent that ran MUST have appended to its individual memory
2. Quality Gate (XX-02) updates its memory with audit results
3. Push all committed work to the feature branch
