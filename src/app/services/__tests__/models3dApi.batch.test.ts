// ============================================================
// TEST: 3DP-3 — Batch error detection via instanceof ApiError
//
// Verifies that getModels3DBatch uses type-safe error detection
// (instanceof ApiError + err.status) instead of fragile string
// matching (errMsg.includes('404')).
//
// IMPORTANT: models3dApi.ts has module-level flags
// (_batchEndpointUnavailable, _batchDisabledAt) that persist across
// calls. We mock Date.now to advance past the TTL (10 min) in
// beforeEach so the flag resets before each test.
//
// Scenarios:
//   1. Batch uses realRequest (not apiCall)
//   2. ApiError 404 → marks batch as unavailable, falls back
//   3. ApiError 405 → same behavior as 404
//   4. ApiError 500 → does NOT mark batch unavailable (transient)
//   5. Plain Error → does NOT mark batch unavailable
//   6. ApiError with '404' in message but status 500 → NOT marked
//      (key regression the old string matching would fail)
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock modules BEFORE importing the module under test ──

// Mock apiCall (used by getModels3D for per-topic fallback)
vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

// Mock realRequest (used by batch endpoint after our fix)
vi.mock('@/app/services/apiConfig', () => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.status = status;
    }
  }
  return {
    realRequest: vi.fn(),
    ApiError,
  };
});

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
import { apiCall } from '@/app/lib/api';
import { realRequest, ApiError } from '@/app/services/apiConfig';

const mockApiCall = vi.mocked(apiCall);
const mockRealRequest = vi.mocked(realRequest);

// ── Date.now management ──
// The module uses BATCH_UNAVAIL_TTL_MS = 10 * 60 * 1000 (600_000 ms).
// We advance time past the TTL in beforeEach so the _batchEndpointUnavailable
// flag resets before each test (it checks Date.now() - _batchDisabledAt > TTL).
const BATCH_TTL_MS = 10 * 60 * 1000;
let fakeNow = 1_000_000; // Starting fake timestamp

describe('getModels3DBatch — 3DP-3 error detection', () => {
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

  it('should use realRequest (not apiCall) for the batch endpoint', async () => {
    mockRealRequest.mockResolvedValueOnce({
      'topic-1': [{ id: 'm1', title: 'Model 1' }],
      'topic-2': [],
    });

    const result = await getModels3DBatch(['topic-1', 'topic-2']);

    // Verify realRequest was called (not apiCall) for batch
    expect(mockRealRequest).toHaveBeenCalledTimes(1);
    expect(mockRealRequest).toHaveBeenCalledWith(
      expect.stringContaining('/models-3d/batch?topic_ids='),
    );
    // apiCall should NOT have been called (batch succeeded)
    expect(mockApiCall).not.toHaveBeenCalled();
    expect(result['topic-1']).toHaveLength(1);
    expect(result['topic-2']).toHaveLength(0);
  });

  it('should detect 404 via instanceof ApiError and fall back to per-topic', async () => {
    const error404 = new ApiError('Not Found', 'API_ERROR', 404);
    mockRealRequest.mockRejectedValueOnce(error404);

    // Fallback per-topic calls via apiCall
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    const result = await getModels3DBatch(['topic-a', 'topic-b']);

    // Should have fallen back to per-topic calls
    expect(mockApiCall).toHaveBeenCalled();
    expect(result).toHaveProperty('topic-a');
    expect(result).toHaveProperty('topic-b');
  });

  it('should detect 405 via instanceof ApiError and fall back', async () => {
    const error405 = new ApiError('Method Not Allowed', 'API_ERROR', 405);
    mockRealRequest.mockRejectedValueOnce(error405);
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['topic-x', 'topic-y']);

    expect(mockRealRequest).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenCalled();
  });

  it('should NOT mark batch unavailable for 500 errors (transient)', async () => {
    // First call: 500 error (transient — should NOT permanently disable)
    const error500 = new ApiError('Internal Server Error', 'API_ERROR', 500);
    mockRealRequest.mockRejectedValueOnce(error500);
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['t1', 't2']);

    // Second call: should TRY batch again (flag NOT set)
    // No need to advance time — 500 should not have set the flag at all
    invalidateModelsCache();
    mockRealRequest.mockResolvedValueOnce({ 't1': [], 't2': [] });

    await getModels3DBatch(['t1', 't2']);

    // realRequest called TWICE: once failed with 500, once retry succeeded
    expect(mockRealRequest).toHaveBeenCalledTimes(2);
  });

  it('should NOT mark batch unavailable for plain Error (non-ApiError)', async () => {
    // Plain Error (e.g., network error) — should NOT permanently disable batch
    mockRealRequest.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['t1', 't2']);

    // Second call: should try batch again
    invalidateModelsCache();
    mockRealRequest.mockResolvedValueOnce({ 't1': [], 't2': [] });

    await getModels3DBatch(['t1', 't2']);
    expect(mockRealRequest).toHaveBeenCalledTimes(2);
  });

  it('REGRESSION: should NOT be fooled by "404" in message when status is 500', async () => {
    // This is the KEY regression test.
    // Old code: errMsg.includes('404') → would match this message → WRONG
    // New code: err instanceof ApiError && err.status === 404 → correctly ignores
    const trickyError = new ApiError(
      'Proxy returned 404 while routing to upstream',
      'API_ERROR',
      500, // actual status is 500, NOT 404!
    );
    mockRealRequest.mockRejectedValueOnce(trickyError);
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    await getModels3DBatch(['t1', 't2']);

    // Should NOT have marked batch as permanently unavailable
    invalidateModelsCache();
    mockRealRequest.mockResolvedValueOnce({ 't1': [], 't2': [] });

    await getModels3DBatch(['t1', 't2']);

    // With old string matching: realRequest called only 1 time (batch skipped on 2nd call)
    // With instanceof ApiError: realRequest called 2 times (correctly retries)
    expect(mockRealRequest).toHaveBeenCalledTimes(2);
  });
});
