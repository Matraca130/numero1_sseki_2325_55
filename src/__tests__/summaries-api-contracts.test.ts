// ============================================================
// Summaries API Contract Guards — Axon
//
// PURPOSE: Verify API functions construct correct URLs and
// payloads without making real network requests.
//
// GUARDS AGAINST:
//   - URL construction bugs (query params, paths)
//   - Flat routes with query params (no REST nesting)
//   - Payload shape changes that break backend contract
//   - Method mismatches (GET/POST/PUT/DELETE)
//
// APPROACH: Mock apiCall() and inspect what URL/options were passed.
//
// RUN: npx vitest run src/__tests__/summaries-api-contracts.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing API modules ────────────
const mockApiCall = vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import {
  getSummaries,
  getSummary,
  createSummary,
  updateSummary,
  deleteSummary,
  restoreSummary,
  getChunks,
  createChunk,
  updateChunk,
  deleteChunk,
  getKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  restoreKeyword,
  getSubtopics,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
  getVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  reorder,
  getSummaryBlocks,
  fetchSummaryBlocks,
  createSummaryBlock,
  updateSummaryBlock,
  deleteSummaryBlock,
} from '@/app/services/summariesApi';

beforeEach(() => {
  mockApiCall.mockClear();
});

// ══════════════════════════════════════════════════════════════
// SUITE 1: Summaries CRUD
// ══════════════════════════════════════════════════════════════

describe('getSummaries — URL construction', () => {
  it('uses flat /summaries route with topic_id query param', async () => {
    await getSummaries('topic-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/summaries?topic_id=topic-123');
  });

  it('is called with no options (GET by default)', async () => {
    await getSummaries('topic-123');
    expect(mockApiCall).toHaveBeenCalledWith('/summaries?topic_id=topic-123');
  });
});

describe('getSummary — URL construction', () => {
  it('uses /summaries/:id path', async () => {
    await getSummary('sum-456');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/summaries/sum-456');
  });

  it('is called with no options (GET by default)', async () => {
    await getSummary('sum-456');
    expect(mockApiCall).toHaveBeenCalledWith('/summaries/sum-456');
  });
});

describe('createSummary — payload contract', () => {
  it('sends POST to /summaries with correct JSON body', async () => {
    const payload = {
      topic_id: 'topic-123',
      title: 'Test Summary',
      content_markdown: '# Hello',
      status: 'draft' as const,
      order_index: 0,
    };
    await createSummary(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/summaries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('works with minimal payload (only topic_id required)', async () => {
    const payload = { topic_id: 'topic-789' };
    await createSummary(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toEqual({ topic_id: 'topic-789' });
  });
});

describe('updateSummary — payload contract', () => {
  it('sends PUT to /summaries/:id with correct JSON body', async () => {
    const data = { title: 'Updated Title', status: 'published' as const };
    await updateSummary('sum-123', data);

    expect(mockApiCall).toHaveBeenCalledWith('/summaries/sum-123', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('includes is_active when provided', async () => {
    const data = { is_active: false };
    await updateSummary('sum-123', data);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toHaveProperty('is_active', false);
  });
});

describe('deleteSummary — request contract', () => {
  it('sends DELETE to /summaries/:id', async () => {
    await deleteSummary('sum-123');

    expect(mockApiCall).toHaveBeenCalledWith('/summaries/sum-123', {
      method: 'DELETE',
    });
  });
});

describe('restoreSummary — request contract', () => {
  it('sends PUT to /summaries/:id/restore', async () => {
    await restoreSummary('sum-123');

    expect(mockApiCall).toHaveBeenCalledWith('/summaries/sum-123/restore', {
      method: 'PUT',
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: Chunks CRUD
// ══════════════════════════════════════════════════════════════

describe('getChunks — URL construction', () => {
  it('uses flat /chunks route with summary_id query param', async () => {
    await getChunks('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/chunks?summary_id=sum-123');
  });
});

describe('createChunk — payload contract', () => {
  it('sends POST to /chunks with correct JSON body', async () => {
    const payload = {
      summary_id: 'sum-123',
      content: 'Chunk content here',
      order_index: 2,
      metadata: { source: 'test' },
    };
    await createChunk(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/chunks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('works with minimal payload (summary_id + content)', async () => {
    const payload = { summary_id: 'sum-123', content: 'Hello' };
    await createChunk(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toEqual({ summary_id: 'sum-123', content: 'Hello' });
  });
});

describe('updateChunk — payload contract', () => {
  it('sends PUT to /chunks/:id with correct JSON body', async () => {
    const data = { content: 'Updated content', order_index: 5 };
    await updateChunk('chunk-001', data);

    expect(mockApiCall).toHaveBeenCalledWith('/chunks/chunk-001', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteChunk — request contract', () => {
  it('sends DELETE to /chunks/:id', async () => {
    await deleteChunk('chunk-001');

    expect(mockApiCall).toHaveBeenCalledWith('/chunks/chunk-001', {
      method: 'DELETE',
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: Keywords CRUD
// ══════════════════════════════════════════════════════════════

describe('getKeywords — URL construction', () => {
  it('uses flat /keywords route with summary_id query param', async () => {
    await getKeywords('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/keywords?summary_id=sum-123');
  });
});

describe('createKeyword — payload contract', () => {
  it('sends POST to /keywords with correct JSON body', async () => {
    const payload = {
      summary_id: 'sum-123',
      name: 'Mitochondria',
      definition: 'Powerhouse of the cell',
      priority: 1,
    };
    await createKeyword(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/keywords', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('works with minimal payload (summary_id + name)', async () => {
    const payload = { summary_id: 'sum-123', name: 'ATP' };
    await createKeyword(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toEqual({ summary_id: 'sum-123', name: 'ATP' });
  });
});

describe('updateKeyword — payload contract', () => {
  it('sends PUT to /keywords/:id with correct JSON body', async () => {
    const data = { name: 'Updated Name', definition: 'New def', priority: 2 };
    await updateKeyword('kw-001', data);

    expect(mockApiCall).toHaveBeenCalledWith('/keywords/kw-001', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('includes is_active when provided', async () => {
    const data = { is_active: false };
    await updateKeyword('kw-001', data);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toHaveProperty('is_active', false);
  });
});

describe('deleteKeyword — request contract', () => {
  it('sends DELETE to /keywords/:id', async () => {
    await deleteKeyword('kw-001');

    expect(mockApiCall).toHaveBeenCalledWith('/keywords/kw-001', {
      method: 'DELETE',
    });
  });
});

describe('restoreKeyword — request contract', () => {
  it('sends PUT to /keywords/:id/restore', async () => {
    await restoreKeyword('kw-001');

    expect(mockApiCall).toHaveBeenCalledWith('/keywords/kw-001/restore', {
      method: 'PUT',
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: Subtopics CRUD
// ══════════════════════════════════════════════════════════════

describe('getSubtopics — URL construction', () => {
  it('uses flat /subtopics route with keyword_id query param', async () => {
    await getSubtopics('kw-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/subtopics?keyword_id=kw-123');
  });
});

describe('createSubtopic — payload contract', () => {
  it('sends POST to /subtopics with correct JSON body', async () => {
    const payload = {
      keyword_id: 'kw-123',
      name: 'Oxidative Phosphorylation',
      order_index: 1,
    };
    await createSubtopic(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/subtopics', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('works with minimal payload (keyword_id + name)', async () => {
    const payload = { keyword_id: 'kw-123', name: 'Glycolysis' };
    await createSubtopic(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toEqual({ keyword_id: 'kw-123', name: 'Glycolysis' });
  });
});

describe('updateSubtopic — payload contract', () => {
  it('sends PUT to /subtopics/:id with correct JSON body', async () => {
    const data = { name: 'Updated Subtopic', order_index: 3, is_active: true };
    await updateSubtopic('sub-001', data);

    expect(mockApiCall).toHaveBeenCalledWith('/subtopics/sub-001', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteSubtopic — request contract', () => {
  it('sends DELETE to /subtopics/:id', async () => {
    await deleteSubtopic('sub-001');

    expect(mockApiCall).toHaveBeenCalledWith('/subtopics/sub-001', {
      method: 'DELETE',
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: Videos CRUD
// ══════════════════════════════════════════════════════════════

describe('getVideos — URL construction', () => {
  it('uses flat /videos route with summary_id query param', async () => {
    await getVideos('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/videos?summary_id=sum-123');
  });
});

describe('createVideo — payload contract', () => {
  it('sends POST to /videos with correct JSON body', async () => {
    const payload = {
      summary_id: 'sum-123',
      title: 'Intro Video',
      url: 'https://example.com/video.mp4',
      platform: 'mux',
      duration_seconds: 120,
      order_index: 0,
    };
    await createVideo(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/videos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('works with minimal payload (summary_id + title + url)', async () => {
    const payload = { summary_id: 'sum-123', title: 'Test', url: 'https://example.com/v.mp4' };
    await createVideo(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toEqual({
      summary_id: 'sum-123',
      title: 'Test',
      url: 'https://example.com/v.mp4',
    });
  });
});

describe('updateVideo — payload contract', () => {
  it('sends PUT to /videos/:id with correct JSON body', async () => {
    const data = { title: 'Updated Video', duration_seconds: 300 };
    await updateVideo('vid-001', data);

    expect(mockApiCall).toHaveBeenCalledWith('/videos/vid-001', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('includes is_active when provided', async () => {
    const data = { is_active: false };
    await updateVideo('vid-001', data);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toHaveProperty('is_active', false);
  });
});

describe('deleteVideo — request contract', () => {
  it('sends DELETE to /videos/:id', async () => {
    await deleteVideo('vid-001');

    expect(mockApiCall).toHaveBeenCalledWith('/videos/vid-001', {
      method: 'DELETE',
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 6: Reorder
// ══════════════════════════════════════════════════════════════

describe('reorder — payload contract', () => {
  it('sends PUT to /reorder with table and items', async () => {
    const items = [
      { id: 'a', order_index: 0 },
      { id: 'b', order_index: 1 },
    ];
    await reorder('summaries', items);

    expect(mockApiCall).toHaveBeenCalledWith('/reorder', {
      method: 'PUT',
      body: JSON.stringify({ table: 'summaries', items }),
    });
  });

  it('supports all valid table names', async () => {
    const tables = ['summaries', 'chunks', 'subtopics', 'videos', 'summary_blocks'] as const;
    for (const table of tables) {
      mockApiCall.mockClear();
      await reorder(table, [{ id: 'x', order_index: 0 }]);

      const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
      expect(sentBody.table).toBe(table);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 7: Summary Blocks CRUD
// ══════════════════════════════════════════════════════════════

describe('getSummaryBlocks — URL construction', () => {
  it('uses flat /summary-blocks route with summary_id query param', async () => {
    await getSummaryBlocks('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/summary-blocks?summary_id=sum-123');
  });
});

describe('fetchSummaryBlocks — URL construction', () => {
  it('uses same /summary-blocks route with summary_id query param', async () => {
    await fetchSummaryBlocks('sum-456');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/summary-blocks?summary_id=sum-456');
  });
});

describe('createSummaryBlock — payload contract', () => {
  it('sends POST to /summary-blocks with correct JSON body', async () => {
    const payload = {
      summary_id: 'sum-123',
      type: 'prose',
      content: { text: 'Hello world' },
      order_index: 0,
    };
    await createSummaryBlock(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/summary-blocks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('works with minimal payload (summary_id + type + content)', async () => {
    const payload = { summary_id: 'sum-123', type: 'key_point', content: { title: 'Important' } };
    await createSummaryBlock(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toEqual({
      summary_id: 'sum-123',
      type: 'key_point',
      content: { title: 'Important' },
    });
  });
});

describe('updateSummaryBlock — payload contract', () => {
  it('sends PUT to /summary-blocks/:id with correct JSON body', async () => {
    const data = { content: { text: 'Updated' }, order_index: 3 };
    await updateSummaryBlock('blk-001', data);

    expect(mockApiCall).toHaveBeenCalledWith('/summary-blocks/blk-001', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('includes style and metadata when provided', async () => {
    const data = {
      style: { backgroundColor: '#fff' },
      metadata: { version: 2 },
    };
    await updateSummaryBlock('blk-001', data);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).toHaveProperty('style', { backgroundColor: '#fff' });
    expect(sentBody).toHaveProperty('metadata', { version: 2 });
  });
});

describe('deleteSummaryBlock — request contract', () => {
  it('sends DELETE to /summary-blocks/:id', async () => {
    await deleteSummaryBlock('blk-001');

    expect(mockApiCall).toHaveBeenCalledWith('/summary-blocks/blk-001', {
      method: 'DELETE',
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 8: Edge cases — empty/special IDs
// ══════════════════════════════════════════════════════════════

describe('Edge cases — special characters in IDs', () => {
  it('handles UUID-style IDs correctly', async () => {
    await getSummary('550e8400-e29b-41d4-a716-446655440000');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/summaries/550e8400-e29b-41d4-a716-446655440000');
  });

  it('passes through whatever ID is given without encoding', async () => {
    await deleteSummary('abc-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/summaries/abc-123');
  });
});

describe('Edge cases — empty body fields', () => {
  it('createSummary sends empty optional fields when provided', async () => {
    const payload = { topic_id: 'topic-1', title: '', content_markdown: '' };
    await createSummary(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.title).toBe('');
    expect(sentBody.content_markdown).toBe('');
  });

  it('updateChunk sends metadata as empty object when provided', async () => {
    const data = { metadata: {} };
    await updateChunk('chunk-1', data);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.metadata).toEqual({});
  });
});
