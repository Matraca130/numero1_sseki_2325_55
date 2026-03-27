# AI/RAG Memory

## Estado actual
- Gemini 2.5 Flash for generation
- OpenAI text-embedding-3-large (1536d) for embeddings
- RAG chat streaming works (both ?stream=1 AND body.stream)
- Voice calls via OpenAI Realtime API

## Decisiones tomadas (NO re-litigar)
- Stream convention: send BOTH query param AND body field
- DOMPurify for all AI output rendering

## Archivos clave
- services/ai-service/ (10 files) — AI service layer, streaming, embeddings
- components/ai/AxonAIAssistant.tsx (1106L) — main AI chat component

## Bugs conocidos
- BUG-035 resolved (stream param mismatch)
