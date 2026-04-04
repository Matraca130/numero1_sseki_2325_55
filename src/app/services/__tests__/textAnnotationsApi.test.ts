/**
 * textAnnotationsApi.test.ts — Tests for text annotation API services
 *
 * Coverage:
 *   studentSummariesApi: getTextAnnotations, createTextAnnotation,
 *                        updateTextAnnotation, deleteTextAnnotation
 *   textAnnotationsApi:  getAnnotationsBySummary, createAnnotation,
 *                        updateAnnotation, deleteAnnotation, unwrapItems
 *
 * Run: npx vitest run src/app/services/__tests__/textAnnotationsApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import {
  getTextAnnotations,
  createTextAnnotation,
  updateTextAnnotation,
  deleteTextAnnotation,
} from '../studentSummariesApi';
import {
  getAnnotationsBySummary,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from '../textAnnotationsApi';

const mockApiCall = vi.mocked(apiCall);

// ── Fixtures ─────────────────────────────────────────────────

const MOCK_ANNOTATION = {
  id: 'ann-001',
  student_id: 'stu-001',
  summary_id: 'sum-001',
  start_offset: 10,
  end_offset: 25,
  color: 'yellow',
  note: 'Test note',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  deleted_at: null,
};

// ── studentSummariesApi ──────────────────────────────────────

describe('studentSummariesApi — Text Annotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTextAnnotations', () => {
    it('calls apiCall with correct URL and summary_id', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [MOCK_ANNOTATION], total: 1 });
      await getTextAnnotations('sum-001');
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations?summary_id=sum-001');
    });

    it('returns paginated result', async () => {
      const payload = { items: [MOCK_ANNOTATION], total: 1 };
      mockApiCall.mockResolvedValueOnce(payload);
      const result = await getTextAnnotations('sum-001');
      expect(result).toEqual(payload);
    });

    it('propagates API errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));
      await expect(getTextAnnotations('sum-001')).rejects.toThrow('Network error');
    });
  });

  describe('createTextAnnotation', () => {
    it('calls POST with correct body', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_ANNOTATION);
      const data = {
        summary_id: 'sum-001',
        start_offset: 10,
        end_offset: 25,
        color: 'yellow',
      };
      await createTextAnnotation(data);
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('includes optional note in body', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_ANNOTATION);
      const data = {
        summary_id: 'sum-001',
        start_offset: 0,
        end_offset: 5,
        note: 'My note',
      };
      await createTextAnnotation(data);
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as any).body);
      expect(body.note).toBe('My note');
    });

    it('returns the created annotation', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_ANNOTATION);
      const result = await createTextAnnotation({
        summary_id: 'sum-001',
        start_offset: 10,
        end_offset: 25,
      });
      expect(result.id).toBe('ann-001');
    });
  });

  describe('updateTextAnnotation', () => {
    it('calls PUT with annotation ID and data', async () => {
      mockApiCall.mockResolvedValueOnce({ ...MOCK_ANNOTATION, note: 'Updated' });
      await updateTextAnnotation('ann-001', { note: 'Updated' });
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations/ann-001', {
        method: 'PUT',
        body: JSON.stringify({ note: 'Updated' }),
      });
    });

    it('can update color', async () => {
      mockApiCall.mockResolvedValueOnce({ ...MOCK_ANNOTATION, color: 'blue' });
      await updateTextAnnotation('ann-001', { color: 'blue' });
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as any).body);
      expect(body.color).toBe('blue');
    });
  });

  describe('deleteTextAnnotation', () => {
    it('calls DELETE with annotation ID', async () => {
      mockApiCall.mockResolvedValueOnce({ success: true });
      await deleteTextAnnotation('ann-001');
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations/ann-001', {
        method: 'DELETE',
      });
    });
  });
});

// ── textAnnotationsApi (secondary service) ───────────────────

describe('textAnnotationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAnnotationsBySummary', () => {
    it('calls apiCall with correct URL', async () => {
      mockApiCall.mockResolvedValueOnce([MOCK_ANNOTATION]);
      await getAnnotationsBySummary('sum-001');
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations?summary_id=sum-001');
    });

    it('unwraps array response', async () => {
      mockApiCall.mockResolvedValueOnce([MOCK_ANNOTATION]);
      const result = await getAnnotationsBySummary('sum-001');
      expect(result).toEqual([MOCK_ANNOTATION]);
    });

    it('unwraps {items: [...]} response', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [MOCK_ANNOTATION] });
      const result = await getAnnotationsBySummary('sum-001');
      expect(result).toEqual([MOCK_ANNOTATION]);
    });

    it('unwraps {data: [...]} response', async () => {
      mockApiCall.mockResolvedValueOnce({ data: [MOCK_ANNOTATION] });
      const result = await getAnnotationsBySummary('sum-001');
      expect(result).toEqual([MOCK_ANNOTATION]);
    });

    it('returns empty array for unexpected response shape', async () => {
      mockApiCall.mockResolvedValueOnce({ unexpected: true });
      const result = await getAnnotationsBySummary('sum-001');
      expect(result).toEqual([]);
    });

    it('returns empty array for null/undefined items', async () => {
      mockApiCall.mockResolvedValueOnce({ items: null });
      const result = await getAnnotationsBySummary('sum-001');
      expect(result).toEqual([]);
    });
  });

  describe('createAnnotation', () => {
    it('calls POST with all required fields', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_ANNOTATION);
      await createAnnotation({
        summary_id: 'sum-001',
        selected_text: 'Hello world',
      });
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations', expect.objectContaining({
        method: 'POST',
      }));
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as any).body);
      expect(body.summary_id).toBe('sum-001');
      expect(body.selected_text).toBe('Hello world');
      expect(body.annotation_type).toBe('highlight');
      expect(body.color).toBe('yellow');
    });

    it('includes optional fields when provided', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_ANNOTATION);
      await createAnnotation({
        summary_id: 'sum-001',
        selected_text: 'Test',
        note: 'My note',
        annotation_type: 'note',
        color: 'blue',
        start_offset: 5,
        end_offset: 10,
        chunk_id: 'chunk-001',
      });
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as any).body);
      expect(body.note).toBe('My note');
      expect(body.annotation_type).toBe('note');
      expect(body.color).toBe('blue');
      expect(body.start_offset).toBe(5);
      expect(body.end_offset).toBe(10);
      expect(body.chunk_id).toBe('chunk-001');
    });

    it('defaults note to empty string when not provided', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_ANNOTATION);
      await createAnnotation({ summary_id: 'sum-001', selected_text: 'Test' });
      const body = JSON.parse((mockApiCall.mock.calls[0][1] as any).body);
      expect(body.note).toBe('');
    });
  });

  describe('updateAnnotation', () => {
    it('calls PUT with correct URL and data', async () => {
      mockApiCall.mockResolvedValueOnce({ ...MOCK_ANNOTATION, note: 'Updated' });
      await updateAnnotation('ann-001', { note: 'Updated' });
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations/ann-001', expect.objectContaining({
        method: 'PUT',
      }));
    });
  });

  describe('deleteAnnotation', () => {
    it('calls DELETE with correct URL', async () => {
      mockApiCall.mockResolvedValueOnce(undefined);
      await deleteAnnotation('ann-001');
      expect(mockApiCall).toHaveBeenCalledWith('/text-annotations/ann-001', {
        method: 'DELETE',
      });
    });
  });
});
