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
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
  }
): Promise<RagChatResponse> {
  try {
    const body: Record<string, unknown> = { message };
    if (opts?.summaryId) body.summary_id = opts.summaryId;
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
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
  }
): Promise<string> {
  const result = await chat(message, opts);
  return result.response;
}

/**
 * Streaming chat with AI using RAG context.
 * Calls onChunk progressively, then onSources when context is ready, then onDone.
 * Backend: POST /ai/rag-chat?stream=1
 */
export async function chatStream(
  message: string,
  opts: {
    summaryId?: string;
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
  },
  onChunk: (text: string) => void,
  onSources?: (sources: Array<{ chunk_id: string; summary_title: string; similarity: number }>) => void,
  onDone?: (logId: string) => void,
): Promise<void> {
  const stream = apiCallStream<{
    type: string;
    text?: string;
    sources?: Array<{ chunk_id: string; summary_title: string; similarity: number }>;
    log_id?: string;
  }>(
    '/ai/rag-chat?stream=1',
    {
      method: 'POST',
      body: {
        message,
        summary_id: opts.summaryId ?? null,
        history: opts.history ?? [],
        strategy: opts.strategy ?? 'auto',
      },
    },
  );

  for await (const event of stream) {
    if (event.type === 'chunk' && event.text) onChunk(event.text);
    if (event.type === 'sources' && event.sources) onSources?.(event.sources);
    if (event.type === 'done' && event.log_id) onDone?.(event.log_id);
  }
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
