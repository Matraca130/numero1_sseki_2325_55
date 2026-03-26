// ============================================================
// Flashcard API Contract Guards — Axon v4.4
//
// PURPOSE: Verify API functions construct correct URLs and
// payloads without making real network requests.
//
// GUARDS AGAINST:
//   - URL construction bugs (query params, paths)
//   - Guidelines Rule 2: flat routes with query params (no REST nesting)
//   - Payload shape changes that break backend contract
//   - Missing method (POST/PUT/DELETE) on mutation endpoints
//
// APPROACH: Mock apiCall() and inspect what URL/options were passed.
//
// RUN: npx vitest run
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing API modules ────────────
const mockApiCall = vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import {
  getFlashcards,
  getFlashcardsByTopic,
  getFlashcard,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  restoreFlashcard,
} from '@/app/services/flashcardApi';

beforeEach(() => {
  mockApiCall.mockClear();
});

// ══════════════════════════════════════════════════════════════
// SUITE 1: getFlashcards URL construction
// ══════════════════════════════════════════════════════════════

describe('getFlashcards — URL construction', () => {
  it('uses flat /flashcards route with summary_id param (Rule 2)', async () => {
    await getFlashcards('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/flashcards?');
    expect(url).toContain('summary_id=sum-123');
    expect(url).not.toMatch(/\/summaries\//);
  });

  it('includes keyword_id filter when provided', async () => {
    await getFlashcards('sum-123', 'kw-456');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('summary_id=sum-123');
    expect(url).toContain('keyword_id=kw-456');
  });

  it('does not include keyword_id when omitted', async () => {
    await getFlashcards('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).not.toContain('keyword_id');
  });

  it('includes pagination params (limit and offset)', async () => {
    await getFlashcards('sum-123', undefined, { limit: 10, offset: 20 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=20');
  });

  it('uses GET method (no options object with method)', async () => {
    await getFlashcards('sum-123');
    // apiCall called with only URL (no second argument)
    expect(mockApiCall.mock.calls[0].length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: getFlashcardsByTopic URL construction
// ══════════════════════════════════════════════════════════════

describe('getFlashcardsByTopic — URL construction', () => {
  it('uses /flashcards-by-topic route with topic_id param', async () => {
    await getFlashcardsByTopic('topic-001');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/flashcards-by-topic?');
    expect(url).toContain('topic_id=topic-001');
  });

  it('includes pagination params', async () => {
    await getFlashcardsByTopic('topic-001', { limit: 25, offset: 50 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=50');
  });

  it('does not include limit/offset when not provided', async () => {
    await getFlashcardsByTopic('topic-001');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).not.toContain('limit');
    expect(url).not.toContain('offset');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: getFlashcard (single) URL construction
// ══════════════════════════════════════════════════════════════

describe('getFlashcard — URL construction', () => {
  it('uses /flashcards/:id path param', async () => {
    await getFlashcard('fc-999');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/flashcards/fc-999');
  });

  it('uses GET method (no options object)', async () => {
    await getFlashcard('fc-999');
    expect(mockApiCall.mock.calls[0].length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: createFlashcard payload contract
// ══════════════════════════════════════════════════════════════

describe('createFlashcard — payload contract', () => {
  it('sends POST to /flashcards with correct JSON body', async () => {
    const payload = {
      summary_id: 'sum-001',
      keyword_id: 'kw-001',
      front: 'What is FSRS?',
      back: 'Free Spaced Repetition Scheduler',
      source: 'manual' as const,
    };
    await createFlashcard(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/flashcards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('includes optional fields (subtopic_id, image URLs) in body', async () => {
    const payload = {
      summary_id: 'sum-001',
      keyword_id: 'kw-001',
      front: 'Front text',
      back: 'Back text',
      subtopic_id: 'sub-001',
      front_image_url: 'https://example.com/front.png',
      back_image_url: 'https://example.com/back.png',
    };
    await createFlashcard(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.subtopic_id).toBe('sub-001');
    expect(sentBody.front_image_url).toBe('https://example.com/front.png');
    expect(sentBody.back_image_url).toBe('https://example.com/back.png');
  });

  it('does NOT include student_id or created_by in payload (auto from token)', async () => {
    const payload = {
      summary_id: 'sum-001',
      keyword_id: 'kw-001',
      front: 'Q',
      back: 'A',
    };
    await createFlashcard(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).not.toHaveProperty('student_id');
    expect(sentBody).not.toHaveProperty('created_by');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: updateFlashcard payload contract
// ══════════════════════════════════════════════════════════════

describe('updateFlashcard — payload contract', () => {
  it('sends PUT to /flashcards/:id with partial update body', async () => {
    const data = { front: 'Updated front', back: 'Updated back' };
    await updateFlashcard('fc-100', data);

    expect(mockApiCall).toHaveBeenCalledWith('/flashcards/fc-100', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('can send is_active toggle', async () => {
    await updateFlashcard('fc-100', { is_active: false });

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.is_active).toBe(false);
  });

  it('uses PUT method, not PATCH', async () => {
    await updateFlashcard('fc-100', { front: 'X' });
    const opts = mockApiCall.mock.calls[0][1];
    expect(opts.method).toBe('PUT');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 6: deleteFlashcard URL and method
// ══════════════════════════════════════════════════════════════

describe('deleteFlashcard — URL and method', () => {
  it('sends DELETE to /flashcards/:id', async () => {
    await deleteFlashcard('fc-200');

    expect(mockApiCall).toHaveBeenCalledWith('/flashcards/fc-200', {
      method: 'DELETE',
    });
  });

  it('does not send a request body', async () => {
    await deleteFlashcard('fc-200');
    const opts = mockApiCall.mock.calls[0][1];
    expect(opts.body).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 7: restoreFlashcard URL and method
// ══════════════════════════════════════════════════════════════

describe('restoreFlashcard — URL and method', () => {
  it('sends PUT to /flashcards/:id/restore', async () => {
    await restoreFlashcard('fc-300');

    expect(mockApiCall).toHaveBeenCalledWith('/flashcards/fc-300/restore', {
      method: 'PUT',
    });
  });

  it('does not send a request body', async () => {
    await restoreFlashcard('fc-300');
    const opts = mockApiCall.mock.calls[0][1];
    expect(opts.body).toBeUndefined();
  });
});
