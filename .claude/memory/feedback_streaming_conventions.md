---
name: Backend streaming convention
description: rag-chat checks both URL param ?stream=1 AND body.stream. Always send both from frontend.
type: feedback
---

For `/ai/rag-chat` SSE streaming, send BOTH `?stream=1` (URL param) AND `stream: true` (POST body).
Backend must check both. Fixed 2026-03-20 (backend PR #149, frontend PR #148).
Apply same pattern to any new streaming endpoints.
