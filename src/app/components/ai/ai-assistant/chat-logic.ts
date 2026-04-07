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
  /** true when streaming succeeded and the message was progressively rendered */
  streamCompleted?: boolean;
  /** The placeholder msgId from onStreamStart (needs cleanup on fallback path) */
  streamingPlaceholderId?: string;
}

/**
 * Send a chat message with streaming, falling back to non-streaming.
 */
export async function sendChatMessage(
  msg: string,
  options: {
    summaryId?: string;
    topicId?: string;
    history: ChatHistoryEntry[];
    onStreamStart: (msgId: string) => void;
    onStreamChunk: (msgId: string, accumulated: string) => void;
    onStreamSources: (msgId: string, sources: any[]) => void;
    onStreamDone: (msgId: string, logId: string) => void;
    onStreamEnd: () => void;
  },
): Promise<ChatSendResult> {
  const { summaryId, topicId, history, onStreamStart, onStreamChunk, onStreamSources, onStreamDone, onStreamEnd } = options;
  const streamingMsgId = `msg-${Date.now()}-${Math.random()}`;
  let rafId: number | null = null;

  try {
    onStreamStart(streamingMsgId);
    let accumulated = '';

    await chatStream(msg, {
      summaryId,
      topicId,
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

    return { msgId: streamingMsgId, content: accumulated, streamCompleted: true };
  } catch (streamErr) {
    if (rafId != null) cancelAnimationFrame(rafId);
    onStreamEnd();

    // Fallback to non-streaming — streaming placeholder needs cleanup by caller
    try {
      const result: RagChatResponse = await chat(msg, { history, summaryId, topicId });
      const fallbackMsgId = `msg-${Date.now()}-${Math.random()}`;
      return {
        msgId: fallbackMsgId,
        content: result.response,
        sources: result.sources,
        logId: result.log_id,
        streamCompleted: false,
        streamingPlaceholderId: streamingMsgId,
      };
    } catch (err: unknown) {
      return {
        msgId: `msg-${Date.now()}`,
        content: `Erro: ${(err as Error).message}`,
        isError: true,
        errorMessage: (err as Error).message,
        streamCompleted: false,
        streamingPlaceholderId: streamingMsgId,
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
