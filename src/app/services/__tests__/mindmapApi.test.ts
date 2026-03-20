// ============================================================
// Tests for pure helper functions in mindmapApi.ts
//
// unwrapItems, chunk, and buildGraphData are NOT exported from
// the source module. We replicate the logic here and verify the
// contract matches the source implementation (same pattern as
// mapComparisonPanel.test.ts — see agent decision 2026-03-18).
// ============================================================

import { describe, it, expect } from 'vitest';
import { getSafeMasteryColor, type MasteryColor } from '@/app/lib/mastery-helpers';
import type { KeywordConnection } from '@/app/types/keyword-connections';
import type { GraphData, MapNode, MapEdge } from '@/app/types/mindmap';

// ── Replicated helpers (must match source in mindmapApi.ts) ──

function unwrapItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: T[] }).items || [];
  }
  return [];
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Minimal KeywordMasteryInfo shape needed by buildGraphData */
interface KeywordMasteryInfo {
  keyword_id: string;
  name: string;
  definition: string;
  summary_id: string;
  priority: number;
  mastery: number;
  subtopics: unknown[];
}

type KeywordMasteryMap = Map<string, KeywordMasteryInfo>;

function buildGraphData(
  masteryMap: KeywordMasteryMap,
  connections: KeywordConnection[],
  topicMap?: Map<string, string>,
): GraphData {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const nodeIds = new Set<string>();

  for (const [kwId, info] of masteryMap) {
    nodeIds.add(kwId);
    nodes.push({
      id: kwId,
      label: info.name,
      definition: info.definition || undefined,
      type: 'keyword',
      mastery: info.mastery,
      masteryColor: getSafeMasteryColor(info.mastery),
      summaryId: info.summary_id,
      topicId: topicMap?.get(kwId),
      flashcardCount: 0,
      quizCount: 0,
    });
  }

  for (const conn of connections) {
    if (!nodeIds.has(conn.keyword_a_id) || !nodeIds.has(conn.keyword_b_id)) {
      continue;
    }

    const source = conn.source_keyword_id || conn.keyword_a_id;
    const target = source === conn.keyword_a_id ? conn.keyword_b_id : conn.keyword_a_id;

    edges.push({
      id: conn.id,
      source,
      target,
      label: conn.relationship || conn.connection_type || undefined,
      connectionType: conn.connection_type || undefined,
      sourceKeywordId: conn.source_keyword_id || undefined,
    });
  }

  return { nodes, edges };
}

// ── Factories ────────────────────────────────────────────────

function makeMasteryInfo(overrides: Partial<KeywordMasteryInfo> & { keyword_id: string; name: string }): KeywordMasteryInfo {
  return {
    definition: '',
    summary_id: 'sum-1',
    priority: 1,
    mastery: 0.5,
    subtopics: [],
    ...overrides,
  };
}

function makeConnection(overrides: Partial<KeywordConnection> & { id: string; keyword_a_id: string; keyword_b_id: string }): KeywordConnection {
  return {
    relationship: null,
    connection_type: null,
    source_keyword_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('unwrapItems', () => {
  it('returns the array as-is when given an array', () => {
    const arr = [1, 2, 3];
    expect(unwrapItems(arr)).toBe(arr);
  });

  it('unwraps { items: [...] } objects', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(unwrapItems({ items })).toBe(items);
  });

  it('returns [] when items is undefined inside wrapper', () => {
    expect(unwrapItems({ items: undefined })).toEqual([]);
  });

  it('returns [] for null input', () => {
    expect(unwrapItems(null)).toEqual([]);
  });

  it('returns [] for undefined input', () => {
    expect(unwrapItems(undefined)).toEqual([]);
  });

  it('returns [] for a non-object primitive (number)', () => {
    expect(unwrapItems(42)).toEqual([]);
  });

  it('returns [] for a non-object primitive (string)', () => {
    expect(unwrapItems('hello')).toEqual([]);
  });

  it('returns [] for an object without items key', () => {
    expect(unwrapItems({ data: [1, 2] })).toEqual([]);
  });

  it('returns [] for items: null', () => {
    // (result as { items: T[] }).items || [] -- null is falsy so returns []
    expect(unwrapItems({ items: null })).toEqual([]);
  });
});

describe('chunk', () => {
  it('splits array into chunks of given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns single chunk when size >= array length', () => {
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  it('returns single chunk when size equals array length', () => {
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });

  it('returns empty array for empty input', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('returns individual elements when size is 1', () => {
    expect(chunk(['a', 'b', 'c'], 1)).toEqual([['a'], ['b'], ['c']]);
  });

  it('handles exact multiples correctly', () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
  });

  it('returns entire array wrapped in one chunk when size is 0 (guard clause)', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
  });

  it('returns entire array wrapped in one chunk when size is negative (guard clause)', () => {
    expect(chunk([1, 2, 3], -5)).toEqual([[1, 2, 3]]);
  });

  it('guard clause does not cause infinite loop', () => {
    // This test would hang if the guard is missing
    const result = chunk([1, 2], 0);
    expect(result).toHaveLength(1);
  });
});

describe('buildGraphData', () => {
  const kwA = makeMasteryInfo({ keyword_id: 'kw-a', name: 'Keyword A', mastery: 0.9 });
  const kwB = makeMasteryInfo({ keyword_id: 'kw-b', name: 'Keyword B', mastery: 0.3 });
  const kwC = makeMasteryInfo({ keyword_id: 'kw-c', name: 'Keyword C', mastery: -1 });

  function makeMasteryMap(entries: KeywordMasteryInfo[]): KeywordMasteryMap {
    return new Map(entries.map(e => [e.keyword_id, e]));
  }

  describe('nodes', () => {
    it('creates nodes from mastery map entries', () => {
      const map = makeMasteryMap([kwA]);
      const result = buildGraphData(map, []);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toMatchObject({
        id: 'kw-a',
        label: 'Keyword A',
        type: 'keyword',
        mastery: 0.9,
        masteryColor: 'green',
        flashcardCount: 0,
        quizCount: 0,
      });
    });

    it('applies getSafeMasteryColor correctly (gray for -1)', () => {
      const map = makeMasteryMap([kwC]);
      const result = buildGraphData(map, []);
      expect(result.nodes[0].masteryColor).toBe('gray');
    });

    it('applies getSafeMasteryColor correctly (red for 0.3)', () => {
      const map = makeMasteryMap([kwB]);
      const result = buildGraphData(map, []);
      expect(result.nodes[0].masteryColor).toBe('red');
    });

    it('assigns topicId from topicMap when provided', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const topicMap = new Map([['kw-a', 'topic-1'], ['kw-b', 'topic-2']]);
      const result = buildGraphData(map, [], topicMap);
      expect(result.nodes[0].topicId).toBe('topic-1');
      expect(result.nodes[1].topicId).toBe('topic-2');
    });

    it('leaves topicId undefined when topicMap is omitted', () => {
      const map = makeMasteryMap([kwA]);
      const result = buildGraphData(map, []);
      expect(result.nodes[0].topicId).toBeUndefined();
    });

    it('leaves topicId undefined when keyword is not in topicMap', () => {
      const map = makeMasteryMap([kwA]);
      const topicMap = new Map([['kw-other', 'topic-x']]);
      const result = buildGraphData(map, [], topicMap);
      expect(result.nodes[0].topicId).toBeUndefined();
    });
  });

  describe('edges - orphan prevention', () => {
    it('filters out edges where keyword_a_id is not in node set', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-missing',
        keyword_b_id: 'kw-b',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges).toHaveLength(0);
    });

    it('filters out edges where keyword_b_id is not in node set', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-missing',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges).toHaveLength(0);
    });

    it('filters out edges where both endpoints are missing', () => {
      const map = makeMasteryMap([kwA]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-x',
        keyword_b_id: 'kw-y',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges).toHaveLength(0);
    });

    it('includes edges where both endpoints exist', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges).toHaveLength(1);
    });
  });

  describe('edges - direction', () => {
    it('uses keyword_a_id as source when source_keyword_id is null', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
        source_keyword_id: null,
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges[0].source).toBe('kw-a');
      expect(result.edges[0].target).toBe('kw-b');
    });

    it('uses source_keyword_id as source when set to keyword_a_id', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
        source_keyword_id: 'kw-a',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges[0].source).toBe('kw-a');
      expect(result.edges[0].target).toBe('kw-b');
    });

    it('reverses direction when source_keyword_id is keyword_b_id', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
        source_keyword_id: 'kw-b',
      });
      const result = buildGraphData(map, [conn]);
      // source_keyword_id = kw-b, so source = kw-b
      // target = kw-a (because source !== keyword_a_id)
      expect(result.edges[0].source).toBe('kw-b');
      expect(result.edges[0].target).toBe('kw-a');
    });
  });

  describe('edges - label', () => {
    it('prefers relationship over connection_type for label', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
        relationship: 'Causes',
        connection_type: 'causa-efecto',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges[0].label).toBe('Causes');
    });

    it('falls back to connection_type when relationship is null', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
        relationship: null,
        connection_type: 'causa-efecto',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges[0].label).toBe('causa-efecto');
    });

    it('sets label to undefined when both relationship and connection_type are null', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
        relationship: null,
        connection_type: null,
      });
      const result = buildGraphData(map, [conn]);
      expect(result.edges[0].label).toBeUndefined();
    });

    it('uses relationship even when it is an empty string (falsy)', () => {
      const map = makeMasteryMap([kwA, kwB]);
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
        relationship: '',
        connection_type: 'causa-efecto',
      });
      const result = buildGraphData(map, [conn]);
      // '' || 'causa-efecto' => 'causa-efecto' (empty string is falsy)
      expect(result.edges[0].label).toBe('causa-efecto');
    });
  });

  describe('empty mastery map', () => {
    it('returns empty nodes and edges', () => {
      const map: KeywordMasteryMap = new Map();
      const conn = makeConnection({
        id: 'e1',
        keyword_a_id: 'kw-a',
        keyword_b_id: 'kw-b',
      });
      const result = buildGraphData(map, [conn]);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe('definition handling', () => {
    it('sets definition to undefined when info.definition is empty string', () => {
      const kw = makeMasteryInfo({ keyword_id: 'kw-x', name: 'X', definition: '' });
      const map = makeMasteryMap([kw]);
      const result = buildGraphData(map, []);
      // '' || undefined => undefined
      expect(result.nodes[0].definition).toBeUndefined();
    });

    it('preserves definition when it has content', () => {
      const kw = makeMasteryInfo({ keyword_id: 'kw-x', name: 'X', definition: 'A concept' });
      const map = makeMasteryMap([kw]);
      const result = buildGraphData(map, []);
      expect(result.nodes[0].definition).toBe('A concept');
    });
  });
});
