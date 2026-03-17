#!/bin/bash
# ============================================================
# Ralph Wiggum Loop — Autonomous Claude Code Runner
# Axon Platform — Mind Map Feature
#
# Lee .claude/ralph-instructions.md en CADA iteración.
# Editá ese archivo en caliente para cambiar las instrucciones.
# Para detener: cambiá STATUS: RUNNING → STATUS: STOP
#
# Usage:
#   bash .claude/ralph.sh          # 10 iteraciones, opus
#   bash .claude/ralph.sh 20       # 20 iteraciones
#
# ============================================================

MAX_ITER=$(echo "${1:-10}" | tr -dc '0-9')
MAX_ITER=${MAX_ITER:-10}
ITERATION=0
INSTRUCTIONS=".claude/ralph-instructions.md"
PROGRESS_FILE=".claude/ralph-progress.md"
LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/ralph-$(date +%Y%m%d-%H%M%S).log"

# Path to claude (verified: installed globally via npm)
CLAUDE="claude"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║         RALPH MODE ACTIVATED         ║"
echo "  ║      Axon Mind Map — Autonomous      ║"
echo "  ╠══════════════════════════════════════╣"
echo -e "  ║  Iterations: ${MAX_ITER}                      ║"
echo "  ║  Instructions: ralph-instructions.md ║"
echo "  ║  Log: ${LOG_FILE##*/}  ║"
echo "  ║                                      ║"
echo "  ║  To stop: edit ralph-instructions.md ║"
echo "  ║  and change STATUS: RUNNING → STOP   ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# Check instructions file
if [ ! -f "$INSTRUCTIONS" ]; then
  echo -e "${RED}ERROR: $INSTRUCTIONS not found!${NC}"
  echo "Run from project root: cd C:/Users/petri/numero1_sseki_2325_55"
  exit 1
fi

# Check claude CLI
if ! command -v $CLAUDE &> /dev/null; then
  echo -e "${RED}ERROR: '$CLAUDE' not found in PATH${NC}"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ralph started. Max iterations: $MAX_ITER" > "$LOG_FILE"

while [ $ITERATION -lt $MAX_ITER ]; do
  ITERATION=$((ITERATION + 1))

  # ── Check STOP signal ──
  if grep -qi "STATUS:.*STOP" "$INSTRUCTIONS" 2>/dev/null; then
    echo -e "\n${YELLOW}${BOLD}  RALPH STOPPED by user (STATUS: STOP)${NC}"
    echo -e "  Completed $((ITERATION - 1)) iterations\n"
    echo "[$(date '+%H:%M:%S')] STOPPED by user after $((ITERATION - 1)) iterations" >> "$LOG_FILE"
    exit 0
  fi

  # ── Read live instructions ──
  LIVE_INSTRUCTIONS=$(cat "$INSTRUCTIONS")

  # ── Read progress from previous iterations ──
  PROGRESS=""
  if [ -f "$PROGRESS_FILE" ]; then
    PROGRESS=$(cat "$PROGRESS_FILE")
  fi

  echo -e "\n${CYAN}${BOLD}  ━━━ Iteration $ITERATION / $MAX_ITER ━━━ [$(date '+%H:%M:%S')]${NC}\n"
  echo "[$(date '+%H:%M:%S')] === Iteration $ITERATION ===" >> "$LOG_FILE"

  # ── Build prompt ──
  PROMPT="You are in RALPH MODE — autonomous development loop iteration $ITERATION of $MAX_ITER.

## PROGRESS FROM PREVIOUS ITERATIONS (READ THIS FIRST)
This is your memory of what was done in prior iterations. Use it to avoid
redoing work and to pick up where you left off.

$PROGRESS

## Live Instructions (re-read each iteration — user may have edited them)

$LIVE_INSTRUCTIONS

## Your Mission This Iteration

1. Read the PROGRESS above to know what's already done — DO NOT redo completed work
2. Read the CLAUDE.md for project conventions
3. Check your memory files for context
4. Pick the highest-priority REMAINING task (not already marked [x] in progress)
5. Implement it fully — research, code, build, verify
6. If build fails, fix immediately (loop until green)
7. Use up to 6 subagents in parallel (Opus/Sonnet only, NEVER Haiku)
8. After completing a task, move to the next one
9. Keep working until this iteration's context limit is reached

## CRITICAL: Update Progress File Before Finishing
Before your response ends, you MUST update the file .claude/ralph-progress.md:
- Change 'Última iteración' to $ITERATION
- Mark completed features with [x]
- Add any new files you created/modified
- Move completed items from 'Pendiente' to 'Features completadas'
- Add any new bugs or notes
This is how the NEXT iteration knows what you did.

## Completion Signals
- Do NOT say RALPH_COMPLETE. There is ALWAYS more to improve.
- End with: ITERATION_DONE — next: [what the next iteration should focus on]
- If STATUS says STOP: output RALPH_STOPPED

## Important
- Student UI in Portuguese (Brazilian), Professor UI in Spanish
- Brand palette: #2a8c7a accent, #1B3B36 sidebar, #244e47 hover, #F0F2F5 page bg
- Always run npm run build after changes
- Never use Haiku model for subagents
- This is the Axon LMS platform, branch feature/mindmap-knowledge-graph"

  # ── Execute Claude ──
  $CLAUDE --dangerously-skip-permissions -p "$PROMPT" 2>&1 | tee -a "$LOG_FILE"
  EXIT_CODE=$?

  # ── Check completion ──
  if tail -100 "$LOG_FILE" | grep -q "RALPH_COMPLETE"; then
    echo -e "\n${GREEN}${BOLD}  ╔══════════════════════════════════════╗"
    echo "  ║       RALPH COMPLETE                 ║"
    echo "  ║       $ITERATION iterations executed          ║"
    echo "  ╚══════════════════════════════════════╝${NC}\n"
    echo "[$(date '+%H:%M:%S')] RALPH_COMPLETE after $ITERATION iterations" >> "$LOG_FILE"
    exit 0
  fi

  if tail -100 "$LOG_FILE" | grep -q "RALPH_STOPPED"; then
    echo -e "\n${YELLOW}${BOLD}  RALPH STOPPED after $ITERATION iterations${NC}\n"
    echo "[$(date '+%H:%M:%S')] RALPH_STOPPED after $ITERATION iterations" >> "$LOG_FILE"
    exit 0
  fi

  if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}  [$(date '+%H:%M:%S')] Exit code $EXIT_CODE — continuing...${NC}" | tee -a "$LOG_FILE"
  fi

  echo -e "${GREEN}  [$(date '+%H:%M:%S')] Iteration $ITERATION done.${NC}"
  echo "[$(date '+%H:%M:%S')] Iteration $ITERATION complete (exit: $EXIT_CODE)" >> "$LOG_FILE"

  # Rate limit pause
  sleep 5
done

echo -e "\n${YELLOW}${BOLD}  Max iterations ($MAX_ITER) reached.${NC}"
echo -e "  Log: $LOG_FILE\n"
echo "[$(date '+%H:%M:%S')] Max iterations reached" >> "$LOG_FILE"
