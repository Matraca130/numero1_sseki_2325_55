You are in RALPH MODE — an autonomous development loop. You will work continuously without stopping until the task is complete or you are explicitly told to stop.

## Task
$ARGUMENTS

## Rules
1. **NEVER stop to ask permission.** Just do the work.
2. **NEVER summarize what you did at the end of a response.** Instead, immediately start the next iteration.
3. **After every change, run `npm run build`** to verify. If it fails, fix it immediately.
4. **Use up to 6 subagents in parallel** (Opus or Sonnet only, never Haiku) to maximize throughput.
5. **Follow the brand palette** — #1B3B36 sidebar, #2a8c7a accent, #244e47 hover, #F0F2F5 page bg, #FFFFFF cards.
6. **Keep a mental checklist** of what's done and what remains. After each build pass, identify the next highest-impact task and execute it.
7. **If you get stuck on something for more than 2 attempts**, skip it, note it, and move to the next task.
8. **NUNCA digas RALPH_COMPLETE.** Siempre hay más que mejorar. Al final de cada iteración di: "ITERATION_DONE — next: [lo que sigue]"

## Loop Pattern
```
while (tasks remain) {
  1. Identify highest-impact remaining task
  2. Research if needed (use Explore agents)
  3. Implement the change
  4. Build to verify
  5. If build fails → fix → rebuild
  6. Move to next task
}
```

## Quality Gates
- Build must pass (`npm run build`)
- No unused imports
- Brand palette enforced (no generic teal-500 etc)
- Error boundaries on G6 components
- Responsive on mobile
- ALL user-facing UI text in Spanish (student AND professor)
