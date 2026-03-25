# Memory Index

## Project
- [project_current_state.md](project_current_state.md) — v4.5, 16 bugs, 62 migrations. Critical: RLS/JWT. Recent: Telegram, Claude AI, realtime, billing.
- [project_agent_strategy.md](project_agent_strategy.md) — 24-agent system in 3 phases. Phase 1=13 agents. DO NOT re-litigate.
- [project_delta_mastery_migration.md](project_delta_mastery_migration.md) — Delta Mastery color unification. PR #123 MERGED. Pending: remove @deprecated functions.

## User
- [user_petri.md](user_petri.md) — Solo developer/founder, works in Spanish, uses Figma Make + Obsidian

## Reference
- [reference_repos_and_infra.md](reference_repos_and_infra.md) — Supabase project ID, git config, external services (Mux, Stripe, OpenAI, WhatsApp, Telegram)

## Feedback
- [feedback_autonomous_mode.md](feedback_autonomous_mode.md) — bypassPermissions active. Never ask confirmation. Just execute. (Merges former bypass_permissions)
- [feedback_agent_isolation.md](feedback_agent_isolation.md) — COMPLETE multi-agent checklist: file isolation, worktrees, model=opus, quality-gate, merge order. (Merges former coordination_lessons + always_opus)
- [feedback_sync_and_freshness.md](feedback_sync_and_freshness.md) — Volatile state in memory, NOT CLAUDE.md. Update project_current_state after significant work.
- [feedback_always_use_branches.md](feedback_always_use_branches.md) — gh CLI not authenticated. Push branch, user merges via browser.
- [feedback_quality_gate.md](feedback_quality_gate.md) — Launch quality-gate Opus IN BACKGROUND the instant each agent finishes.
- [feedback_streaming_conventions.md](feedback_streaming_conventions.md) — rag-chat: send both ?stream=1 AND body.stream. Check both on backend.

