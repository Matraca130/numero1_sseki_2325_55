/**
 * bktApi.test.ts — Tests for the BKT states API service.
 *
 * Covers:
 *   - upsertBktState: POST /bkt-states with serialized body
 *   - getBktStates: query-string assembly for single/batch/limit/offset filters
 *     (including the `offset=0` falsy-skip quirk)
 *   - getAllBktStates: success + graceful fallback to [] on failure
 *
 * NOTE (MASTERY-SYSTEMS.md): BKT p_know is consumed by Sistemas B and C
 * downstream, but THIS file is pure API plumbing — no thresholds are
 * compared against p_know here. We only assert HTTP wiring (method, URL,
 * body). No mastery-system classification happens in bktApi.ts.
 *
 * Mocks: apiCall from @/app/lib/api
 *
 * Run: npx vitest run src/app/services/__tests__/bktApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import {
  upsertBktState,
  getBktStates,
  getAllBktStates,
  type BktState,
  type BktStatePayload,
} from '../bktApi';

const mockApiCall = vi.mocked(apiCall);

// ── Fixtures ──────────────────────────────────────────────

function makePayload(overrides: Partial<BktStatePayload> = {}): BktStatePayload {
  return {
    subtopic_id: 'sub-1',
    p_know: 0.62,
    p_transit: 0.1,
    p_slip: 0.1,
    p_guess: 0.2,
    delta: 0.05,
    total_attempts: 4,
    correct_attempts: 3,
    last_attempt_at: '2026-04-18T10:00:00Z',
    ...overrides,
  };
}

function makeState(overrides: Partial<BktState> = {}): BktState {
  return {
    id: 'bkt-1',
    student_id: 'stu-1',
    subtopic_id: 'sub-1',
    p_know: 0.62,
    p_transit: 0.1,
    p_slip: 0.1,
    p_guess: 0.2,
    delta: 0.05,
    total_attempts: 4,
    correct_attempts: 3,
    last_attempt_at: '2026-04-18T10:00:00Z',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-18T10:00:00Z',
    ...overrides,
  };
}

describe('bktApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────
  // upsertBktState
  // ─────────────────────────────────────────────────────────

  describe('upsertBktState', () => {
    it('calls apiCall with POST /bkt-states', async () => {
      mockApiCall.mockResolvedValueOnce(makeState());
      await upsertBktState(makePayload());
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      const [url, opts] = mockApiCall.mock.calls[0];
      expect(url).toBe('/bkt-states');
      expect(opts).toMatchObject({ method: 'POST' });
    });

    it('serializes the payload as JSON body', async () => {
      mockApiCall.mockResolvedValueOnce(makeState());
      const payload = makePayload({ p_know: 0.91, total_attempts: 10 });
      await upsertBktState(payload);
      const opts = mockApiCall.mock.calls[0][1] as RequestInit;
      expect(typeof opts.body).toBe('string');
      expect(JSON.parse(opts.body as string)).toEqual(payload);
    });

    it('returns the BktState from apiCall', async () => {
      const state = makeState({ p_know: 0.77 });
      mockApiCall.mockResolvedValueOnce(state);
      const result = await upsertBktState(makePayload({ p_know: 0.77 }));
      expect(result).toBe(state);
    });

    it('propagates errors from apiCall', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('network'));
      await expect(upsertBktState(makePayload())).rejects.toThrow('network');
    });

    it('sends extreme p_know values (0 and 1) unchanged', async () => {
      mockApiCall.mockResolvedValue(makeState());
      await upsertBktState(makePayload({ p_know: 0 }));
      await upsertBktState(makePayload({ p_know: 1 }));
      const first = JSON.parse(mockApiCall.mock.calls[0][1]!.body as string);
      const second = JSON.parse(mockApiCall.mock.calls[1][1]!.body as string);
      expect(first.p_know).toBe(0);
      expect(second.p_know).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────
  // getBktStates
  // ─────────────────────────────────────────────────────────

  describe('getBktStates', () => {
    it('calls apiCall with /bkt-states (no query string) when no filters', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates();
      expect(mockApiCall).toHaveBeenCalledWith('/bkt-states');
    });

    it('calls apiCall with /bkt-states (no query string) when filters object is empty', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({});
      expect(mockApiCall).toHaveBeenCalledWith('/bkt-states');
    });

    it('appends subtopic_id as query param', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ subtopic_id: 'sub-42' });
      expect(mockApiCall).toHaveBeenCalledWith('/bkt-states?subtopic_id=sub-42');
    });

    it('appends subtopic_ids as comma-joined list', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ subtopic_ids: ['a', 'b', 'c'] });
      const url = mockApiCall.mock.calls[0][0] as string;
      // URLSearchParams encodes commas as %2C
      expect(url).toBe('/bkt-states?subtopic_ids=a%2Cb%2Cc');
    });

    it('skips subtopic_ids when array is empty', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ subtopic_ids: [] });
      expect(mockApiCall).toHaveBeenCalledWith('/bkt-states');
    });

    it('appends limit when truthy', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ limit: 50 });
      expect(mockApiCall).toHaveBeenCalledWith('/bkt-states?limit=50');
    });

    it('appends offset when truthy', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ offset: 25 });
      expect(mockApiCall).toHaveBeenCalledWith('/bkt-states?offset=25');
    });

    it('skips offset=0 because the guard uses falsy check', async () => {
      // Documented quirk: `if (filters?.offset)` means 0 is treated as absent.
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ offset: 0, limit: 100 });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('limit=100');
      expect(url).not.toContain('offset=');
    });

    it('skips limit=0 because the guard uses falsy check', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ limit: 0, subtopic_id: 'x' });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('subtopic_id=x');
      expect(url).not.toContain('limit=');
    });

    it('combines subtopic_ids + limit + offset in one URL', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getBktStates({ subtopic_ids: ['u1', 'u2'], limit: 200, offset: 10 });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('subtopic_ids=u1%2Cu2');
      expect(url).toContain('limit=200');
      expect(url).toContain('offset=10');
    });

    it('returns the array of BktState records', async () => {
      const states = [makeState(), makeState({ id: 'bkt-2', subtopic_id: 'sub-2' })];
      mockApiCall.mockResolvedValueOnce(states);
      const result = await getBktStates({ subtopic_id: 'sub-1' });
      expect(result).toBe(states);
      expect(result.length).toBe(2);
    });

    it('propagates errors from apiCall', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('boom'));
      await expect(getBktStates({ subtopic_id: 'x' })).rejects.toThrow('boom');
    });

    it('handles undefined filters argument identically to empty object', async () => {
      mockApiCall.mockResolvedValue([]);
      await getBktStates();
      await getBktStates({});
      expect(mockApiCall.mock.calls[0][0]).toBe('/bkt-states');
      expect(mockApiCall.mock.calls[1][0]).toBe('/bkt-states');
    });
  });

  // ─────────────────────────────────────────────────────────
  // getAllBktStates
  // ─────────────────────────────────────────────────────────

  describe('getAllBktStates', () => {
    it('calls apiCall with /bkt-states?limit=1000', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getAllBktStates();
      expect(mockApiCall).toHaveBeenCalledWith('/bkt-states?limit=1000');
    });

    it('returns the array on success', async () => {
      const states = [makeState(), makeState({ id: 'bkt-2' })];
      mockApiCall.mockResolvedValueOnce(states);
      const result = await getAllBktStates();
      expect(result).toEqual(states);
    });

    it('returns [] on apiCall failure (graceful degradation)', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('network down'));
      const result = await getAllBktStates();
      expect(result).toEqual([]);
    });

    it('returns [] when apiCall rejects with non-Error value', async () => {
      mockApiCall.mockRejectedValueOnce('string-error');
      const result = await getAllBktStates();
      expect(result).toEqual([]);
    });

    it('does NOT throw when the backend errors — callers treat as zero data', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('500'));
      await expect(getAllBktStates()).resolves.toEqual([]);
    });
  });
});
