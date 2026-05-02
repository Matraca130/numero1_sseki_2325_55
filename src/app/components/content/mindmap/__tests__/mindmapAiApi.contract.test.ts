// ============================================================
// Contract test -- mindmapAiApi service
//
// Verifies (cycle 55 — expanded from 11 → 50+ tests):
//   1. All 3 functions are exported with correct signatures
//   2. Each function validates its topicId parameter (prefix only —
//      the suffix may collapse if the orchestrator extracts requireTopicId)
//   3. Each function calls apiCall with the correct endpoint/method/body
//   4. Errors are wrapped with descriptive Spanish messages, with
//      Error.cause preserving the original error reference (cycle 45 contract)
//   5. suggestStudentConnections short-circuits on empty nodeIds
//   6. URL-encoding edge cases for getStudentWeakPoints
//   7. Cross-cutting: stateless / concurrency-safe
//
// IMPORTANT pinning policy:
//   - Match `/topicId es requerido/` (regex) — never the full message — so
//     a future requireTopicId() extraction that collapses the 3 suffixes
//     into one message does not break this suite.
//   - Body shapes are parsed (JSON.parse) before asserting deep-equality,
//     so reordered keys do not break assertions.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiCall before importing the module under test
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  analyzeKnowledgeGraph,
  suggestStudentConnections,
  getStudentWeakPoints,
} from '@/app/services/mindmapAiApi';

beforeEach(() => {
  mockApiCall.mockReset();
});

// Helper: extract and parse the JSON body from the most recent apiCall.
function lastBody(): unknown {
  const calls = mockApiCall.mock.calls;
  if (calls.length === 0) throw new Error('apiCall was not invoked');
  const opts = calls[calls.length - 1][1] as { body?: string } | undefined;
  if (!opts?.body) throw new Error('No body on the latest apiCall');
  return JSON.parse(opts.body);
}

// ── Module surface ──────────────────────────────────────────

describe('mindmapAiApi — module surface', () => {
  it('exports analyzeKnowledgeGraph as a function', () => {
    expect(typeof analyzeKnowledgeGraph).toBe('function');
  });

  it('exports suggestStudentConnections as a function', () => {
    expect(typeof suggestStudentConnections).toBe('function');
  });

  it('exports getStudentWeakPoints as a function', () => {
    expect(typeof getStudentWeakPoints).toBe('function');
  });

  it('does NOT export wrapAiCall (internal helper)', async () => {
    const mod = await import('@/app/services/mindmapAiApi');
    expect((mod as Record<string, unknown>).wrapAiCall).toBeUndefined();
  });

  it('exports exactly 3 named functions', async () => {
    const mod = await import('@/app/services/mindmapAiApi');
    const fnNames = Object.keys(mod).filter(
      (k) => typeof (mod as Record<string, unknown>)[k] === 'function',
    );
    expect(fnNames.sort()).toEqual([
      'analyzeKnowledgeGraph',
      'getStudentWeakPoints',
      'suggestStudentConnections',
    ]);
  });
});

// ── analyzeKnowledgeGraph ───────────────────────────────────

describe('analyzeKnowledgeGraph — guard', () => {
  it('throws on empty topicId (prefix match)', async () => {
    await expect(analyzeKnowledgeGraph('')).rejects.toThrow(
      /topicId es requerido/,
    );
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('throws on undefined topicId (cast)', async () => {
    await expect(
      analyzeKnowledgeGraph(undefined as unknown as string),
    ).rejects.toThrow(/topicId es requerido/);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('throws on null topicId (cast)', async () => {
    await expect(
      analyzeKnowledgeGraph(null as unknown as string),
    ).rejects.toThrow(/topicId es requerido/);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('passes through truthy "0" string topicId', async () => {
    mockApiCall.mockResolvedValue({ ok: true });
    await analyzeKnowledgeGraph('0');
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('passes through space-only topicId (truthy in JS)', async () => {
    mockApiCall.mockResolvedValue({ ok: true });
    await analyzeKnowledgeGraph(' ');
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });
});

describe('analyzeKnowledgeGraph — request shape', () => {
  it('hits POST /ai/analyze-knowledge-graph', async () => {
    mockApiCall.mockResolvedValue({});
    await analyzeKnowledgeGraph('topic-x');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/analyze-knowledge-graph',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('serialises topicId into snake_case body { topic_id }', async () => {
    mockApiCall.mockResolvedValue({});
    await analyzeKnowledgeGraph('topic-123');
    expect(lastBody()).toEqual({ topic_id: 'topic-123' });
  });

  it('returns the apiCall resolved value by reference identity', async () => {
    const fakeResponse = {
      weak_areas: [],
      strong_areas: [],
      missing_connections: [],
      study_path: [],
      overall_score: 80,
      summary_text: 'ok',
    };
    mockApiCall.mockResolvedValue(fakeResponse);
    const result = await analyzeKnowledgeGraph('topic-1');
    expect(result).toBe(fakeResponse);
  });
});

describe('analyzeKnowledgeGraph — error wrapping', () => {
  it('wraps Error with the expected Spanish prefix', async () => {
    mockApiCall.mockRejectedValue(new Error('network down'));
    await expect(analyzeKnowledgeGraph('topic-1')).rejects.toThrow(
      'No se pudo analizar el grafo de conocimiento: network down',
    );
  });

  it('preserves the original Error via Error.cause', async () => {
    const original = new Error('boom');
    mockApiCall.mockRejectedValue(original);
    try {
      await analyzeKnowledgeGraph('topic-1');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).cause).toBe(original);
    }
  });

  it('handles thrown string with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue('string-throw');
    await expect(analyzeKnowledgeGraph('t')).rejects.toThrow(
      'No se pudo analizar el grafo de conocimiento: Error desconocido',
    );
  });

  it('handles thrown undefined with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue(undefined);
    await expect(analyzeKnowledgeGraph('t')).rejects.toThrow(
      /Error desconocido/,
    );
  });

  it('handles thrown null with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue(null);
    await expect(analyzeKnowledgeGraph('t')).rejects.toThrow(
      /Error desconocido/,
    );
  });

  it('handles thrown plain object with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue({ statusCode: 500 });
    await expect(analyzeKnowledgeGraph('t')).rejects.toThrow(
      /Error desconocido/,
    );
  });

  it('handles thrown number with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue(42);
    await expect(analyzeKnowledgeGraph('t')).rejects.toThrow(
      /Error desconocido/,
    );
  });

  it('preserves non-Error thrown value as Error.cause', async () => {
    const cause = { code: 'E_FAIL', detail: 'x' };
    mockApiCall.mockRejectedValue(cause);
    try {
      await analyzeKnowledgeGraph('t');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).cause).toBe(cause);
    }
  });
});

// ── suggestStudentConnections ───────────────────────────────

describe('suggestStudentConnections — guard', () => {
  it('throws on empty topicId (prefix match)', async () => {
    await expect(
      suggestStudentConnections('', ['n1'], ['e1']),
    ).rejects.toThrow(/topicId es requerido/);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('throws on undefined topicId (cast)', async () => {
    await expect(
      suggestStudentConnections(undefined as unknown as string, ['n1'], []),
    ).rejects.toThrow(/topicId es requerido/);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('throws on null topicId (cast)', async () => {
    await expect(
      suggestStudentConnections(null as unknown as string, ['n1'], []),
    ).rejects.toThrow(/topicId es requerido/);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('topicId guard runs BEFORE the empty-nodeIds short-circuit', async () => {
    // If the order were reversed, empty nodeIds + empty topicId would
    // silently return [] instead of throwing. Pin the actual order.
    await expect(
      suggestStudentConnections('', [], []),
    ).rejects.toThrow(/topicId es requerido/);
  });
});

describe('suggestStudentConnections — short-circuit', () => {
  it('returns [] when nodeIds is empty AND edgeIds is empty', async () => {
    const result = await suggestStudentConnections('topic-1', [], []);
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('returns [] when nodeIds is empty even if edgeIds is NOT empty', async () => {
    // Per source comment: "AI cannot suggest connections without existing nodes"
    const result = await suggestStudentConnections('topic-1', [], ['e1', 'e2']);
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('short-circuit returns a fresh array (not a shared singleton)', async () => {
    const a = await suggestStudentConnections('t', [], []);
    const b = await suggestStudentConnections('t', [], []);
    // Both empty arrays — they may or may not be the same reference, but
    // mutating one must NOT leak to a future call. Pin the empty contract.
    (a as unknown[]).push('mutation' as unknown as never);
    const c = await suggestStudentConnections('t', [], []);
    expect(c).toEqual([]);
    // a and b are two separate calls; we don't pin a !== b (impl detail).
    void b;
  });

  it('does NOT short-circuit when nodeIds is non-empty (even with empty edgeIds)', async () => {
    mockApiCall.mockResolvedValue([]);
    await suggestStudentConnections('t', ['n1'], []);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });
});

describe('suggestStudentConnections — request shape', () => {
  it('hits POST /ai/suggest-student-connections', async () => {
    mockApiCall.mockResolvedValue([]);
    await suggestStudentConnections('t', ['n1'], ['e1']);
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/suggest-student-connections',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('body uses snake_case keys: topic_id / existing_node_ids / existing_edge_ids', async () => {
    mockApiCall.mockResolvedValue([]);
    await suggestStudentConnections(
      'topic-1',
      ['node-a', 'node-b'],
      ['edge-1'],
    );
    expect(lastBody()).toEqual({
      topic_id: 'topic-1',
      existing_node_ids: ['node-a', 'node-b'],
      existing_edge_ids: ['edge-1'],
    });
  });

  it('preserves nodeIds order in the body', async () => {
    mockApiCall.mockResolvedValue([]);
    await suggestStudentConnections('t', ['z', 'a', 'm'], []);
    const body = lastBody() as { existing_node_ids: string[] };
    expect(body.existing_node_ids).toEqual(['z', 'a', 'm']);
  });

  it('preserves edgeIds order in the body', async () => {
    mockApiCall.mockResolvedValue([]);
    await suggestStudentConnections('t', ['n1'], ['e3', 'e1', 'e2']);
    const body = lastBody() as { existing_edge_ids: string[] };
    expect(body.existing_edge_ids).toEqual(['e3', 'e1', 'e2']);
  });

  it('returns the apiCall resolved value by reference identity', async () => {
    const fake = [
      { source: 'a', target: 'b', type: 'relates', reason: 'r', confidence: 0.9 },
    ];
    mockApiCall.mockResolvedValue(fake);
    const result = await suggestStudentConnections('t', ['n1'], []);
    expect(result).toBe(fake);
  });
});

describe('suggestStudentConnections — error wrapping', () => {
  it('wraps Error with the expected Spanish prefix', async () => {
    mockApiCall.mockRejectedValue(new Error('timeout'));
    await expect(
      suggestStudentConnections('t', ['n1'], []),
    ).rejects.toThrow(
      'No se pudieron obtener sugerencias de conexiones: timeout',
    );
  });

  it('preserves the original Error via Error.cause', async () => {
    const original = new Error('rate limit');
    mockApiCall.mockRejectedValue(original);
    try {
      await suggestStudentConnections('t', ['n1'], []);
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).cause).toBe(original);
    }
  });

  it('handles thrown string with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue('oops');
    await expect(
      suggestStudentConnections('t', ['n1'], []),
    ).rejects.toThrow(
      'No se pudieron obtener sugerencias de conexiones: Error desconocido',
    );
  });
});

// ── getStudentWeakPoints ────────────────────────────────────

describe('getStudentWeakPoints — guard', () => {
  it('throws on empty topicId (prefix match)', async () => {
    await expect(getStudentWeakPoints('')).rejects.toThrow(
      /topicId es requerido/,
    );
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('throws on undefined topicId (cast)', async () => {
    await expect(
      getStudentWeakPoints(undefined as unknown as string),
    ).rejects.toThrow(/topicId es requerido/);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('throws on null topicId (cast)', async () => {
    await expect(
      getStudentWeakPoints(null as unknown as string),
    ).rejects.toThrow(/topicId es requerido/);
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

describe('getStudentWeakPoints — URL & method', () => {
  it('uses GET method (apiCall called with no method override)', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('t-1');
    // Source calls apiCall(url) — no second arg. apiCall defaults to GET.
    const [, opts] = mockApiCall.mock.calls[0];
    expect(opts).toBeUndefined();
  });

  it('embeds topicId via encodeURIComponent', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('topic-1');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=topic-1',
    );
  });

  it('encodes "?" in topicId', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('a?b');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=a%3Fb',
    );
  });

  it('encodes "&" in topicId (prevents query-param injection)', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('a&malicious=1');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=a%26malicious%3D1',
    );
  });

  it('encodes "#" in topicId', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('a#frag');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=a%23frag',
    );
  });

  it('encodes spaces in topicId', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('hello world');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=hello%20world',
    );
  });

  it('encodes slashes in topicId', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('topic/special');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=topic%2Fspecial',
    );
  });

  it('encodes unicode (Japanese) in topicId', async () => {
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('日本');
    expect(mockApiCall).toHaveBeenCalledWith(
      `/ai/student-weak-points?topic_id=${encodeURIComponent('日本')}`,
    );
  });

  it('double-encodes already-encoded sequences (encodeURIComponent is naive)', async () => {
    // %20 → %2520 — current behavior, pin it explicitly
    mockApiCall.mockResolvedValue([]);
    await getStudentWeakPoints('a%20b');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/ai/student-weak-points?topic_id=a%2520b',
    );
  });

  it('returns the apiCall resolved value by reference identity', async () => {
    const fakePoints = [
      {
        keyword_id: 'k1',
        name: 'test',
        mastery: 0.3,
        last_reviewed: null,
        recommended_action: 'quiz',
      },
    ];
    mockApiCall.mockResolvedValue(fakePoints);
    const result = await getStudentWeakPoints('topic-1');
    expect(result).toBe(fakePoints);
  });
});

describe('getStudentWeakPoints — error wrapping', () => {
  it('wraps Error with the expected Spanish prefix', async () => {
    mockApiCall.mockRejectedValue(new Error('403'));
    await expect(getStudentWeakPoints('t')).rejects.toThrow(
      'No se pudieron obtener los puntos débiles del estudiante: 403',
    );
  });

  it('preserves the original Error via Error.cause', async () => {
    const original = new Error('forbidden');
    mockApiCall.mockRejectedValue(original);
    try {
      await getStudentWeakPoints('t');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).cause).toBe(original);
    }
  });

  it('handles thrown string with "Error desconocido"', async () => {
    mockApiCall.mockRejectedValue('weird');
    await expect(getStudentWeakPoints('t')).rejects.toThrow(
      /Error desconocido/,
    );
  });
});

// ── wrapAiCall behavior (exercised via the 3 endpoints) ─────

describe('wrapAiCall — error wrapping invariants', () => {
  it('the thrown error is a fresh Error instance (not the original)', async () => {
    const original = new Error('orig');
    mockApiCall.mockRejectedValue(original);
    try {
      await analyzeKnowledgeGraph('t');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).not.toBe(original);
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('the thrown message format is "<prefix>: <originalMessage>"', async () => {
    mockApiCall.mockRejectedValue(new Error('xyz'));
    try {
      await analyzeKnowledgeGraph('t');
      throw new Error('should have thrown');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg.startsWith('No se pudo analizar el grafo de conocimiento: ')).toBe(true);
      expect(msg.endsWith(': xyz')).toBe(true);
    }
  });

  it('re-wrapping a wrapped error nests the cause chain (no flattening)', async () => {
    // Force analyzeKnowledgeGraph to fail with an already-wrapped Error
    // (the cause chain must remain intact; we pin actual depth-2 behavior).
    const root = new Error('root cause');
    const middle = new Error('middle wrap', { cause: root });
    mockApiCall.mockRejectedValue(middle);
    try {
      await analyzeKnowledgeGraph('t');
      throw new Error('should have thrown');
    } catch (err) {
      // Outer wrap created by mindmapAiApi
      expect((err as Error).cause).toBe(middle);
      // Middle wrap's cause still points to root
      expect(((err as Error).cause as Error).cause).toBe(root);
    }
  });

  it('does NOT swallow synchronous throws inside the apiCall callback', async () => {
    // mockRejectedValue produces a rejected promise — the catch path applies.
    // mockImplementation that throws synchronously ALSO ends up wrapped because
    // wrapAiCall awaits the function call inside try.
    mockApiCall.mockImplementation(() => {
      throw new Error('sync boom');
    });
    await expect(analyzeKnowledgeGraph('t')).rejects.toThrow(
      'No se pudo analizar el grafo de conocimiento: sync boom',
    );
  });

  it('on success, returns the resolved value without wrapping', async () => {
    const value = { custom: 'response', list: [1, 2, 3] };
    mockApiCall.mockResolvedValue(value);
    const result = await analyzeKnowledgeGraph('t');
    expect(result).toBe(value);
  });
});

// ── Cross-cutting: stateless / concurrency ──────────────────

describe('mindmapAiApi — cross-cutting', () => {
  it('two concurrent analyzeKnowledgeGraph calls do not interfere', async () => {
    let i = 0;
    mockApiCall.mockImplementation(async () => ({ id: ++i }));
    const [a, b] = await Promise.all([
      analyzeKnowledgeGraph('topic-A'),
      analyzeKnowledgeGraph('topic-B'),
    ]);
    expect(mockApiCall).toHaveBeenCalledTimes(2);
    // Order isn't guaranteed, but both should resolve to one of {1,2}.
    const ids = [(a as { id: number }).id, (b as { id: number }).id].sort();
    expect(ids).toEqual([1, 2]);
  });

  it('mixing functions concurrently does not cross-contaminate request bodies', async () => {
    mockApiCall.mockResolvedValue({});
    await Promise.all([
      analyzeKnowledgeGraph('topic-A'),
      suggestStudentConnections('topic-B', ['n1'], ['e1']),
    ]);
    const bodies = mockApiCall.mock.calls
      .map((c) => (c[1] as { body?: string } | undefined)?.body)
      .filter((b): b is string => typeof b === 'string')
      .map((b) => JSON.parse(b));
    expect(bodies).toContainEqual({ topic_id: 'topic-A' });
    expect(bodies).toContainEqual({
      topic_id: 'topic-B',
      existing_node_ids: ['n1'],
      existing_edge_ids: ['e1'],
    });
  });

  it('a failed call does not leak state into a subsequent successful call', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('first fails'));
    await expect(analyzeKnowledgeGraph('t')).rejects.toThrow();
    mockApiCall.mockResolvedValueOnce({ ok: true });
    const result = await analyzeKnowledgeGraph('t2');
    expect(result).toEqual({ ok: true });
  });

  it('functions are pure with respect to argument arrays (no mutation of nodeIds)', async () => {
    mockApiCall.mockResolvedValue([]);
    const nodes = ['n1', 'n2'];
    const edges = ['e1'];
    await suggestStudentConnections('t', nodes, edges);
    expect(nodes).toEqual(['n1', 'n2']);
    expect(edges).toEqual(['e1']);
  });
});
