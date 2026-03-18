// ============================================================
// Tests — mindmapAiApi (AI API service)
//
// Tests that the API functions call apiCall correctly and
// throw user-friendly errors when apiCall fails.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall ────────────────────────────────────────────

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  analyzeKnowledgeGraph,
  suggestStudentConnections,
  getStudentWeakPoints,
} from '../mindmapAiApi';

// ── Setup ───────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── analyzeKnowledgeGraph ───────────────────────────────────

describe('analyzeKnowledgeGraph', () => {
  it('returns API response on success', async () => {
    const mockResponse = {
      weak_areas: [],
      strong_areas: [],
      missing_connections: [],
      study_path: [],
      overall_score: 0.75,
      summary_text: 'Test summary',
    };
    mockApiCall.mockResolvedValueOnce(mockResponse);

    const result = await analyzeKnowledgeGraph('topic-123');

    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/analyze-knowledge-graph',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ topic_id: 'topic-123' }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it('throws user-friendly error when API fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Not found'));

    await expect(analyzeKnowledgeGraph('topic-fail')).rejects.toThrow(
      'No se pudo analizar el grafo de conocimiento: Not found',
    );
  });
});

// ── suggestStudentConnections ───────────────────────────────

describe('suggestStudentConnections', () => {
  it('returns API response on success', async () => {
    const mockResponse = [
      { source: 'a', target: 'b', type: 'asociacion', reason: 'test', confidence: 0.9 },
    ];
    mockApiCall.mockResolvedValueOnce(mockResponse);

    const result = await suggestStudentConnections('topic-1', ['a', 'b'], ['e1']);

    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/suggest-student-connections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          topic_id: 'topic-1',
          existing_node_ids: ['a', 'b'],
          existing_edge_ids: ['e1'],
        }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it('throws user-friendly error when API fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network error'));

    await expect(suggestStudentConnections('topic-1', [], [])).rejects.toThrow(
      'No se pudieron obtener sugerencias de conexiones: Network error',
    );
  });
});

// ── getStudentWeakPoints ────────────────────────────────────

describe('getStudentWeakPoints', () => {
  it('returns API response on success', async () => {
    const mockResponse = [
      { keyword_id: 'k1', name: 'Test', mastery: 0.2, last_reviewed: null, recommended_action: 'quiz' },
    ];
    mockApiCall.mockResolvedValueOnce(mockResponse);

    const result = await getStudentWeakPoints('topic-5');

    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=topic-5',
    );
    expect(result).toEqual(mockResponse);
  });

  it('throws user-friendly error when API fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Server error'));

    await expect(getStudentWeakPoints('topic-fail')).rejects.toThrow(
      'No se pudieron obtener los puntos debiles del estudiante: Server error',
    );
  });
});
