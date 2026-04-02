/**
 * flashcardApi.test.ts — Tests for flashcard API service layer
 *
 * Coverage: getFlashcards, getFlashcardsByTopic, getFlashcard,
 *           createFlashcard, updateFlashcard, deleteFlashcard, restoreFlashcard
 * Mocks: apiCall
 *
 * Run: npx vitest run src/app/services/__tests__/flashcardApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import {
  getFlashcards,
  getFlashcardsByTopic,
  getFlashcard,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  restoreFlashcard,
} from '../flashcardApi';

const mockApiCall = vi.mocked(apiCall);

describe('flashcardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getFlashcards ──

  describe('getFlashcards', () => {
    it('calls apiCall with summary_id param', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 100, offset: 0 });
      await getFlashcards('sum-1');
      expect(mockApiCall).toHaveBeenCalledWith(
        expect.stringContaining('/flashcards?summary_id=sum-1'),
      );
    });

    it('includes keyword_id when provided', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 100, offset: 0 });
      await getFlashcards('sum-1', 'kw-1');
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('summary_id=sum-1');
      expect(url).toContain('keyword_id=kw-1');
    });

    it('includes pagination opts', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 20 });
      await getFlashcards('sum-1', undefined, { limit: 10, offset: 20 });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
    });

    it('returns the response from apiCall', async () => {
      const mockResponse = { items: [{ id: 'fc-1' }], total: 1, limit: 100, offset: 0 };
      mockApiCall.mockResolvedValueOnce(mockResponse);
      const result = await getFlashcards('sum-1');
      expect(result).toEqual(mockResponse);
    });

    it('propagates API errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));
      await expect(getFlashcards('sum-1')).rejects.toThrow('Network error');
    });
  });

  // ── getFlashcardsByTopic ──

  describe('getFlashcardsByTopic', () => {
    it('calls the batch endpoint with topic_id', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 100, offset: 0 });
      await getFlashcardsByTopic('topic-1');
      expect(mockApiCall).toHaveBeenCalledWith(
        expect.stringContaining('/flashcards-by-topic?topic_id=topic-1'),
      );
    });

    it('includes pagination opts', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 50, offset: 0 });
      await getFlashcardsByTopic('topic-1', { limit: 50 });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('limit=50');
    });
  });

  // ── getFlashcard ──

  describe('getFlashcard', () => {
    it('calls apiCall with correct path', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'fc-1', front: 'Q', back: 'A' });
      await getFlashcard('fc-1');
      expect(mockApiCall).toHaveBeenCalledWith('/flashcards/fc-1');
    });

    it('returns the flashcard data', async () => {
      const card = { id: 'fc-1', front: 'Q', back: 'A' };
      mockApiCall.mockResolvedValueOnce(card);
      const result = await getFlashcard('fc-1');
      expect(result).toEqual(card);
    });
  });

  // ── createFlashcard ──

  describe('createFlashcard', () => {
    it('calls apiCall with POST and body', async () => {
      const data = { summary_id: 's1', keyword_id: 'k1', front: 'Q', back: 'A' };
      mockApiCall.mockResolvedValueOnce({ id: 'fc-new', ...data });
      await createFlashcard(data);
      expect(mockApiCall).toHaveBeenCalledWith('/flashcards', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('includes optional fields in body', async () => {
      const data = {
        summary_id: 's1',
        keyword_id: 'k1',
        front: 'Q',
        back: 'A',
        source: 'ai' as const,
        subtopic_id: 'sub-1',
        front_image_url: 'https://img.test/front.png',
      };
      mockApiCall.mockResolvedValueOnce({ id: 'fc-new', ...data });
      await createFlashcard(data);
      const body = JSON.parse(mockApiCall.mock.calls[0][1]!.body as string);
      expect(body.source).toBe('ai');
      expect(body.subtopic_id).toBe('sub-1');
      expect(body.front_image_url).toBe('https://img.test/front.png');
    });
  });

  // ── updateFlashcard ──

  describe('updateFlashcard', () => {
    it('calls apiCall with PUT and body', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'fc-1', front: 'Updated Q' });
      await updateFlashcard('fc-1', { front: 'Updated Q' });
      expect(mockApiCall).toHaveBeenCalledWith('/flashcards/fc-1', {
        method: 'PUT',
        body: JSON.stringify({ front: 'Updated Q' }),
      });
    });

    it('can toggle is_active', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'fc-1', is_active: false });
      await updateFlashcard('fc-1', { is_active: false });
      const body = JSON.parse(mockApiCall.mock.calls[0][1]!.body as string);
      expect(body.is_active).toBe(false);
    });
  });

  // ── deleteFlashcard ──

  describe('deleteFlashcard', () => {
    it('calls apiCall with DELETE', async () => {
      mockApiCall.mockResolvedValueOnce(undefined);
      await deleteFlashcard('fc-1');
      expect(mockApiCall).toHaveBeenCalledWith('/flashcards/fc-1', { method: 'DELETE' });
    });

    it('propagates errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('404 Not Found'));
      await expect(deleteFlashcard('fc-1')).rejects.toThrow('404 Not Found');
    });
  });

  // ── restoreFlashcard ──

  describe('restoreFlashcard', () => {
    it('calls apiCall with PUT /restore', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'fc-1', deleted_at: null });
      await restoreFlashcard('fc-1');
      expect(mockApiCall).toHaveBeenCalledWith('/flashcards/fc-1/restore', { method: 'PUT' });
    });

    it('returns restored flashcard', async () => {
      const restored = { id: 'fc-1', deleted_at: null, is_active: true };
      mockApiCall.mockResolvedValueOnce(restored);
      const result = await restoreFlashcard('fc-1');
      expect(result.deleted_at).toBeNull();
    });
  });
});
