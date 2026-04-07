// ============================================================
// Axon — AI Chat Service (RAG Chat)
// Split from aiService.ts (PN-6)
//
// Backend: POST /ai/rag-chat
// ============================================================

import { apiCall, apiCallStream } from '@/app/lib/api';
import type { ChatHistoryEntry, RagChatResponse } from './as-types';
import { handleRateLimitError } from './as-types';

/**
 * Chat with AI using RAG context.
 * Backend: POST /ai/rag-chat
 */
export async function chat(
  message: string,
  opts?: {
    summaryId?: string;
    topicId?: string;
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
  }
): Promise<RagChatResponse> {
  try {
    const body: Record<string, unknown> = { message };
    if (opts?.summaryId) body.summary_id = opts.summaryId;
    if (opts?.topicId) body.topic_id = opts.topicId;
    if (opts?.history && opts.history.length > 0) body.history = opts.history;
    if (opts?.strategy) body.strategy = opts.strategy;

    return await apiCall<RagChatResponse>('/ai/rag-chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    handleRateLimitError(err);
  }
}

/**
 * Convenience: get just the text response from chat.
 */
export async function chatText(
  message: string,
  opts?: {
    summaryId?: string;
    topicId?: string;
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
  }
): Promise<string> {
  const result = await chat(message, opts);
  return result.response;
}

/**
 * Explain a concept using AI with RAG context.
 */
export async function explainConcept(
  concept: string,
  summaryId?: string
): Promise<string> {
  const message = `Explica el siguiente concepto de forma clara y concisa: ${concept}`;
  const result = await chat(message, { summaryId });
  return result.response;
}

// ── Streaming chat ──────────────────────────────────────

/** SSE chunk shape from POST /ai/rag-chat (stream: true in body) */
interface StreamChunk {
  type: 'chunk' | 'sources' | 'done' | 'error';
  text?: string;
  sources?: RagChatResponse['sources'];
  log_id?: string;
  tokens?: RagChatResponse['tokens'];
  error?: string;
}

/**
 * Chat with AI using RAG context via SSE streaming.
 * Backend: POST /ai/rag-chat (with stream: true in body)
 *
 * Calls back progressively as chunks arrive, then delivers
 * sources and metadata on the `done` event.
 */
export async function chatStream(
  message: string,
  opts: {
    summaryId?: string;
    topicId?: string;
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
    onChunk: (text: string) => void;
    onSources?: (sources: RagChatResponse['sources']) => void;
    onDone?: (meta: { log_id: string; tokens?: RagChatResponse['tokens'] }) => void;
  }
): Promise<void> {
  const body: Record<string, unknown> = { message, stream: true };
  if (opts.summaryId) body.summary_id = opts.summaryId;
  if (opts.topicId) body.topic_id = opts.topicId;
  if (opts.history && opts.history.length > 0) body.history = opts.history;
  if (opts.strategy) body.strategy = opts.strategy;

  try {
    const stream = apiCallStream<StreamChunk>('/ai/rag-chat?stream=1', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'chunk':
          if (chunk.text) opts.onChunk(chunk.text);
          break;
        case 'sources':
          if (chunk.sources) opts.onSources?.(chunk.sources);
          break;
        case 'done':
          opts.onDone?.({
            log_id: chunk.log_id || '',
            tokens: chunk.tokens,
          });
          break;
        case 'error':
          throw new Error(chunk.error || 'Streaming error');
      }
    }
  } catch (err: unknown) {
    handleRateLimitError(err);
  }
}
