#!/bin/bash
# ============================================================
# Setup Ralph Pro — Instala y configura el mejor setup de
# Ralph loop para el proyecto Axon.
#
# Prerequisitos:
#   - jq instalado (winget install jqlang.jq)
#   - Node.js instalado
#   - Claude Code instalado
#   - Git Bash
#
# Usage:
#   bash .claude/setup-ralph-pro.sh
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Setting up Ralph Pro for Axon${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Step 1: Check prerequisites ──
echo -e "\n${YELLOW}[1/4] Checking prerequisites...${NC}"

for cmd in node npm claude git jq; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${RED}ERROR: '$cmd' not found. Install it first.${NC}"
    exit 1
  fi
done
echo -e "${GREEN}  All prerequisites OK${NC}"

# ── Step 2: Install frankbria/ralph-claude-code ──
echo -e "\n${YELLOW}[2/4] Installing Ralph for Claude Code...${NC}"

RALPH_REPO="$HOME/ralph-claude-code"
if [ ! -d "$RALPH_REPO" ]; then
  echo "Cloning ralph-claude-code..."
  git clone https://github.com/frankbria/ralph-claude-code.git "$RALPH_REPO"
fi

cd "$RALPH_REPO"
bash install.sh
cd -

echo -e "${GREEN}  Ralph installed${NC}"

# ── Step 3: Enable Ralph for this project ──
echo -e "\n${YELLOW}[3/4] Enabling Ralph for Axon project...${NC}"

# Create .ralph directory if it doesn't exist
mkdir -p .ralph/specs

# Create PROMPT.md with project context
cat > .ralph/PROMPT.md << 'PROMPT_EOF'
# Axon Platform — Knowledge Mind Map Feature

## Project
Axon is an educational platform (LMS) frontend built with React + TypeScript + Vite.
Backend is Supabase Edge Functions (Deno + Hono).

## Current Feature: Mind Map / Knowledge Graph
Interactive knowledge graph for students and professors using G6 (AntV) v5.

## Brand Palette (MANDATORY)
- Dark Teal: #1B3B36 (sidebar, primary buttons)
- Teal Accent: #2a8c7a (links, focus, active states)
- Hover Teal: #244e47 (button hover)
- Page BG: #F0F2F5
- Cards: #FFFFFF

## Languages
- Student UI: Portuguese (Brazilian)
- Professor UI: Spanish

## Rules
- Never use generic teal-500, always use #2a8c7a
- Never use Haiku model for subagents (Opus or Sonnet only)
- Always run npm run build after changes
- Don't modify src/app/components/ui/ (shadcn primitives)
- Use ErrorBoundary on all G6 components
- Import paths always with @/ alias
PROMPT_EOF

# Create fix_plan.md with current tasks
cat > .ralph/fix_plan.md << 'PLAN_EOF'
# Fix Plan — Mind Map Feature

## Priority 0 (Bugs)
- [ ] Verify ResizeObserver infinite loop is fixed in KnowledgeGraph.tsx

## Priority 1 (Features)
- [ ] Professor template maps (full CRUD UI)
- [ ] AI auto-suggest UI polish
- [ ] Student custom map merge UX improvements

## Priority 2 (Quality)
- [ ] Performance profiling for large graphs (100+ nodes)
- [ ] Mobile swipe-to-dismiss on detail panels
- [ ] Skip navigation (a11y)
- [ ] Toolbar wrapping on very small screens

## Priority 3 (Polish)
- [ ] Code cleanup passes
- [ ] Remove unused imports
- [ ] Consistent error messages (Portuguese/Spanish per role)

## Completed
- [x] Search/filter with debounce
- [x] Fold/unfold branches
- [x] Global graph (course scope)
- [x] Student custom nodes/edges
- [x] Professor add connection modal
- [x] AI suggest button
- [x] Real-time cache invalidation
- [x] MicroGraphPanel refactor
- [x] Topic selector
- [x] Mobile responsive (bottom sheet, touch targets, iOS zoom fix)
- [x] Accessibility (aria-live, roles, keyboard shortcuts)
- [x] useGraphSearch hook extracted
- [x] Long-press context menu
- [x] DeleteConfirmDialog
PLAN_EOF

# Create AGENT.md
cat > .ralph/AGENT.md << 'AGENT_EOF'
# Agent Configuration

## Build Command
npm run build

## Test Command
(none configured)

## Lint Command
(none configured)

## Dev Server
npm run dev

## Success Criteria
- Build passes clean (npm run build exits 0)
- No TypeScript errors
- Brand palette compliance (no generic teal-*)
- All G6 components wrapped in ErrorBoundary
AGENT_EOF

echo -e "${GREEN}  Ralph enabled for Axon${NC}"

# ── Step 4: Summary ──
echo -e "\n${YELLOW}[4/4] Setup complete!${NC}"
echo -e ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Ralph Pro is ready!${NC}"
echo -e ""
echo -e "  To start Ralph:"
echo -e "    ${CYAN}ralph${NC}"
echo -e ""
echo -e "  To monitor:"
echo -e "    ${CYAN}ralph-monitor${NC}"
echo -e ""
echo -e "  To resume a session:"
echo -e "    ${CYAN}ralph --resume${NC}"
echo -e ""
echo -e "  Config: .ralph/PROMPT.md (goals)"
echo -e "          .ralph/fix_plan.md (tasks)"
echo -e "          .ralph/AGENT.md (commands)"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
