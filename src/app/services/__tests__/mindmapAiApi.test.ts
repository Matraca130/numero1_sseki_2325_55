// ============================================================
// Tests — mindmapAiApi (AI API service with mock fallbacks)
//
// Tests that the API functions call apiCall correctly and
// fall back to mock data in DEV mode when apiCall throws.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall ────────────────────────────────────────────

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// ── Mock import.meta.env.DEV ────────────────────────────────

// Vitest sets import.meta.env.DEV = true by default in test mode,
// so the mock fallback path will execute when apiCall throws.

import {
  analyzeKnowledgeGraph,
  suggestStudentConnections,
  getStudentWeakPoints,
} from '../mindmapAiApi';

// ── Setup ───────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
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

  it('falls back to mock data in DEV when API fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Not found'));

    // The function has a setTimeout inside — use real timers for this test
    vi.useRealTimers();
    const result = await analyzeKnowledgeGraph('topic-fail');

    expect(result).toBeDefined();
    expect(result.weak_areas.length).toBeGreaterThan(0);
    expect(result.strong_areas.length).toBeGreaterThan(0);
    expect(result.study_path.length).toBeGreaterThan(0);
    expect(typeof result.overall_score).toBe('number');
    expect(typeof result.summary_text).toBe('string');
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

  it('falls back to mock data in DEV when API fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network error'));

    vi.useRealTimers();
    const result = await suggestStudentConnections('topic-1', [], []);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('source');
    expect(result[0]).toHaveProperty('target');
    expect(result[0]).toHaveProperty('type');
    expect(result[0]).toHaveProperty('confidence');
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

  it('falls back to mock data in DEV when API fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Server error'));

    vi.useRealTimers();
    const result = await getStudentWeakPoints('topic-fail');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('keyword_id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('mastery');
    expect(result[0]).toHaveProperty('recommended_action');
  });
});
