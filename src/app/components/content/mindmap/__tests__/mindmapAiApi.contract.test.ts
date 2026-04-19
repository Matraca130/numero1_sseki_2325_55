// ============================================================
// Contract test -- mindmapAiApi service
//
// Verifies:
//   1. All 3 functions are exported with correct signatures
//   2. Each function validates its topicId parameter
//   3. Each function calls apiCall with the correct endpoint/method
//   4. Errors are wrapped with descriptive Spanish messages
//   5. suggestStudentConnections short-circuits on empty nodeIds
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiCall before importing the module under test
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  analyzeKnowledgeGraph,
  suggestStudentConnections,
  getStudentWeakPoints,
} from '@/app/services/mindmapAiApi';

beforeEach(() => {
  mockApiCall.mockReset();
});

// -- analyzeKnowledgeGraph ---------------------------------------------------

describe('analyzeKnowledgeGraph', () => {
  it('throws on empty topicId', async () => {
    await expect(analyzeKnowledgeGraph('')).rejects.toThrow(
      'topicId es requerido',
    );
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('calls POST /ai/analyze-knowledge-graph with topic_id', async () => {
    const fakeResponse = { weak_areas: [], strong_areas: [], missing_connections: [], study_path: [], overall_score: 80, summary_text: 'ok' };
    mockApiCall.mockResolvedValue(fakeResponse);

    const result = await analyzeKnowledgeGraph('topic-123');

    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/analyze-knowledge-graph',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ topic_id: 'topic-123' }),
      }),
    );
    expect(result).toBe(fakeResponse);
  });

  it('wraps apiCall errors with descriptive message', async () => {
    mockApiCall.mockRejectedValue(new Error('network down'));

    await expect(analyzeKnowledgeGraph('topic-1')).rejects.toThrow(
      'No se pudo analizar el grafo de conocimiento: network down',
    );
  });

  it('wraps non-Error throws with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue('string-throw');

    await expect(analyzeKnowledgeGraph('topic-1')).rejects.toThrow(
      'Error desconocido',
    );
  });
});

// -- suggestStudentConnections -----------------------------------------------

describe('suggestStudentConnections', () => {
  it('throws on empty topicId', async () => {
    await expect(
      suggestStudentConnections('', ['n1'], ['e1']),
    ).rejects.toThrow('topicId es requerido');
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('short-circuits to empty array when nodeIds is empty', async () => {
    const result = await suggestStudentConnections('topic-1', [], ['e1']);
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('calls POST /ai/suggest-student-connections with correct payload', async () => {
    const fakeSuggestions = [{ source: 'a', target: 'b', type: 'relates', reason: 'test', confidence: 0.9 }];
    mockApiCall.mockResolvedValue(fakeSuggestions);

    const result = await suggestStudentConnections(
      'topic-1',
      ['node-a', 'node-b'],
      ['edge-1'],
    );

    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/suggest-student-connections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          topic_id: 'topic-1',
          existing_node_ids: ['node-a', 'node-b'],
          existing_edge_ids: ['edge-1'],
        }),
      }),
    );
    expect(result).toBe(fakeSuggestions);
  });

  it('wraps apiCall errors with descriptive message', async () => {
    mockApiCall.mockRejectedValue(new Error('timeout'));

    await expect(
      suggestStudentConnections('topic-1', ['n1'], []),
    ).rejects.toThrow('No se pudieron obtener sugerencias de conexiones: timeout');
  });
});

// -- getStudentWeakPoints ----------------------------------------------------

describe('getStudentWeakPoints', () => {
  it('throws on empty topicId', async () => {
    await expect(getStudentWeakPoints('')).rejects.toThrow(
      'topicId es requerido',
    );
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('calls GET /ai/student-weak-points with encoded topic_id', async () => {
    const fakePoints = [{ keyword_id: 'k1', name: 'test', mastery: 0.3, last_reviewed: null, recommended_action: 'quiz' }];
    mockApiCall.mockResolvedValue(fakePoints);

    const result = await getStudentWeakPoints('topic/special&chars');

    expect(mockApiCall).toHaveBeenCalledWith(
      `/ai/student-weak-points?topic_id=${encodeURIComponent('topic/special&chars')}`,
    );
    expect(result).toBe(fakePoints);
  });

  it('wraps apiCall errors with descriptive message', async () => {
    mockApiCall.mockRejectedValue(new Error('403'));

    await expect(getStudentWeakPoints('topic-1')).rejects.toThrow(
      'No se pudieron obtener los puntos d\u00e9biles del estudiante: 403',
    );
  });
});
