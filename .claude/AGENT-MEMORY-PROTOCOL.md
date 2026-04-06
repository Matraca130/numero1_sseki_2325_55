# Agent Memory Protocol

## Architecture

```
.claude/agent-memory-seed/    ← IN GIT (templates, read-only baseline)
.claude/agent-memory/         ← IN GIT (tracked, agents learn across sessions)
```

**Seed** = initial templates tracked in git. Never modified at runtime.
**Memory** = live runtime state, NOW TRACKED IN GIT so learnings persist across sessions and clones. Agents read and write freely.

> **Permissions:** `.claude/settings.json` (tracked in git) pre-approves specific read-only `gh` operations (`gh pr view/list/diff/checks`, `gh issue view/list`, `gh repo view`, `gh api`) so agents never trigger destructive GitHub actions. Edit/Write are NOT blanket-approved — agents use them under normal tool-approval flow. This replaces the old `settings.local.json` approach which was gitignored and didn't work in web sessions or worktrees.

## Bootstrap

On first clone or when memory is missing:
```bash
bash .claude/bootstrap-memory.sh
```
This copies seed → memory. Only runs if memory/ is empty.

## Memory Tiers

| Tier | Files | Written by | Read by |
|------|-------|-----------|---------|
| Individual | `individual/<ID>.md` | That agent only | That agent only |
| Section | `<section>.md` (quiz, flashcards...) | Section lead only | All section agents |
| Project | `../memory/*.md` | Architect (XX-01) only | All agents |

## Concurrency Safety

- Each agent writes ONLY to its own `individual/<ID>.md` → zero file overlap
- Section memories: only the lead agent writes (e.g., QZ-01 for quiz.md)
- Project memory: only XX-01 (architect) writes
- **NEVER assign the same agent ID to two concurrent sessions**

## Post-Session Write Protocol (MANDATORY)

Every agent MUST do this at session end:

### 1. Append session log (DO NOT edit existing content)
```markdown
## [YYYY-MM-DD] Session: <brief description>
- **Task**: What was done
- **Learned**: Key insight (1-2 sentences)
- **Pattern**: Reusable pattern discovered (if any)
- **Mistake**: Error made and how to avoid (if any)
- **Files touched**: List of modified files
```

### 2. Update metrics table
Increment `Sesiones ejecutadas`, update QG pass/fail count.

### 3. Add to lessons table (if applicable)
Only add a lesson if it is genuinely new and reusable:
```markdown
| YYYY-MM-DD | <lesson> | <how to prevent> |
```

## Format Rules

- **APPEND ONLY** — never edit or delete existing entries
- **Session logs** use `## [date]` headers (not tables) — easy to append
- **Lessons table** stays at the top for quick reference
- **No secrets** — never include API keys, tokens, passwords, or credential values
- **Max 100 active lines** — after 10 sessions, architect consolidates

## Memory Compaction (by XX-01 architect, every ~10 sessions)

1. Review all individual memories
2. Remove lessons with `Confianza: BAJA` after 10+ sessions
3. Promote cross-cutting lessons to section memory
4. Archive old session logs to `individual/<ID>-archive.md`
5. Keep active memory under 100 lines

## Lesson Status

| Status | Meaning |
|--------|---------|
| ACTIVE | Valid, follow this lesson |
| DEPRECATED | Was valid, no longer applies (with reason) |
| INCORRECT | Was wrong, do the opposite |

XX-02 (quality-gate) can change status. Individual agents cannot deprecate their own lessons.

## Knowledge Promotion Flow

```
Individual learning → XX-02 reviews → Section memory (if cross-agent)
                                    → Project memory (if cross-section, via XX-01)
```
