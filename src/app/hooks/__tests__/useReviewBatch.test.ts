// ============================================================
// TEST: useReviewBatch.ts — Standalone functions
//
// Tests retryPendingBatches (exported standalone, no hook needed)
// and the localStorage persistence lifecycle.
//
// NOTE: The hook's queueReview() BKT heuristic math lives inside
// a useCallback and requires renderHook + @testing-library/react
// to test. That's deferred to a future PR.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sessionApi BEFORE importing the module under test
const mockSubmitReviewBatch = vi.fn();
const mockFallbackToIndividual = vi.fn();

vi.mock('@/app/services/studySessionApi', () => ({
  submitReviewBatch: (...args: unknown[]) => mockSubmitReviewBatch(...args),
  fallbackToIndividualPosts: (...args: unknown[]) => mockFallbackToIndividual(...args),
}));

import { retryPendingBatches, LS_KEY } from '../useReviewBatch';

// ── localStorage helpers ──────────────────────────────────

function setLSBatch(sessionId: string, items: unknown[], savedAt?: string) {
  const batch = {
    sessionId,
    items,
    savedAt: savedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(batch));
}

const sampleItems = [
  { item_id: 'fc-1', instrument_type: 'flashcard', grade: 3, response_time_ms: 2000 },
  { item_id: 'fc-2', instrument_type: 'flashcard', grade: 1, response_time_ms: 5000 },
];

// ── Setup ─────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  mockSubmitReviewBatch.mockReset();
  mockFallbackToIndividual.mockReset();
});

// ── LS_KEY contract ───────────────────────────────────────

describe('LS_KEY', () => {
  it('should be the expected localStorage key', () => {
    expect(LS_KEY).toBe('axon_pending_review_batch');
  });

  it('retryPendingBatches reads from the same key the source writes to', async () => {
    // Verify the key used by retryPendingBatches matches LS_KEY
    // by writing under LS_KEY and confirming the function finds it
    mockSubmitReviewBatch.mockResolvedValue({ processed: 1, reviews_created: 1, fsrs_updated: 1, bkt_updated: 1 });
    setLSBatch('verify-key', [sampleItems[0]]);

    const result = await retryPendingBatches();
    expect(result).toBe(true);
    expect(mockSubmitReviewBatch).toHaveBeenCalled();
  });
});

// ── retryPendingBatches ───────────────────────────────────

describe('retryPendingBatches', () => {
  it('should return false when no pending batch exists', async () => {
    const result = await retryPendingBatches();
    expect(result).toBe(false);
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
  });

  it('should return false for empty items array', async () => {
    setLSBatch('session-1', []);
    const result = await retryPendingBatches();
    expect(result).toBe(false);
  });

  it('should submit batch and clear localStorage on success', async () => {
    mockSubmitReviewBatch.mockResolvedValue({ processed: 2, reviews_created: 2, fsrs_updated: 2, bkt_updated: 2 });
    setLSBatch('session-1', sampleItems);

    const result = await retryPendingBatches();

    expect(result).toBe(true);
    expect(mockSubmitReviewBatch).toHaveBeenCalledWith('session-1', sampleItems);
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it('should fallback to individual POSTs when batch fails', async () => {
    mockSubmitReviewBatch.mockRejectedValue(new Error('500 batch failed'));
    mockFallbackToIndividual.mockResolvedValue(undefined);
    setLSBatch('session-1', sampleItems);

    const result = await retryPendingBatches();

    expect(result).toBe(true);
    expect(mockSubmitReviewBatch).toHaveBeenCalledTimes(1);
    expect(mockFallbackToIndividual).toHaveBeenCalledWith('session-1', sampleItems);
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it('should return false and KEEP localStorage when both batch and fallback fail', async () => {
    mockSubmitReviewBatch.mockRejectedValue(new Error('batch fail'));
    mockFallbackToIndividual.mockRejectedValue(new Error('fallback fail'));
    setLSBatch('session-1', sampleItems);

    const result = await retryPendingBatches();

    expect(result).toBe(false);
    // Data should remain in localStorage for next retry
    expect(localStorage.getItem(LS_KEY)).not.toBeNull();
  });

  it('should discard batches older than 24 hours', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    setLSBatch('session-old', sampleItems, oldDate);

    const result = await retryPendingBatches();

    expect(result).toBe(false);
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
    // Expired batch should be cleared
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it('should handle corrupted localStorage data gracefully', async () => {
    localStorage.setItem(LS_KEY, 'not-valid-json{{{');

    const result = await retryPendingBatches();

    expect(result).toBe(false);
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
    // Should clear corrupted data
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it('should pass correct session_id to submitReviewBatch', async () => {
    mockSubmitReviewBatch.mockResolvedValue({ processed: 1, reviews_created: 1, fsrs_updated: 1, bkt_updated: 1 });
    setLSBatch('my-specific-session-uuid', [sampleItems[0]]);

    await retryPendingBatches();

    expect(mockSubmitReviewBatch).toHaveBeenCalledWith(
      'my-specific-session-uuid',
      [sampleItems[0]],
    );
  });
});
