/**
 * smartGenerateApi.test.ts — Tests for the smart (adaptive) quiz generation API.
 *
 * Covers:
 *   - generateSmartQuiz: POST /ai/generate-smart with serialized params
 *   - Signal plumbing: passes an AbortSignal to apiCall
 *   - Timeout path: AbortError surfaces as a descriptive timeout message
 *   - Error propagation: non-abort errors are rethrown as-is
 *   - Timer cleanup: setTimeout is cleared in success and error paths
 *
 * NOTE (MASTERY-SYSTEMS.md): `_smart.p_know` returned by this endpoint is a
 * BKT signal used by the backend to pick weakest subtopics. This test file
 * never compares p_know against thresholds — it asserts HTTP wiring and
 * timeout behaviour only. Consumers that render color codes belong to
 * Sistemas B/C and live elsewhere.
 *
 * Mocks: apiCall from @/app/lib/api
 *
 * Run: npx vitest run src/app/services/__tests__/smartGenerateApi.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import {
  generateSmartQuiz,
  type SmartGenerateParams,
  type SmartGenerateResponse,
} from '../smartGenerateApi';

const mockApiCall = vi.mocked(apiCall);

// ── Fixtures ──────────────────────────────────────────────

function makeResponse(overrides: Partial<SmartGenerateResponse> = {}): SmartGenerateResponse {
  return {
    items: [
      {
        type: 'quiz_question',
        id: 'q-1',
        keyword_id: 'kw-1',
        keyword_name: 'Cardio',
        summary_id: 'sum-1',
        _smart: {
          p_know: 0.4,
          need_score: 0.8,
          primary_reason: 'low_mastery',
          target_subtopic: 'sub-1',
        },
      },
    ],
    errors: [],
    _meta: {
      model: 'gpt-4',
      action: 'quiz_question',
      summary_id: 'sum-1',
      quiz_id: 'qz-1',
      total_attempted: 1,
      total_generated: 1,
      total_failed: 0,
      total_targets_available: 5,
    },
    ...overrides,
  };
}

function makeParams(overrides: Partial<SmartGenerateParams> = {}): SmartGenerateParams {
  return {
    action: 'quiz_question',
    summary_id: 'sum-1',
    count: 3,
    ...overrides,
  };
}

describe('smartGenerateApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────
  // Happy path
  // ─────────────────────────────────────────────────────────

  describe('generateSmartQuiz — happy path', () => {
    it('calls apiCall with POST /ai/generate-smart', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse());
      await generateSmartQuiz(makeParams());
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      const [url, opts] = mockApiCall.mock.calls[0];
      expect(url).toBe('/ai/generate-smart');
      expect(opts).toMatchObject({ method: 'POST' });
    });

    it('serializes the params object as JSON body', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse());
      const params = makeParams({ count: 10, quiz_id: 'qz-7' });
      await generateSmartQuiz(params);
      const opts = mockApiCall.mock.calls[0][1] as RequestInit;
      expect(JSON.parse(opts.body as string)).toEqual(params);
    });

    it('passes an AbortSignal to apiCall', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse());
      await generateSmartQuiz(makeParams());
      const opts = mockApiCall.mock.calls[0][1] as RequestInit;
      expect(opts.signal).toBeInstanceOf(AbortSignal);
      // Success path should NOT leave the signal in aborted state
      expect(opts.signal!.aborted).toBe(false);
    });

    it('returns the SmartGenerateResponse from apiCall', async () => {
      const resp = makeResponse({
        _meta: {
          model: 'gpt-4o',
          action: 'quiz_question',
          total_attempted: 5,
          total_generated: 5,
          total_failed: 0,
          total_targets_available: 20,
        },
      });
      mockApiCall.mockResolvedValueOnce(resp);
      const result = await generateSmartQuiz(makeParams({ count: 5 }));
      expect(result).toBe(resp);
    });

    it('supports the flashcard action value', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse());
      await generateSmartQuiz({ action: 'flashcard' });
      const body = JSON.parse(mockApiCall.mock.calls[0][1]!.body as string);
      expect(body.action).toBe('flashcard');
    });

    it('supports auto_create_quiz and quiz_title params', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse());
      await generateSmartQuiz(
        makeParams({ auto_create_quiz: true, quiz_title: 'Repaso adaptativo' }),
      );
      const body = JSON.parse(mockApiCall.mock.calls[0][1]!.body as string);
      expect(body.auto_create_quiz).toBe(true);
      expect(body.quiz_title).toBe('Repaso adaptativo');
    });

    it('handles a response with errors but no items', async () => {
      const resp = makeResponse({
        items: [],
        errors: [{ keyword_id: 'kw-x', keyword_name: 'X', error: 'openai_fail' }],
        _meta: {
          model: 'gpt-4',
          action: 'quiz_question',
          total_attempted: 1,
          total_generated: 0,
          total_failed: 1,
          total_targets_available: 3,
        },
      });
      mockApiCall.mockResolvedValueOnce(resp);
      const result = await generateSmartQuiz(makeParams({ count: 1 }));
      expect(result.items).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result._meta.total_failed).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Timeout / abort
  // ─────────────────────────────────────────────────────────

  describe('generateSmartQuiz — timeout path', () => {
    it('throws a descriptive timeout Error when apiCall rejects with AbortError', async () => {
      const abortErr = new DOMException('aborted', 'AbortError');
      // Two invocations share the same queued rejection pattern — prime both.
      mockApiCall.mockRejectedValueOnce(abortErr);
      mockApiCall.mockRejectedValueOnce(abortErr);

      await expect(generateSmartQuiz(makeParams())).rejects.toThrow(/Timeout/);
      await expect(generateSmartQuiz(makeParams())).rejects.toThrow(/2 minutos/);
    });

    it('converts AbortError even when the signal was aborted by the controller', async () => {
      // Simulate the controller aborting (the actual 120s path) by rejecting
      // with an AbortError DOMException.
      const abortErr = new DOMException('The operation was aborted.', 'AbortError');
      mockApiCall.mockRejectedValueOnce(abortErr);
      await expect(generateSmartQuiz(makeParams())).rejects.toThrow(
        'Timeout: la generacion adaptativa tardo mas de 2 minutos. Intenta con menos preguntas.',
      );
    });

    it('clears the timeout when apiCall resolves (no dangling aborts)', async () => {
      vi.useFakeTimers();
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      mockApiCall.mockResolvedValueOnce(makeResponse());
      await generateSmartQuiz(makeParams());
      expect(clearSpy).toHaveBeenCalled();
    });

    it('clears the timeout when apiCall rejects with a non-abort error', async () => {
      vi.useFakeTimers();
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      mockApiCall.mockRejectedValueOnce(new Error('500'));
      await expect(generateSmartQuiz(makeParams())).rejects.toThrow('500');
      expect(clearSpy).toHaveBeenCalled();
    });

    it('installs a 120_000 ms timeout via setTimeout', async () => {
      vi.useFakeTimers();
      const setSpy = vi.spyOn(globalThis, 'setTimeout');
      mockApiCall.mockResolvedValueOnce(makeResponse());
      await generateSmartQuiz(makeParams());
      const matching = setSpy.mock.calls.find(([, ms]) => ms === 120_000);
      expect(matching).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────
  // Error propagation (non-abort)
  // ─────────────────────────────────────────────────────────

  describe('generateSmartQuiz — error path', () => {
    it('rethrows non-AbortError errors unchanged', async () => {
      const err = new Error('401 Unauthorized');
      mockApiCall.mockRejectedValueOnce(err);
      await expect(generateSmartQuiz(makeParams())).rejects.toBe(err);
    });

    it('rethrows a non-DOMException even if name happens to be AbortError', async () => {
      // The guard is `err instanceof DOMException && err.name === 'AbortError'`.
      // A plain Error named 'AbortError' must NOT be converted.
      const fake = new Error('pseudo abort');
      fake.name = 'AbortError';
      mockApiCall.mockRejectedValueOnce(fake);
      await expect(generateSmartQuiz(makeParams())).rejects.toBe(fake);
    });

    it('rethrows a DOMException whose name is not AbortError', async () => {
      const domErr = new DOMException('something else', 'SyntaxError');
      mockApiCall.mockRejectedValueOnce(domErr);
      await expect(generateSmartQuiz(makeParams())).rejects.toBe(domErr);
    });
  });
});
