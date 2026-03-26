#!/bin/bash
# Bootstrap agent memory from seed templates
# Run this when .claude/agent-memory/ is empty or missing
# Seed templates are in git (.claude/agent-memory-seed/)
# Runtime memory is local-only (.gitignore'd)

SEED_DIR=".claude/agent-memory-seed"
MEMORY_DIR=".claude/agent-memory"

if [ ! -d "$SEED_DIR" ]; then
  echo "ERROR: Seed directory $SEED_DIR not found. Run from repo root."
  exit 1
fi

if [ -d "$MEMORY_DIR" ] && [ "$(ls -A $MEMORY_DIR 2>/dev/null)" ]; then
  echo "Memory directory already exists and is not empty."
  echo "To reset, delete $MEMORY_DIR and run again."
  exit 0
fi

echo "Bootstrapping agent memory from seed templates..."
cp -r "$SEED_DIR" "$MEMORY_DIR"
echo "Done. $(find $MEMORY_DIR -name '*.md' | wc -l) memory files initialized."
