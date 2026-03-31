/**
 * Chat logic for AxonAIAssistant.
 * Handles streaming chat, fallback, and RAG feedback.
 */

import {
  chat,
  chatStream,
  submitRagFeedback,
} from '@/app/services/aiService';
import type {
  ChatHistoryEntry,
  RagChatResponse,
} from '@/app/services/aiService';
import type { DisplayMessage } from './constants';

export interface ChatSendResult {
  msgId: string;
  content: string;
  sources?: Array<{ chunk_id: string; summary_title: string; similarity: number }>;
  logId?: string;
  isError?: boolean;
  errorMessage?: string;
}

/**
 * Send a chat message with streaming, falling back to non-streaming.
 */
export async function sendChatMessage(
  msg: string,
  options: {
    summaryId?: string;
    history: ChatHistoryEntry[];
    onStreamStart: (msgId: string) => void;
    onStreamChunk: (msgId: string, accumulated: string) => void;
    onStreamSources: (msgId: string, sources: any[]) => void;
    onStreamDone: (msgId: string, logId: string) => void;
    onStreamEnd: () => void;
  },
): Promise<ChatSendResult> {
  const { summaryId, history, onStreamStart, onStreamChunk, onStreamSources, onStreamDone, onStreamEnd } = options;
  const streamingMsgId = `msg-${Date.now()}-${Math.random()}`;
  let rafId: number | null = null;

  try {
    onStreamStart(streamingMsgId);
    let accumulated = '';

    await chatStream(msg, {
      summaryId,
      history,
      onChunk: (chunk) => {
        accumulated += chunk;
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            onStreamChunk(streamingMsgId, accumulated);
            rafId = null;
          });
        }
      },
      onSources: (sources) => onStreamSources(streamingMsgId, sources),
      onDone: (meta) => { if (meta.log_id) onStreamDone(streamingMsgId, meta.log_id); },
    });

    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    onStreamChunk(streamingMsgId, accumulated);
    onStreamEnd();

    return { msgId: streamingMsgId, content: accumulated };
  } catch (streamErr) {
    if (rafId != null) cancelAnimationFrame(rafId);
    onStreamEnd();

    // Fallback to non-streaming
    try {
      const result: RagChatResponse = await chat(msg, { history, summaryId });
      const fallbackMsgId = `msg-${Date.now()}-${Math.random()}`;
      return {
        msgId: fallbackMsgId,
        content: result.response,
        sources: result.sources,
        logId: result.log_id,
      };
    } catch (err: unknown) {
      return {
        msgId: `msg-${Date.now()}`,
        content: `Erro: ${(err as Error).message}`,
        isError: true,
        errorMessage: (err as Error).message,
      };
    }
  }
}

export async function sendRagFeedback(logId: string, feedback: 'positive' | 'negative'): Promise<boolean> {
  try {
    await submitRagFeedback({ logId, feedback });
    return true;
  } catch {
    return false;
  }
}
