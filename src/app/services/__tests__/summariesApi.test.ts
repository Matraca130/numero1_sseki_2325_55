/**
 * summariesApi.test.ts — Tests for summaries API service layer
 *
 * Coverage: summaries CRUD, keywords CRUD, subtopics CRUD, videos CRUD,
 *           chunks CRUD, reorder, summary blocks
 * Mocks: apiCall, extractItems
 *
 * Run: npx vitest run src/app/services/__tests__/summariesApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({ apiCall: vi.fn() }));
vi.mock('@/app/lib/api-helpers', () => ({
  extractItems: vi.fn((data: any) => data?.items ?? []),
}));

import { apiCall } from '@/app/lib/api';
const mock = vi.mocked(apiCall);

import {
  getSummaries, getSummary, createSummary, updateSummary, deleteSummary, restoreSummary,
  getKeywords, createKeyword, updateKeyword, deleteKeyword, restoreKeyword,
  getSubtopics, createSubtopic, updateSubtopic, deleteSubtopic,
  getVideos, createVideo, updateVideo, deleteVideo,
  getChunks, createChunk, updateChunk, deleteChunk,
  reorder,
  getSummaryBlocks, fetchSummaryBlocks, createSummaryBlock, updateSummaryBlock, deleteSummaryBlock,
} from '../summariesApi';

beforeEach(() => vi.clearAllMocks());

// ── Summaries ──

describe('summaries CRUD', () => {
  it('getSummaries calls with topic_id', async () => {
    mock.mockResolvedValueOnce({ items: [], total: 0 });
    await getSummaries('t1');
    expect(mock).toHaveBeenCalledWith('/summaries?topic_id=t1');
  });

  it('getSummary calls with id', async () => {
    mock.mockResolvedValueOnce({ id: 's1' });
    await getSummary('s1');
    expect(mock).toHaveBeenCalledWith('/summaries/s1');
  });

  it('createSummary sends POST with body', async () => {
    mock.mockResolvedValueOnce({ id: 's-new' });
    await createSummary({ topic_id: 't1', title: 'Test' });
    expect(mock).toHaveBeenCalledWith('/summaries', {
      method: 'POST',
      body: JSON.stringify({ topic_id: 't1', title: 'Test' }),
    });
  });

  it('updateSummary sends PUT', async () => {
    mock.mockResolvedValueOnce({ id: 's1' });
    await updateSummary('s1', { title: 'Updated' });
    expect(mock).toHaveBeenCalledWith('/summaries/s1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
    });
  });

  it('deleteSummary sends DELETE', async () => {
    mock.mockResolvedValueOnce(undefined);
    await deleteSummary('s1');
    expect(mock).toHaveBeenCalledWith('/summaries/s1', { method: 'DELETE' });
  });

  it('restoreSummary sends PUT /restore', async () => {
    mock.mockResolvedValueOnce({ id: 's1' });
    await restoreSummary('s1');
    expect(mock).toHaveBeenCalledWith('/summaries/s1/restore', { method: 'PUT' });
  });
});

// ── Keywords ──

describe('keywords CRUD', () => {
  it('getKeywords calls with summary_id', async () => {
    mock.mockResolvedValueOnce({ items: [] });
    await getKeywords('s1');
    expect(mock).toHaveBeenCalledWith('/keywords?summary_id=s1');
  });

  it('createKeyword sends POST', async () => {
    mock.mockResolvedValueOnce({ id: 'k1' });
    await createKeyword({ summary_id: 's1', name: 'Test KW' });
    expect(mock).toHaveBeenCalledWith('/keywords', expect.objectContaining({ method: 'POST' }));
  });

  it('updateKeyword sends PUT', async () => {
    mock.mockResolvedValueOnce({ id: 'k1' });
    await updateKeyword('k1', { name: 'Updated' });
    expect(mock).toHaveBeenCalledWith('/keywords/k1', expect.objectContaining({ method: 'PUT' }));
  });

  it('deleteKeyword sends DELETE', async () => {
    mock.mockResolvedValueOnce(undefined);
    await deleteKeyword('k1');
    expect(mock).toHaveBeenCalledWith('/keywords/k1', { method: 'DELETE' });
  });

  it('restoreKeyword sends PUT /restore', async () => {
    mock.mockResolvedValueOnce({ id: 'k1' });
    await restoreKeyword('k1');
    expect(mock).toHaveBeenCalledWith('/keywords/k1/restore', { method: 'PUT' });
  });
});

// ── Subtopics ──

describe('subtopics CRUD', () => {
  it('getSubtopics calls with keyword_id', async () => {
    mock.mockResolvedValueOnce({ items: [] });
    await getSubtopics('k1');
    expect(mock).toHaveBeenCalledWith('/subtopics?keyword_id=k1');
  });

  it('createSubtopic sends POST', async () => {
    mock.mockResolvedValueOnce({ id: 'sub1' });
    await createSubtopic({ keyword_id: 'k1', name: 'Sub' });
    expect(mock).toHaveBeenCalledWith('/subtopics', expect.objectContaining({ method: 'POST' }));
  });

  it('updateSubtopic sends PUT', async () => {
    mock.mockResolvedValueOnce({ id: 'sub1' });
    await updateSubtopic('sub1', { name: 'Updated' });
    expect(mock).toHaveBeenCalledWith('/subtopics/sub1', expect.objectContaining({ method: 'PUT' }));
  });

  it('deleteSubtopic sends DELETE', async () => {
    mock.mockResolvedValueOnce(undefined);
    await deleteSubtopic('sub1');
    expect(mock).toHaveBeenCalledWith('/subtopics/sub1', { method: 'DELETE' });
  });
});

// ── Videos ──

describe('videos CRUD', () => {
  it('getVideos calls with summary_id', async () => {
    mock.mockResolvedValueOnce({ items: [] });
    await getVideos('s1');
    expect(mock).toHaveBeenCalledWith('/videos?summary_id=s1');
  });

  it('createVideo sends POST', async () => {
    mock.mockResolvedValueOnce({ id: 'v1' });
    await createVideo({ summary_id: 's1', title: 'Video', url: 'https://test.com' });
    expect(mock).toHaveBeenCalledWith('/videos', expect.objectContaining({ method: 'POST' }));
  });

  it('updateVideo sends PUT', async () => {
    mock.mockResolvedValueOnce({ id: 'v1' });
    await updateVideo('v1', { title: 'Updated' });
    expect(mock).toHaveBeenCalledWith('/videos/v1', expect.objectContaining({ method: 'PUT' }));
  });

  it('deleteVideo sends DELETE', async () => {
    mock.mockResolvedValueOnce(undefined);
    await deleteVideo('v1');
    expect(mock).toHaveBeenCalledWith('/videos/v1', { method: 'DELETE' });
  });
});

// ── Chunks ──

describe('chunks CRUD', () => {
  it('getChunks calls with summary_id', async () => {
    mock.mockResolvedValueOnce({ items: [] });
    await getChunks('s1');
    expect(mock).toHaveBeenCalledWith('/chunks?summary_id=s1');
  });

  it('createChunk sends POST', async () => {
    mock.mockResolvedValueOnce({ id: 'ch1' });
    await createChunk({ summary_id: 's1', content: 'text' });
    expect(mock).toHaveBeenCalledWith('/chunks', expect.objectContaining({ method: 'POST' }));
  });

  it('updateChunk sends PUT', async () => {
    mock.mockResolvedValueOnce({ id: 'ch1' });
    await updateChunk('ch1', { content: 'updated' });
    expect(mock).toHaveBeenCalledWith('/chunks/ch1', expect.objectContaining({ method: 'PUT' }));
  });

  it('deleteChunk sends DELETE', async () => {
    mock.mockResolvedValueOnce(undefined);
    await deleteChunk('ch1');
    expect(mock).toHaveBeenCalledWith('/chunks/ch1', { method: 'DELETE' });
  });
});

// ── Reorder ──

describe('reorder', () => {
  it('sends PUT /reorder with table and items', async () => {
    mock.mockResolvedValueOnce(undefined);
    await reorder('summaries', [{ id: 's1', order_index: 0 }, { id: 's2', order_index: 1 }]);
    expect(mock).toHaveBeenCalledWith('/reorder', {
      method: 'PUT',
      body: JSON.stringify({
        table: 'summaries',
        items: [{ id: 's1', order_index: 0 }, { id: 's2', order_index: 1 }],
      }),
    });
  });
});

// ── Summary Blocks ──

describe('summary blocks', () => {
  it('getSummaryBlocks calls with summary_id', async () => {
    mock.mockResolvedValueOnce({ items: [] });
    await getSummaryBlocks('s1');
    expect(mock).toHaveBeenCalledWith('/summary-blocks?summary_id=s1');
  });

  it('fetchSummaryBlocks extracts items array', async () => {
    mock.mockResolvedValueOnce({ items: [{ id: 'b1' }], count: 1 });
    const result = await fetchSummaryBlocks('s1');
    expect(result).toEqual([{ id: 'b1' }]);
  });

  it('createSummaryBlock sends POST', async () => {
    mock.mockResolvedValueOnce({ id: 'b1' });
    await createSummaryBlock({ summary_id: 's1', type: 'prose', content: { text: 'hello' } });
    expect(mock).toHaveBeenCalledWith('/summary-blocks', expect.objectContaining({ method: 'POST' }));
  });

  it('updateSummaryBlock sends PUT', async () => {
    mock.mockResolvedValueOnce({ id: 'b1' });
    await updateSummaryBlock('b1', { content: { text: 'updated' } });
    expect(mock).toHaveBeenCalledWith('/summary-blocks/b1', expect.objectContaining({ method: 'PUT' }));
  });

  it('deleteSummaryBlock sends DELETE', async () => {
    mock.mockResolvedValueOnce(undefined);
    await deleteSummaryBlock('b1');
    expect(mock).toHaveBeenCalledWith('/summary-blocks/b1', { method: 'DELETE' });
  });
});
