/**
 * reviewsApi.test.ts — Tests for reviews API service (R1 domain extraction)
 *
 * Coverage: createReview (payload forwarding, method, headers-less call through apiCall)
 * Mocks: apiCall
 *
 * Run: npx vitest run src/app/services/__tests__/reviewsApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import { createReview, type Review, type ReviewPayload } from '../reviewsApi';

const mockApiCall = vi.mocked(apiCall);

describe('reviewsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReview', () => {
    it('calls apiCall with POST /reviews', async () => {
      const payload: ReviewPayload = {
        session_id: 'sess-1',
        item_id: 'item-1',
        instrument_type: 'flashcard',
        grade: 4,
      };
      mockApiCall.mockResolvedValueOnce({ id: 'rev-1' } as Review);
      await createReview(payload);
      expect(mockApiCall).toHaveBeenCalledWith('/reviews', expect.objectContaining({ method: 'POST' }));
    });

    it('serializes the payload as JSON body', async () => {
      const payload: ReviewPayload = {
        session_id: 'sess-1',
        item_id: 'item-1',
        instrument_type: 'flashcard',
        grade: 4,
        response_time_ms: 1500,
      };
      mockApiCall.mockResolvedValueOnce({ id: 'rev-1' } as Review);
      await createReview(payload);
      const options = mockApiCall.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body).toEqual(payload);
    });

    it('works without optional response_time_ms', async () => {
      const payload: ReviewPayload = {
        session_id: 'sess-1',
        item_id: 'item-1',
        instrument_type: 'quiz',
        grade: 2,
      };
      mockApiCall.mockResolvedValueOnce({ id: 'rev-2' } as Review);
      await createReview(payload);
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body).toEqual(payload);
      expect(body.response_time_ms).toBeUndefined();
    });

    it('returns the created Review from apiCall', async () => {
      const review: Review = {
        id: 'rev-1',
        session_id: 'sess-1',
        item_id: 'item-1',
        instrument_type: 'flashcard',
        grade: 5,
        response_time_ms: 800,
        created_at: '2026-04-18T10:00:00Z',
      };
      mockApiCall.mockResolvedValueOnce(review);
      const result = await createReview({
        session_id: 'sess-1',
        item_id: 'item-1',
        instrument_type: 'flashcard',
        grade: 5,
        response_time_ms: 800,
      });
      expect(result).toEqual(review);
    });

    it('propagates network / API errors from apiCall', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('403 Forbidden: session not owned'));
      await expect(
        createReview({ session_id: 's', item_id: 'i', instrument_type: 'flashcard', grade: 3 })
      ).rejects.toThrow('403 Forbidden: session not owned');
    });

    it('forwards grade=0 (Again) without coercion', async () => {
      // grade: 0-5 — ensure value 0 is not dropped accidentally.
      mockApiCall.mockResolvedValueOnce({ id: 'rev-3' } as Review);
      await createReview({
        session_id: 's',
        item_id: 'i',
        instrument_type: 'flashcard',
        grade: 0,
      });
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.grade).toBe(0);
    });

    it('forwards response_time_ms=0 explicitly (edge case)', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'rev-4' } as Review);
      await createReview({
        session_id: 's',
        item_id: 'i',
        instrument_type: 'flashcard',
        grade: 4,
        response_time_ms: 0,
      });
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.response_time_ms).toBe(0);
    });
  });
});
