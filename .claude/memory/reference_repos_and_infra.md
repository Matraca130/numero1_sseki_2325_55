---
name: Infrastructure and External Services
description: Supabase project details, git config, external service references NOT in CLAUDE.md.
type: reference
---

**Git config:** user.name=Matraca130, user.email=petrick.brian@gmail.com
**Note:** `gh` CLI is not authenticated on this machine.

**Supabase:**
- Project ID: `xdnciktarvxyhkrokbng`
- Endpoint: `https://xdnciktarvxyhkrokbng.supabase.co/functions/v1/server`
- 50+ tables (~25 junk `kv_store_*`), 62 migrations, pgvector 1536d

**External services (beyond what CLAUDE.md lists):**
- Embeddings: OpenAI text-embedding-3-large (1536d) — migrated FROM Gemini 768d
- Video: Mux (upload, playback, tracking, webhooks)
- Payments: Stripe (checkout, portal, webhooks with timing-safe verification)
- Messaging: WhatsApp Cloud API + Telegram Bot API
- Realtime: OpenAI Realtime API (voice sessions)
