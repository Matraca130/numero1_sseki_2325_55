// ============================================================
// Axon — Student API: AI Features
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';

// ═════════════════════ AI FEATURES ═════════════════════

export async function aiChat(
  messages: Array<{ role: string; content: string }>,
  context?: any
): Promise<{ reply: string }> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const message = lastUserMsg?.content || '';
  const history = messages.slice(0, -1);

  // RAG chat needs > 15s default for the full pipeline + Claude generation.
  const data = await apiCall<{ response: string }>('/ai/rag-chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history: history.length > 0 ? history : undefined,
      summary_id: context?.summaryId || context?.summary_id || undefined,
    }),
    timeoutMs: 60_000,
  });
  return { reply: data.response };
}

export async function aiExplain(
  concept: string,
  context?: any
): Promise<{ explanation: string }> {
  const message = context
    ? `Explica el siguiente concepto en el contexto de "${context}": ${concept}`
    : `Explica el siguiente concepto de forma clara y concisa: ${concept}`;

  const data = await apiCall<{ response: string }>('/ai/rag-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
    timeoutMs: 60_000,
  });
  return { explanation: data.response };
}
