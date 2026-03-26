# Session Bootstrap (ALL sessions)

## 1. Memory System — Mandatory at session start

Before any multi-agent work, verify memory is bootstrapped:
```bash
bash .claude/bootstrap-memory.sh
```
If memory already exists, the script exits cleanly (no-op).

## 2. Agent Prompt Template — MANDATORY for every Agent tool call

Every prompt passed to the Agent tool MUST start with this preamble BEFORE the task description.
This is not a suggestion — it is a blocking requirement. Do NOT summarize or paraphrase it.

```
ANTES DE CUALQUIER OTRA ACCION, lee estos archivos en este orden:
1. .claude/agents/<nombre>.md  (tu definicion, rol, zona de ownership, reglas)
2. .claude/agent-memory/individual/<ID>-<nombre>.md  (tu memoria: lecciones, errores, patrones)
3. Sigue las instrucciones de "Al iniciar SIEMPRE" de tu definicion si las tiene.

Si alguno no existe, continua con los que si existen.

AL FINALIZAR tu tarea, DEBES hacer append a tu memoria individual siguiendo .claude/AGENT-MEMORY-PROTOCOL.md:
- Fecha, tarea, que aprendiste, errores, archivos tocados.
```

### Why this matters

The agent definition file contains:
- Ownership zone (which files it CAN touch)
- Coding rules specific to its section
- Dependencies on other agents
- "Al iniciar SIEMPRE" steps (extra files to read)

The memory file contains:
- Past mistakes to avoid (prevents repeated errors)
- Patterns that worked (accelerates work)
- Metrics to update at session end

Without reading these, the agent operates blind and may:
- Touch files outside its ownership (scope creep)
- Repeat documented mistakes
- Skip section-specific rules
- Break contracts with other agents

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
