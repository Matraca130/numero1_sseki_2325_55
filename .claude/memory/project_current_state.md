---
name: Axon Current State (audited 2026-03-20)
description: Platform v4.5. Security audit completed 2026-03-19. RLS enabled (33+ tables), JWT verified (jose ES256). 62 migrations, backend tests increased. Agent system Phase 1 approved (13 agents).
type: project
---

Platform version: v4.5 (both frontend and backend)
Both repos on branch `main` as of 2026-03-20.

**Security audit completed (2026-03-19):**
- jose + ES256 JWKS JWT verification (replaces base64 decode)
- RLS enabled on 33+ tables with institution-scoped policies
- DOMPurify sanitization on all dangerouslySetInnerHTML
- CSP + HSTS + Permissions-Policy headers
- AI prompt sanitization universalized (6 files)
- AI output validation (stripHtmlTags before DB insert)
- Telegram webhook hardening (timing-safe + fail-closed)
- Rate limiting on /signup (5 req/min)
- Error message sanitization (safeErr strips DB details)
- CORS wildcard fallback removed
- Student route guards (RequireRole)
- SECURITY DEFINER functions hardened (search_path)
- bulk_reorder + gamification institution scoping

**Recent additions (since 2026-03-10):**
- Gamification complete: XP engine, badges, streaks, goals
- Embedding migration: Gemini 768d → OpenAI 1536d
- Telegram bot integration (full: webhook, review-flow, tools, rate-limit)
- Claude AI integration (`claude-ai.ts`)
- Realtime voice sessions (`as-realtime.ts` frontend, `realtime-session.ts` backend)
- Billing refactored into `routes/billing/` (Stripe checkout, portal, webhook)
- Study-queue refactored into `routes/study-queue/` (resolvers, scoring)
- Smart helpers/prompts split from generate-smart
- Admin messaging settings (frontend + backend)
- Sprint preflight CI workflow + tests
- Frontend: VoiceCallPanel, SummaryCard extracted, summary-helpers
- AI Chat streaming fix (backend PR #149 + frontend PR #148) — BUG-035 resolved
- PR #118 merged: messaging integrations + voice call + CORS fix + CI test fixes
- WhatsApp integration routes added
- Backend CI test-gate.yml fixed (--allow-env, --allow-net flags; integration tests non-blocking)

**Critical open issues (block launch):**
- BUG-030 (HIGH): Professor + Owner routes wired to PlaceholderPage (16 professor + 8 owner real pages exist, just not connected)
- BUG-033 (MEDIUM): `useTopicMastery` missing `summary_id` param — backend returns 400, FSRS per-topic aggregation silently fails
- BUG-034 (LOW): `GET /reading-states?limit=1000` returns 400 — likely missing required parent param
- S7 JWT Expiry 3600s (needs Pro plan)
- S9 Part B — 6 SQL functions need REVOKE
- Frontend tests failing on main (pre-existing)
- Vercel free plan hit 100 deploys/day limit — auto-deploy from GitHub works but manual `npx vercel deploy` blocked for 24h

**Resolved since last memory:**
- BUG-004 CORS: NOW FIXED in code — index.ts restricts to specific origins (Vercel + localhost). No longer wildcard.
- BUG-003 RLS: NOW FIXED — RLS enabled on 33+ tables with institution-scoped policies
- JWT verification: NOW FIXED — jose ES256 JWKS replaces base64 decode
- TEST-002: chunker.test.ts assertion fixed (`>` → `>=`), PR #118 merged
- BUG-035: AI Chat streaming fixed — backend PR #149 + frontend PR #148, both merged to main

**Frontend tech debt:**
- MUI + Emotion installed, 0 imports — remove
- Package name still `@figma/my-make-file`
- No ESLint config
- 17 test files / 586 source files (~2.9% coverage)
- 78 stale remote branches

**Backend tech debt:**
- 92 stale remote branches
- Backend test count increased (new tests for auth, validate, etc.)
- BACKEND_MAP.md says 41 migrations (actual: 62)
- WhatsApp + Telegram have duplicated review-flow logic (~800 LOC each)

**Why:** Prevents re-doing work, helps prioritize tasks.

**How to apply:** Check here before starting work. BUG-003/JWT are now resolved. BUG-030 remains for professor/owner pages. S7 (JWT expiry) and S9B (REVOKE on 6 functions) are remaining security items. Before adding frontend deps, remove unused MUI+Emotion first.
