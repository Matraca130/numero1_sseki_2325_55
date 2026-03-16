// ============================================================
// TEST: models3dApi batch error detection (C7 migration)
//
// After C7 migration, models3dApi.ts uses:
//   - apiCall() from lib/api.ts for ALL requests (batch + per-topic)
//   - Error message regex /\b(404|405)\b/ for status detection
//     (apiCall throws plain Error, not ApiError)
//
// Scenarios:
//   1. Batch uses apiCall (single request function)
//   2. Error with '404' → marks batch as unavailable, falls back
//   3. Error with '405' → same behavior as 404
//   4. Error with '500' → does NOT mark batch unavailable (transient)
//   5. Plain Error without status code → does NOT mark unavailable
//   6. REGRESSION: '404' in message with non-404 context → detected
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock apiCall BEFORE importing the module under test ──
// vi.hoisted() ensures the variable is declared before vi.mock()
// runs (vi.mock is hoisted to file top by Vitest).

const { mockApiCall } = vi.hoisted(() => ({
  mockApiCall: vi.fn(),
}));

vi.mock('@/app/lib/api', () => ({
  apiCall: mockApiCall,
}));

// Mock logger to suppress output during tests
vi.mock('@/app/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Import AFTER mocks are set up ──

import { getModels3DBatch, invalidateModelsCache } from '../models3dApi';

// ── Date.now management ──
// The module uses BATCH_UNAVAIL_TTL_MS = 10 * 60 * 1000 (600_000 ms).
const BATCH_TTL_MS = 10 * 60 * 1000;
let fakeNow = 1_000_000;

describe('getModels3DBatch — C7 error detection (regex-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateModelsCache();

    // Advance time past the TTL so any previous _batchEndpointUnavailable resets
    fakeNow += BATCH_TTL_MS + 1;
    vi.spyOn(Date, 'now').mockReturnValue(fakeNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use apiCall for the batch endpoint', async () => {
    // First call = batch endpoint
    mockApiCall.mockResolvedValueOnce({
      'topic-1': [{ id: 'm1', title: 'Model 1' }],
      'topic-2': [],
    });

    const result = await getModels3DBatch(['topic-1', 'topic-2']);

    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenCalledWith(
      expect.stringContaining('/models-3d/batch?topic_ids='),
    );
    expect(result['topic-1']).toHaveLength(1);
    expect(result['topic-2']).toHaveLength(0);
  });

  it('should detect 404 via message regex and fall back to per-topic', async () => {
    // apiCall throws plain Error with status in message
    mockApiCall.mockRejectedValueOnce(new Error('API Error 404'));

    // Fallback per-topic calls
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    const result = await getModels3DBatch(['topic-a', 'topic-b']);

    // First call was batch (rejected), then 2 per-topic calls
    expect(mockApiCall).toHaveBeenCalledTimes(3);
    expect(result).toHaveProperty('topic-a');
    expect(result).toHaveProperty('topic-b');
  });

  it('should detect 405 via message regex and fall back', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('API Error 405'));
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['topic-x', 'topic-y']);

    // 1 batch (rejected) + 2 per-topic
    expect(mockApiCall).toHaveBeenCalledTimes(3);
  });

  it('should NOT mark batch unavailable for 500 errors (transient)', async () => {
    // First call: 500 error (transient)
    mockApiCall.mockRejectedValueOnce(new Error('API Error 500'));
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['t1', 't2']);

    // Second call: should TRY batch again (flag NOT set for 500)
    invalidateModelsCache();
    mockApiCall.mockReset();
    mockApiCall.mockResolvedValueOnce({ 't1': [], 't2': [] });

    await getModels3DBatch(['t1', 't2']);

    // apiCall called once for batch (succeeded on retry)
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('should NOT mark batch unavailable for plain Error without status', async () => {
    // Network error — no status code in message
    mockApiCall.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['t1', 't2']);

    // Second call: should try batch again
    invalidateModelsCache();
    mockApiCall.mockReset();
    mockApiCall.mockResolvedValueOnce({ 't1': [], 't2': [] });

    await getModels3DBatch(['t1', 't2']);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('REGRESSION: should detect 404 in error message even with other context', async () => {
    // Message contains '404' as a word boundary match
    mockApiCall.mockRejectedValueOnce(
      new Error('Proxy returned 404 while routing to upstream'),
    );
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['t1', 't2']);

    // Batch WAS marked unavailable (404 detected in message)
    invalidateModelsCache();
    mockApiCall.mockReset();
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['t1', 't2']);

    // Should have fallen back to per-topic (batch still marked unavailable within TTL)
    expect(mockApiCall).toHaveBeenCalledTimes(2); // 2 per-topic, no batch attempt
  });
});
