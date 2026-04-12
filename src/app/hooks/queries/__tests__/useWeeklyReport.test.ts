// ============================================================
// Hook Tests — useWeeklyReport
//
// Tests the weekly report query + generate mutation: successful
// fetch, null fallback on error, and generate mutation updates cache.
//
// RUN: npx vitest run src/app/hooks/queries/__tests__/useWeeklyReport.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock api ────────────────────────────────────────────────

const mockApiCall = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// ── Import after mocks ─────────────────────────────────────

import { useWeeklyReport, type WeeklyReportData } from '../useWeeklyReport';

// ── Helpers ─────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { wrapper, queryClient };
}

// Mock data simulating what the backend returns (with ai-prefixed keys)
const MOCK_API_RESPONSE = {
  weekStart: '2026-03-30',
  weekEnd: '2026-04-05',
  totalSessions: 12,
  totalReviews: 45,
  correctReviews: 38,
  daysActive: 5,
  streakAtReport: 5,
  xpEarned: 320,
  aiSummary: 'Great week of study with consistent practice.',
  aiStrengths: ['Calculus', 'Linear Algebra'],
  aiWeaknesses: ['Statistics'],
  aiModel: 'claude-opus-4-6',
  accuracyPercent: 84,
  totalTimeSeconds: 7200,
  aiMasteryTrend: 'improving' as const,
  weakTopics: [{ topicName: 'Statistics', masteryLevel: 35, reason: 'Low p_know' }],
  strongTopics: [{ topicName: 'Calculus', masteryLevel: 88 }],
  lapsingCards: [{ cardFront: 'What is a derivative?', keyword: 'Derivative', lapses: 3 }],
  aiRecommendedFocus: [{ topicName: 'Statistics', reason: 'Low mastery', suggestedMethod: 'Flashcards' }],
};

// Expected normalized output after the hook processes the API response
const EXPECTED_REPORT: WeeklyReportData = {
  weekStart: '2026-03-30',
  weekEnd: '2026-04-05',
  totalSessions: 12,
  totalReviews: 45,
  correctReviews: 38,
  daysActive: 5,
  streakAtReport: 5,
  xpEarned: 320,
  summary: 'Great week of study with consistent practice.',
  strengths: ['Calculus', 'Linear Algebra'],
  weaknesses: ['Statistics'],
  recommendations: ['Statistics: Low mastery'],
  aiModel: 'claude-opus-4-6',
  accuracyPercent: 84,
  totalTimeSeconds: 7200,
  aiMasteryTrend: 'improving',
  weakTopics: [{ topicName: 'Statistics', masteryLevel: 35, reason: 'Low p_know' }],
  strongTopics: [{ topicName: 'Calculus', masteryLevel: 88 }],
  lapsingCards: [{ cardFront: 'What is a derivative?', keyword: 'Derivative', lapses: 3 }],
  aiRecommendedFocus: [{ topicName: 'Statistics', reason: 'Low mastery', suggestedMethod: 'Flashcards' }],
};

// ── Tests ───────────────────────────────────────────────────

describe('useWeeklyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches weekly report successfully', async () => {
    mockApiCall.mockResolvedValueOnce(MOCK_API_RESPONSE);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useWeeklyReport(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.report).toEqual(EXPECTED_REPORT));

    expect(mockApiCall).toHaveBeenCalledWith('/ai/weekly-report');
  });

  it('returns null report when fetch fails (graceful fallback)', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Server error'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useWeeklyReport(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The hook catches errors and returns null
    expect(result.current.report).toBeNull();
  });

  it('generate mutation calls POST and updates cache', async () => {
    // First call: GET (initial fetch returns null)
    mockApiCall.mockResolvedValueOnce(null);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useWeeklyReport(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Second call: POST (generate)
    mockApiCall.mockResolvedValueOnce(MOCK_API_RESPONSE);

    await act(async () => {
      result.current.generate();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));

    expect(mockApiCall).toHaveBeenCalledWith('/ai/weekly-report', { method: 'POST' });
    expect(result.current.report).toEqual(EXPECTED_REPORT);
  });

  it('exposes isGenerating state during mutation', async () => {
    mockApiCall.mockResolvedValueOnce(null); // initial fetch
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useWeeklyReport(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate slow generation
    let resolveGenerate!: (value: WeeklyReportData) => void;
    mockApiCall.mockReturnValueOnce(
      new Promise<WeeklyReportData>((resolve) => { resolveGenerate = resolve; }),
    );

    act(() => {
      result.current.generate();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(true));

    await act(async () => {
      resolveGenerate(MOCK_API_RESPONSE as unknown as WeeklyReportData);
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
  });
});
