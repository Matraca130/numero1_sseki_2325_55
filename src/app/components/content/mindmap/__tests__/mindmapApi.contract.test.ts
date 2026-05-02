// ============================================================
// Tests -- mindmapApi contract tests
//
// Tests the public API surface of mindmapApi.ts:
//   - fetchGraphByTopic: mastery + connections -> GraphData
//   - fetchGraphBySummary: single summary graph
//   - fetchGraphByCourse: multi-topic graph merge
//   - fetchClassMastery: professor heatmap (404 fallback)
//   - fetchCustomGraph: student custom nodes/edges (404 fallback)
//   - createCustomNode / deleteCustomNode: CRUD
//   - createCustomEdge / deleteCustomEdge: CRUD
//   - fetchGraphTemplates / createGraphTemplate / deleteGraphTemplate
//   - Exported interfaces: CreateCustomNodePayload, CreateCustomEdgePayload,
//     CreateGraphTemplatePayload
//
// Pattern: mock apiCall + keywordMasteryApi, assert URL construction,
// parameter shapes, transformation logic, error handling.
// Source-inspection for internal constants and error strings.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const SERVICE_PATH = resolve(__dirname, '..', '..', '..', '..', 'services', 'mindmapApi.ts');
const source = readFileSync(SERVICE_PATH, 'utf-8');

// ── Mocks ───────────────────────────────────────────────────

const mockApiCall = vi.fn();
const mockFetchMasteryByTopic = vi.fn();
const mockFetchMasteryBySummary = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

vi.mock('@/app/services/keywordMasteryApi', () => ({
  fetchKeywordMasteryByTopic: (...args: unknown[]) => mockFetchMasteryByTopic(...args),
  fetchKeywordMasteryBySummary: (...args: unknown[]) => mockFetchMasteryBySummary(...args),
}));

vi.mock('@/app/lib/mastery-helpers', () => ({
  getSafeMasteryColor: (m: number) => {
    if (m < 0) return 'gray';
    if (m < 0.3) return 'red';
    if (m < 0.7) return 'yellow';
    return 'green';
  },
  getMasteryLabel: () => 'test',
}));

import {
  fetchGraphByTopic,
  fetchGraphBySummary,
  fetchGraphByCourse,
  fetchClassMastery,
  fetchCustomGraph,
  createCustomNode,
  deleteCustomNode,
  createCustomEdge,
  deleteCustomEdge,
  fetchGraphTemplates,
  createGraphTemplate,
  deleteGraphTemplate,
} from '@/app/services/mindmapApi';

import type {
  CreateCustomNodePayload,
  CreateCustomEdgePayload,
  CreateGraphTemplatePayload,
} from '@/app/services/mindmapApi';

// ── Helpers ─────────────────────────────────────────────────

/** Build a minimal KeywordMasteryMap */
function makeMasteryMap(entries: Array<{ id: string; name: string; mastery: number; summary_id?: string; definition?: string }>) {
  const map = new Map<string, { name: string; mastery: number; summary_id?: string; definition?: string }>();
  for (const e of entries) {
    map.set(e.id, { name: e.name, mastery: e.mastery, summary_id: e.summary_id, definition: e.definition });
  }
  return map;
}

// ── Reset mocks ─────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Source-based contract checks
// ============================================================

describe('mindmapApi: source contract', () => {
  it('imports logger from @/app/lib/logger (cycle 54: replaced raw if-DEV console)', () => {
    expect(source).toMatch(/import\s*\{\s*logger\s*\}\s*from\s*['"]@\/app\/lib\/logger['"]/);
  });

  it('uses logger.warn/info instead of raw console.warn/info', () => {
    // Cycle 54: 3 sites at L94-96, L254-265, L363 swapped to logger calls.
    expect(source).not.toMatch(/console\.warn\s*\(/);
    expect(source).not.toMatch(/console\.info\s*\(/);
    expect(source).toMatch(/logger\.warn\s*\(\s*['"]MindmapApi['"]/);
    // logger.info appears at least twice (mock-fallback + custom-graph-empty).
    expect((source.match(/logger\.info\s*\(\s*['"]MindmapApi['"]/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('preserves DEV guard around fetchClassMastery mock-data return (prod must throw)', () => {
    // Cycle 54: the `return graphNodes.map(...)` early-return inside
    // isNotFoundError handling must stay inside `if (import.meta.env.DEV)`.
    // Vite tree-shakes this branch in production so prod throws the user-
    // facing error below. Verify both elements coexist in the file.
    expect(source).toContain('if (isNotFoundError(e))');
    expect(source).toMatch(/if\s*\(import\.meta\.env\.DEV\)\s*\{\s*\n\s*logger\.info\([^)]+\);\s*\n\s*return graphNodes\.map/);
    expect(source).toContain("throw new Error('El mapa de calor no está disponible en este momento.')");
  });

  it('exports fetchGraphByTopic as async function', () => {
    expect(source).toContain('export async function fetchGraphByTopic(');
  });

  it('exports fetchGraphBySummary as async function', () => {
    expect(source).toContain('export async function fetchGraphBySummary(');
  });

  it('exports fetchGraphByCourse as async function', () => {
    expect(source).toContain('export async function fetchGraphByCourse(');
  });

  it('exports fetchClassMastery as async function', () => {
    expect(source).toContain('export async function fetchClassMastery(');
  });

  it('exports fetchCustomGraph as async function', () => {
    expect(source).toContain('export async function fetchCustomGraph(');
  });

  it('exports createCustomNode as async function', () => {
    expect(source).toContain('export async function createCustomNode(');
  });

  it('exports deleteCustomNode as async function', () => {
    expect(source).toContain('export async function deleteCustomNode(');
  });

  it('exports createCustomEdge as async function', () => {
    expect(source).toContain('export async function createCustomEdge(');
  });

  it('exports deleteCustomEdge as async function', () => {
    expect(source).toContain('export async function deleteCustomEdge(');
  });

  it('exports fetchGraphTemplates as async function', () => {
    expect(source).toContain('export async function fetchGraphTemplates(');
  });

  it('exports createGraphTemplate as async function', () => {
    expect(source).toContain('export async function createGraphTemplate(');
  });

  it('exports deleteGraphTemplate as async function', () => {
    expect(source).toContain('export async function deleteGraphTemplate(');
  });

  it('exports CreateCustomNodePayload interface', () => {
    expect(source).toContain('export interface CreateCustomNodePayload');
  });

  it('exports CreateCustomEdgePayload interface', () => {
    expect(source).toContain('export interface CreateCustomEdgePayload');
  });

  it('exports CreateGraphTemplatePayload interface', () => {
    expect(source).toContain('export interface CreateGraphTemplatePayload');
  });

  it('MAX_BATCH is 50 for connection chunking', () => {
    expect(source).toContain('const MAX_BATCH = 50');
  });

  it('uses Promise.allSettled for batch connections (partial failure tolerance)', () => {
    expect(source).toContain('Promise.allSettled');
  });

  it('deduplicates connections by id with a seenIds Set', () => {
    expect(source).toContain('const seenIds = new Set<string>()');
  });

  it('throws Spanish error when all connection batches fail', () => {
    expect(source).toContain("'No se pudieron cargar las conexiones del mapa.'");
  });

  it('calls encodeURIComponent on keyword IDs in batch URL', () => {
    expect(source).toContain('encodeURIComponent(id)');
  });

  it('uses /keyword-connections-batch endpoint for connections', () => {
    expect(source).toContain('/keyword-connections-batch?keyword_ids=');
  });

  it('fetchClassMastery calls /ai/class-mastery endpoint', () => {
    expect(source).toContain('/ai/class-mastery?topic_id=');
  });

  it('fetchClassMastery throws Spanish error for production 404', () => {
    expect(source).toContain('El mapa de calor no est\u00e1 disponible en este momento.');
  });

  it('fetchCustomGraph uses /student-custom-nodes endpoint', () => {
    expect(source).toContain('/student-custom-nodes?topic_id=');
  });

  it('fetchCustomGraph uses /student-custom-edges endpoint', () => {
    expect(source).toContain('/student-custom-edges?topic_id=');
  });

  it('professor templates use /professor/graph-templates endpoint', () => {
    expect(source).toContain('/professor/graph-templates');
  });

  it('isNotFoundError checks for 404 pattern in error message', () => {
    expect(source).toContain('/\\b404\\b/');
  });

  it('unwrapItems handles both array and {items: []} response shapes', () => {
    expect(source).toContain("'items' in result");
  });

  it('buildGraphData filters edges where both nodes must exist in the set', () => {
    expect(source).toContain('nodeIds.has(conn.keyword_a_id)');
    expect(source).toContain('nodeIds.has(conn.keyword_b_id)');
  });

  it('buildGraphData uses source_keyword_id for edge direction override', () => {
    expect(source).toContain('conn.source_keyword_id');
  });

  it('sets isUserCreated: true on custom nodes', () => {
    expect(source).toContain('isUserCreated: true');
  });

  it('custom nodes have mastery -1 (no data)', () => {
    expect(source).toContain('mastery: -1');
  });

  it('custom edges support lineStyle, customColor, directed, arrowType', () => {
    expect(source).toContain('lineStyle: e.line_style');
    expect(source).toContain('customColor: e.custom_color');
    expect(source).toContain('directed: e.directed');
    expect(source).toContain('arrowType: e.arrow_type');
  });
});

// ============================================================
// Behavioral tests: fetchGraphByTopic
// ============================================================

describe('mindmapApi: fetchGraphByTopic', () => {
  it('returns empty graph when mastery map is empty', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(new Map());
    const result = await fetchGraphByTopic('topic-1');
    expect(result).toEqual({ nodes: [], edges: [] });
    expect(mockFetchMasteryByTopic).toHaveBeenCalledWith('topic-1');
  });

  it('calls fetchKeywordMasteryByTopic then fetchConnectionsBatch and returns graph', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw-a', name: 'Keyword A', mastery: 0.8, summary_id: 'sum-1' },
      { id: 'kw-b', name: 'Keyword B', mastery: 0.4, summary_id: 'sum-1' },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);

    // Connections response (bare array)
    mockApiCall.mockResolvedValue([
      { id: 'conn-1', keyword_a_id: 'kw-a', keyword_b_id: 'kw-b', relationship: 'causes', connection_type: 'causa-efecto', source_keyword_id: 'kw-a' },
    ]);

    const result = await fetchGraphByTopic('topic-1');

    // Nodes
    expect(result.nodes).toHaveLength(2);
    const nodeA = result.nodes.find(n => n.id === 'kw-a')!;
    expect(nodeA.label).toBe('Keyword A');
    expect(nodeA.mastery).toBe(0.8);
    expect(nodeA.masteryColor).toBe('green');
    expect(nodeA.summaryId).toBe('sum-1');
    expect(nodeA.topicId).toBe('topic-1');
    expect(nodeA.type).toBe('keyword');

    // Edges
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('kw-a');
    expect(result.edges[0].target).toBe('kw-b');
    expect(result.edges[0].label).toBe('causes');
    expect(result.edges[0].connectionType).toBe('causa-efecto');
  });

  it('filters edges where one node is not in the mastery map', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw-a', name: 'Keyword A', mastery: 0.5 },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);

    mockApiCall.mockResolvedValue([
      { id: 'conn-1', keyword_a_id: 'kw-a', keyword_b_id: 'kw-missing', relationship: 'link' },
    ]);

    const result = await fetchGraphByTopic('topic-1');
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });

  it('deduplicates connections across batches by id', async () => {
    // Create >50 keywords to trigger multiple batches
    const entries = Array.from({ length: 55 }, (_, i) => ({
      id: `kw-${i}`, name: `Kw ${i}`, mastery: 0.5,
    }));
    const masteryMap = makeMasteryMap(entries);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);

    // Both batches return the same connection
    const sharedConn = { id: 'dup-conn', keyword_a_id: 'kw-0', keyword_b_id: 'kw-1', relationship: 'dup' };
    mockApiCall.mockResolvedValue([sharedConn]);

    const result = await fetchGraphByTopic('topic-1');
    const matchingEdges = result.edges.filter(e => e.id === 'dup-conn');
    expect(matchingEdges).toHaveLength(1);
  });

  it('handles {items: [...]} response wrapper from apiCall', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw-a', name: 'A', mastery: 0.5 },
      { id: 'kw-b', name: 'B', mastery: 0.3 },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);

    mockApiCall.mockResolvedValue({ items: [
      { id: 'c-1', keyword_a_id: 'kw-a', keyword_b_id: 'kw-b', relationship: 'test' },
    ] });

    const result = await fetchGraphByTopic('topic-1');
    expect(result.edges).toHaveLength(1);
  });

  it('uses source_keyword_id for edge direction when valid', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw-a', name: 'A', mastery: 0.5 },
      { id: 'kw-b', name: 'B', mastery: 0.5 },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);

    // source_keyword_id = kw-b, so source should be kw-b even though keyword_a is kw-a
    mockApiCall.mockResolvedValue([
      { id: 'c-1', keyword_a_id: 'kw-a', keyword_b_id: 'kw-b', source_keyword_id: 'kw-b', relationship: 'rev' },
    ]);

    const result = await fetchGraphByTopic('topic-1');
    expect(result.edges[0].source).toBe('kw-b');
    expect(result.edges[0].target).toBe('kw-a');
  });

  it('defaults to keyword_a -> keyword_b when source_keyword_id is invalid', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw-a', name: 'A', mastery: 0.5 },
      { id: 'kw-b', name: 'B', mastery: 0.5 },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);

    mockApiCall.mockResolvedValue([
      { id: 'c-1', keyword_a_id: 'kw-a', keyword_b_id: 'kw-b', source_keyword_id: 'invalid-id', relationship: 'r' },
    ]);

    const result = await fetchGraphByTopic('topic-1');
    expect(result.edges[0].source).toBe('kw-a');
    expect(result.edges[0].target).toBe('kw-b');
  });
});

// ============================================================
// Behavioral tests: fetchGraphBySummary
// ============================================================

describe('mindmapApi: fetchGraphBySummary', () => {
  it('returns empty graph when mastery map is empty', async () => {
    mockFetchMasteryBySummary.mockResolvedValue(new Map());
    const result = await fetchGraphBySummary('sum-1');
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('calls fetchKeywordMasteryBySummary and returns graph without topicId', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw-x', name: 'X', mastery: 0.9, summary_id: 'sum-1' },
    ]);
    mockFetchMasteryBySummary.mockResolvedValue(masteryMap);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphBySummary('sum-1');
    expect(result.nodes).toHaveLength(1);
    // No topicMap passed, so topicId should be undefined
    expect(result.nodes[0].topicId).toBeUndefined();
    expect(mockFetchMasteryBySummary).toHaveBeenCalledWith('sum-1');
  });
});

// ============================================================
// Behavioral tests: fetchGraphByCourse
// ============================================================

describe('mindmapApi: fetchGraphByCourse', () => {
  it('returns empty graph for empty topic list', async () => {
    const result = await fetchGraphByCourse([]);
    expect(result).toEqual({ nodes: [], edges: [] });
    expect(mockFetchMasteryByTopic).not.toHaveBeenCalled();
  });

  it('merges mastery maps from multiple topics', async () => {
    const map1 = makeMasteryMap([{ id: 'kw-1', name: 'K1', mastery: 0.5 }]);
    const map2 = makeMasteryMap([{ id: 'kw-2', name: 'K2', mastery: 0.8 }]);

    mockFetchMasteryByTopic
      .mockResolvedValueOnce(map1)
      .mockResolvedValueOnce(map2);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByCourse(['t1', 't2']);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find(n => n.id === 'kw-1')?.topicId).toBe('t1');
    expect(result.nodes.find(n => n.id === 'kw-2')?.topicId).toBe('t2');
  });

  it('tolerates partial topic failures via allSettled', async () => {
    const map1 = makeMasteryMap([{ id: 'kw-1', name: 'K1', mastery: 0.5 }]);

    mockFetchMasteryByTopic
      .mockResolvedValueOnce(map1)
      .mockRejectedValueOnce(new Error('network error'));
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByCourse(['t1', 't2']);
    // Should still have the successful topic's nodes
    expect(result.nodes).toHaveLength(1);
  });

  it('returns empty graph when all topics fail', async () => {
    mockFetchMasteryByTopic.mockRejectedValue(new Error('fail'));
    const result = await fetchGraphByCourse(['t1']);
    expect(result).toEqual({ nodes: [], edges: [] });
  });
});

// ============================================================
// Behavioral tests: fetchClassMastery
// ============================================================

describe('mindmapApi: fetchClassMastery', () => {
  it('returns API data when endpoint succeeds', async () => {
    const mockData = [{ keyword_id: 'kw-1', keyword_name: 'K1', avg_mastery: 0.7, student_count: 20, weak_student_count: 3 }];
    mockApiCall.mockResolvedValue(mockData);

    const result = await fetchClassMastery('topic-1', []);
    expect(result).toEqual(mockData);
    expect(mockApiCall).toHaveBeenCalledWith(
      expect.stringContaining('/ai/class-mastery?topic_id=topic-1'),
    );
  });

  it('returns mock data on 404 in DEV mode (Vitest runs in DEV)', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));

    const graphNodes = [
      { id: 'kw-1', label: 'K1', type: 'keyword' as const, mastery: 0.5, masteryColor: 'yellow' as const },
      { id: 'kw-2', label: 'K2', type: 'keyword' as const, mastery: 0.8, masteryColor: 'green' as const },
    ];

    const result = await fetchClassMastery('topic-1', graphNodes);
    expect(result).toHaveLength(2);
    expect(result[0].keyword_id).toBe('kw-1');
    expect(result[0].keyword_name).toBe('K1');
    expect(typeof result[0].avg_mastery).toBe('number');
    expect(typeof result[0].student_count).toBe('number');
    expect(typeof result[0].weak_student_count).toBe('number');
  });

  it('re-throws non-404 errors', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 500'));

    await expect(fetchClassMastery('topic-1', [])).rejects.toThrow('API Error 500');
  });
});

// ============================================================
// Behavioral tests: fetchCustomGraph
// ============================================================

describe('mindmapApi: fetchCustomGraph', () => {
  it('returns mapped custom nodes and edges with isUserCreated flag', async () => {
    mockApiCall
      .mockResolvedValueOnce([{ id: 'cn-1', label: 'Custom Node', definition: 'def', topic_id: 't1' }])
      .mockResolvedValueOnce([{
        id: 'ce-1', source_node_id: 'cn-1', target_node_id: 'kw-1',
        label: 'link', connection_type: 'asociacion',
        line_style: 'dashed', custom_color: '#ff0000', directed: true, arrow_type: 'vee',
      }]);

    const result = await fetchCustomGraph('t1');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: 'cn-1',
      label: 'Custom Node',
      definition: 'def',
      mastery: -1,
      masteryColor: 'gray',
      isUserCreated: true,
      topicId: 't1',
    });

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      id: 'ce-1',
      source: 'cn-1',
      target: 'kw-1',
      label: 'link',
      connectionType: 'asociacion',
      isUserCreated: true,
      lineStyle: 'dashed',
      customColor: '#ff0000',
      directed: true,
      arrowType: 'vee',
    });
  });

  it('returns empty graph on 404 (endpoint not deployed)', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const result = await fetchCustomGraph('t1');
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('re-throws non-404 errors', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 500'));
    await expect(fetchCustomGraph('t1')).rejects.toThrow('API Error 500');
  });

  it('handles {items: [...]} response wrapper for custom endpoints', async () => {
    mockApiCall
      .mockResolvedValueOnce({ items: [{ id: 'cn-1', label: 'N', topic_id: 't1' }] })
      .mockResolvedValueOnce({ items: [] });

    const result = await fetchCustomGraph('t1');
    expect(result.nodes).toHaveLength(1);
  });
});

// ============================================================
// Behavioral tests: CRUD operations
// ============================================================

describe('mindmapApi: createCustomNode', () => {
  it('POSTs to /student-custom-nodes with JSON body', async () => {
    const payload: CreateCustomNodePayload = { label: 'My Node', definition: 'def', topic_id: 't1' };
    const response = { id: 'cn-new', ...payload };
    mockApiCall.mockResolvedValue(response);

    const result = await createCustomNode(payload);
    expect(result).toEqual(response);
    expect(mockApiCall).toHaveBeenCalledWith('/student-custom-nodes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('mindmapApi: deleteCustomNode', () => {
  it('DELETEs /student-custom-nodes/:id', async () => {
    mockApiCall.mockResolvedValue(undefined);
    await deleteCustomNode('cn-1');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/student-custom-nodes/cn-1',
      { method: 'DELETE' },
    );
  });

  it('encodes node ID in URL path', async () => {
    mockApiCall.mockResolvedValue(undefined);
    await deleteCustomNode('id with spaces');
    expect(mockApiCall).toHaveBeenCalledWith(
      `/student-custom-nodes/${encodeURIComponent('id with spaces')}`,
      { method: 'DELETE' },
    );
  });
});

describe('mindmapApi: createCustomEdge', () => {
  it('POSTs to /student-custom-edges with full payload', async () => {
    const payload: CreateCustomEdgePayload = {
      source_node_id: 'n1',
      target_node_id: 'n2',
      label: 'link',
      connection_type: 'asociacion',
      topic_id: 't1',
      line_style: 'dotted',
      custom_color: '#00ff00',
      directed: true,
      arrow_type: 'diamond',
    };
    const response = { id: 'ce-new', ...payload };
    mockApiCall.mockResolvedValue(response);

    const result = await createCustomEdge(payload);
    expect(result).toEqual(response);
    expect(mockApiCall).toHaveBeenCalledWith('/student-custom-edges', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('mindmapApi: deleteCustomEdge', () => {
  it('DELETEs /student-custom-edges/:id', async () => {
    mockApiCall.mockResolvedValue(undefined);
    await deleteCustomEdge('ce-1');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/student-custom-edges/ce-1',
      { method: 'DELETE' },
    );
  });
});

// ============================================================
// Behavioral tests: professor graph templates
// ============================================================

describe('mindmapApi: fetchGraphTemplates', () => {
  it('calls /professor/graph-templates with institution_id and unwraps items', async () => {
    const templates = [{ id: 'gt-1', name: 'Template 1' }];
    mockApiCall.mockResolvedValue({ items: templates });

    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual(templates);
    expect(mockApiCall).toHaveBeenCalledWith(
      expect.stringContaining('/professor/graph-templates?institution_id=inst-1'),
    );
  });

  it('handles bare array response', async () => {
    const templates = [{ id: 'gt-1', name: 'T1' }];
    mockApiCall.mockResolvedValue(templates);

    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual(templates);
  });
});

describe('mindmapApi: createGraphTemplate', () => {
  it('POSTs to /professor/graph-templates', async () => {
    const payload: CreateGraphTemplatePayload = {
      name: 'My Template',
      description: 'desc',
      institution_id: 'inst-1',
      topic_id: 't1',
      nodes: [],
      edges: [],
    };
    const response = { id: 'gt-new', ...payload, professor_id: 'prof-1', created_at: '2026-01-01' };
    mockApiCall.mockResolvedValue(response);

    const result = await createGraphTemplate(payload);
    expect(result).toEqual(response);
    expect(mockApiCall).toHaveBeenCalledWith('/professor/graph-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('mindmapApi: deleteGraphTemplate', () => {
  it('DELETEs /professor/graph-templates/:id', async () => {
    mockApiCall.mockResolvedValue(undefined);
    await deleteGraphTemplate('gt-1');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/professor/graph-templates/gt-1',
      { method: 'DELETE' },
    );
  });
});

// ============================================================
// Error handling: fetchConnectionsBatch (tested via fetchGraphByTopic)
// ============================================================

describe('mindmapApi: connection batch error handling', () => {
  it('throws when ALL connection batches fail', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw-1', name: 'K1', mastery: 0.5 },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);
    mockApiCall.mockRejectedValue(new Error('network failure'));

    await expect(fetchGraphByTopic('t1')).rejects.toThrow(
      'No se pudieron cargar las conexiones del mapa.',
    );
  });

  it('tolerates partial batch failure (some succeed)', async () => {
    // 55 keywords = 2 batches (50 + 5)
    const entries = Array.from({ length: 55 }, (_, i) => ({
      id: `kw-${i}`, name: `K${i}`, mastery: 0.5,
    }));
    const masteryMap = makeMasteryMap(entries);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);

    // First batch succeeds, second fails
    mockApiCall
      .mockResolvedValueOnce([{ id: 'c-1', keyword_a_id: 'kw-0', keyword_b_id: 'kw-1', relationship: 'r' }])
      .mockRejectedValueOnce(new Error('batch 2 failed'));

    const result = await fetchGraphByTopic('t1');
    // Should still have the edge from the successful batch
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// unwrapItems defensive matrix (tested via fetchGraphTemplates)
// ============================================================

describe('mindmapApi: unwrapItems defensive matrix', () => {
  it('returns [] when apiCall resolves null', async () => {
    mockApiCall.mockResolvedValue(null);
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] when apiCall resolves undefined', async () => {
    mockApiCall.mockResolvedValue(undefined);
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] when apiCall resolves a plain object without items key', async () => {
    mockApiCall.mockResolvedValue({ foo: 1, bar: 'baz' });
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] when items is null', async () => {
    mockApiCall.mockResolvedValue({ items: null });
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] when items is a string (not array)', async () => {
    mockApiCall.mockResolvedValue({ items: 'not-an-array' });
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] when items is undefined', async () => {
    mockApiCall.mockResolvedValue({ items: undefined });
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] for empty {items: []}', async () => {
    mockApiCall.mockResolvedValue({ items: [] });
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] for bare empty array', async () => {
    mockApiCall.mockResolvedValue([]);
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] when apiCall resolves a number (defensive)', async () => {
    mockApiCall.mockResolvedValue(42);
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('returns [] when apiCall resolves a string (defensive)', async () => {
    mockApiCall.mockResolvedValue('not-an-object');
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toEqual([]);
  });

  it('preserves array elements as-is when apiCall returns bare array', async () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    mockApiCall.mockResolvedValue(items);
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toBe(items); // same reference: source returns array directly
  });

  it('returns the inner items array when wrapped', async () => {
    const inner = [{ id: 'x' }];
    mockApiCall.mockResolvedValue({ items: inner });
    const result = await fetchGraphTemplates('inst-1');
    expect(result).toBe(inner); // same reference
  });
});

// ============================================================
// isNotFoundError predicate matrix (tested via fetchCustomGraph)
// fetchCustomGraph returns empty on match, re-throws otherwise.
// ============================================================

describe('mindmapApi: isNotFoundError matrix', () => {
  it('matches "API Error 404" (apiCall format)', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const result = await fetchCustomGraph('t1');
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('matches "Invalid response from server (404)" (alt apiCall format)', async () => {
    mockApiCall.mockRejectedValue(new Error('Invalid response from server (404)'));
    const result = await fetchCustomGraph('t1');
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('matches plain "not found" (lowercase)', async () => {
    mockApiCall.mockRejectedValue(new Error('not found'));
    const result = await fetchCustomGraph('t1');
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('matches plain "Not Found" (mixed case)', async () => {
    mockApiCall.mockRejectedValue(new Error('Not Found'));
    const result = await fetchCustomGraph('t1');
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('does NOT match generic 500 errors', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 500'));
    await expect(fetchCustomGraph('t1')).rejects.toThrow('API Error 500');
  });

  it('does NOT match 401 unauthorized', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 401'));
    await expect(fetchCustomGraph('t1')).rejects.toThrow('API Error 401');
  });

  it('does NOT match strings containing "404" without word boundary (e.g., "5404")', async () => {
    mockApiCall.mockRejectedValue(new Error('Error code 5404 occurred'));
    await expect(fetchCustomGraph('t1')).rejects.toThrow('Error code 5404');
  });

  it('does NOT match "Database table not found" (substring not exact match)', async () => {
    // Per source comment: "Database table not found" is a 500 error w/ those words.
    // The check is exact equality msg.toLowerCase() === 'not found', NOT substring.
    mockApiCall.mockRejectedValue(new Error('Database table not found'));
    await expect(fetchCustomGraph('t1')).rejects.toThrow('Database table not found');
  });

  it('handles non-Error thrown string defensively', async () => {
    mockApiCall.mockRejectedValue('not found');
    const result = await fetchCustomGraph('t1');
    // String "not found" → String(e) = 'not found' → matches
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('handles non-Error thrown undefined defensively (no crash)', async () => {
    mockApiCall.mockRejectedValue(undefined);
    // String(undefined) = 'undefined' → doesn't match → re-throws
    await expect(fetchCustomGraph('t1')).rejects.toBeUndefined();
  });

  it('handles non-Error thrown null defensively', async () => {
    mockApiCall.mockRejectedValue(null);
    // String(null) = 'null' → doesn't match → re-throws
    await expect(fetchCustomGraph('t1')).rejects.toBeNull();
  });

  it('matches when 404 appears with surrounding text', async () => {
    mockApiCall.mockRejectedValue(new Error('Server returned 404 status'));
    const result = await fetchCustomGraph('t1');
    expect(result).toEqual({ nodes: [], edges: [] });
  });
});

// ============================================================
// Edge label fallback chain (relationship → connection_type → undefined)
// ============================================================

describe('mindmapApi: edge label fallback', () => {
  function setupTwoNodes() {
    return makeMasteryMap([
      { id: 'a', name: 'A', mastery: 0.5 },
      { id: 'b', name: 'B', mastery: 0.5 },
    ]);
  }

  it('uses relationship when present', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', relationship: 'depends_on', connection_type: 'asociacion' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].label).toBe('depends_on');
  });

  it('falls back to connection_type when relationship missing', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', connection_type: 'causa-efecto' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].label).toBe('causa-efecto');
  });

  it('label is undefined when both relationship and connection_type missing', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].label).toBeUndefined();
  });

  it('falls back when relationship is empty string', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', relationship: '', connection_type: 'jerarquia' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].label).toBe('jerarquia');
  });

  it('connectionType is set independently of label', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', relationship: 'rel', connection_type: 'ct' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].label).toBe('rel');
    expect(result.edges[0].connectionType).toBe('ct');
  });

  it('connectionType is undefined when source has empty connection_type', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', relationship: 'r', connection_type: '' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].connectionType).toBeUndefined();
  });

  it('sourceKeywordId is preserved when set on connection', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', source_keyword_id: 'a' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].sourceKeywordId).toBe('a');
  });

  it('sourceKeywordId is undefined when source connection has empty source_keyword_id', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwoNodes());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', source_keyword_id: '' },
    ]);
    const result = await fetchGraphByTopic('t1');
    expect(result.edges[0].sourceKeywordId).toBeUndefined();
  });
});

// ============================================================
// URL encoding for IDs across endpoints
// ============================================================

describe('mindmapApi: URL encoding', () => {
  it('fetchClassMastery encodes topicId with special chars', async () => {
    mockApiCall.mockResolvedValue([]);
    await fetchClassMastery('topic with spaces & special?', []);
    expect(mockApiCall).toHaveBeenCalledWith(
      `/ai/class-mastery?topic_id=${encodeURIComponent('topic with spaces & special?')}`,
    );
  });

  it('fetchCustomGraph encodes topicId in BOTH endpoints', async () => {
    mockApiCall.mockResolvedValue([]);
    await fetchCustomGraph('t/with/slashes');

    const calls = mockApiCall.mock.calls;
    expect(calls[0][0]).toBe(`/student-custom-nodes?topic_id=${encodeURIComponent('t/with/slashes')}`);
    expect(calls[1][0]).toBe(`/student-custom-edges?topic_id=${encodeURIComponent('t/with/slashes')}`);
  });

  it('fetchGraphTemplates encodes institutionId', async () => {
    mockApiCall.mockResolvedValue([]);
    await fetchGraphTemplates('inst with #hash');
    expect(mockApiCall).toHaveBeenCalledWith(
      `/professor/graph-templates?institution_id=${encodeURIComponent('inst with #hash')}`,
    );
  });

  it('deleteCustomEdge encodes edge ID', async () => {
    mockApiCall.mockResolvedValue(undefined);
    await deleteCustomEdge('edge id with spaces');
    expect(mockApiCall).toHaveBeenCalledWith(
      `/student-custom-edges/${encodeURIComponent('edge id with spaces')}`,
      { method: 'DELETE' },
    );
  });

  it('deleteGraphTemplate encodes template ID', async () => {
    mockApiCall.mockResolvedValue(undefined);
    await deleteGraphTemplate('gt id/with/slashes');
    expect(mockApiCall).toHaveBeenCalledWith(
      `/professor/graph-templates/${encodeURIComponent('gt id/with/slashes')}`,
      { method: 'DELETE' },
    );
  });

  it('fetchConnectionsBatch encodes each keyword ID', async () => {
    const masteryMap = makeMasteryMap([
      { id: 'kw with space', name: 'A', mastery: 0.5 },
      { id: 'kw#hash', name: 'B', mastery: 0.5 },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(masteryMap);
    mockApiCall.mockResolvedValue([]);

    await fetchGraphByTopic('t1');
    const callUrl = mockApiCall.mock.calls[0][0] as string;
    expect(callUrl).toContain(encodeURIComponent('kw with space'));
    expect(callUrl).toContain(encodeURIComponent('kw#hash'));
  });
});

// ============================================================
// CRUD with minimal payloads (optional fields absent)
// ============================================================

describe('mindmapApi: CRUD with minimal payloads', () => {
  it('createCustomNode works without optional definition', async () => {
    const payload: CreateCustomNodePayload = { label: 'Just a label', topic_id: 't1' };
    const response = { id: 'cn-min', label: 'Just a label', topic_id: 't1' };
    mockApiCall.mockResolvedValue(response);

    const result = await createCustomNode(payload);
    expect(result).toEqual(response);
    expect(mockApiCall).toHaveBeenCalledWith('/student-custom-nodes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('createCustomEdge works without optional fields', async () => {
    const payload: CreateCustomEdgePayload = {
      source_node_id: 'a',
      target_node_id: 'b',
      topic_id: 't1',
    };
    const response = { id: 'ce-min', ...payload };
    mockApiCall.mockResolvedValue(response);

    const result = await createCustomEdge(payload);
    expect(result).toEqual(response);
    const body = (mockApiCall.mock.calls[0][1] as { body: string }).body;
    const parsed = JSON.parse(body);
    expect(parsed.line_style).toBeUndefined();
    expect(parsed.custom_color).toBeUndefined();
    expect(parsed.directed).toBeUndefined();
    expect(parsed.arrow_type).toBeUndefined();
  });

  it('createCustomNode propagates non-404 errors to caller', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 500'));
    await expect(
      createCustomNode({ label: 'x', topic_id: 't1' }),
    ).rejects.toThrow('API Error 500');
  });

  it('createCustomEdge propagates non-404 errors to caller', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 500'));
    await expect(
      createCustomEdge({ source_node_id: 'a', target_node_id: 'b', topic_id: 't1' }),
    ).rejects.toThrow('API Error 500');
  });

  it('deleteCustomNode propagates errors', async () => {
    mockApiCall.mockRejectedValue(new Error('Forbidden'));
    await expect(deleteCustomNode('cn-1')).rejects.toThrow('Forbidden');
  });

  it('createCustomNode does NOT swallow 404 errors (write semantics)', async () => {
    // Reads use 404 fallbacks, but writes should propagate 404s (no fallback for create)
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    await expect(
      createCustomNode({ label: 'x', topic_id: 't1' }),
    ).rejects.toThrow('API Error 404');
  });

  it('createCustomEdge serializes all 4 styling fields when set', async () => {
    const payload: CreateCustomEdgePayload = {
      source_node_id: 's',
      target_node_id: 't',
      topic_id: 'tt',
      line_style: 'dashed',
      custom_color: '#abcdef',
      directed: false,
      arrow_type: 'circle',
    };
    mockApiCall.mockResolvedValue({ id: 'x', ...payload });
    await createCustomEdge(payload);
    const parsed = JSON.parse((mockApiCall.mock.calls[0][1] as { body: string }).body);
    expect(parsed.line_style).toBe('dashed');
    expect(parsed.custom_color).toBe('#abcdef');
    expect(parsed.directed).toBe(false);
    expect(parsed.arrow_type).toBe('circle');
  });

  it('createGraphTemplate works without optional description', async () => {
    const payload: CreateGraphTemplatePayload = {
      name: 'Plain',
      institution_id: 'inst-1',
      topic_id: 't1',
      nodes: [],
      edges: [],
    };
    mockApiCall.mockResolvedValue({ id: 'gt-1', ...payload });
    await createGraphTemplate(payload);
    const parsed = JSON.parse((mockApiCall.mock.calls[0][1] as { body: string }).body);
    expect(parsed.description).toBeUndefined();
    expect(parsed.name).toBe('Plain');
  });

  it('createGraphTemplate propagates errors', async () => {
    mockApiCall.mockRejectedValue(new Error('Forbidden'));
    await expect(
      createGraphTemplate({
        name: 'x',
        institution_id: 'i',
        topic_id: 't',
        nodes: [],
        edges: [],
      }),
    ).rejects.toThrow('Forbidden');
  });
});

// ============================================================
// fetchClassMastery mock-data shape constraints
// ============================================================

describe('mindmapApi: fetchClassMastery mock data shape (DEV 404 fallback)', () => {
  it('returns empty array on 404 with empty graphNodes', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const result = await fetchClassMastery('t1', []);
    expect(result).toEqual([]);
  });

  it('avg_mastery is in [0.10, 0.95] range', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const nodes = Array.from({ length: 50 }, (_, i) => ({
      id: `kw-${i}`,
      label: `K${i}`,
      type: 'keyword' as const,
      mastery: 0.5,
      masteryColor: 'yellow' as const,
    }));
    const result = await fetchClassMastery('t1', nodes);
    for (const r of result) {
      expect(r.avg_mastery).toBeGreaterThanOrEqual(0.10);
      expect(r.avg_mastery).toBeLessThanOrEqual(0.95);
    }
  });

  it('student_count is at least 5', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const nodes = Array.from({ length: 30 }, (_, i) => ({
      id: `kw-${i}`,
      label: `K${i}`,
      type: 'keyword' as const,
      mastery: 0.5,
      masteryColor: 'yellow' as const,
    }));
    const result = await fetchClassMastery('t1', nodes);
    for (const r of result) {
      expect(r.student_count).toBeGreaterThanOrEqual(5);
    }
  });

  it('weak_student_count is bounded by min(student_count, 10)', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const nodes = Array.from({ length: 30 }, (_, i) => ({
      id: `kw-${i}`,
      label: `K${i}`,
      type: 'keyword' as const,
      mastery: 0.5,
      masteryColor: 'yellow' as const,
    }));
    const result = await fetchClassMastery('t1', nodes);
    for (const r of result) {
      expect(r.weak_student_count).toBeGreaterThanOrEqual(0);
      expect(r.weak_student_count).toBeLessThanOrEqual(Math.min(r.student_count, 10));
    }
  });

  it('preserves keyword_id and keyword_name from input nodes', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const nodes = [
      { id: 'kw-alpha', label: 'Alpha', type: 'keyword' as const, mastery: 0.5, masteryColor: 'yellow' as const },
      { id: 'kw-beta', label: 'Beta', type: 'keyword' as const, mastery: 0.8, masteryColor: 'green' as const },
    ];
    const result = await fetchClassMastery('t1', nodes);
    expect(result[0].keyword_id).toBe('kw-alpha');
    expect(result[0].keyword_name).toBe('Alpha');
    expect(result[1].keyword_id).toBe('kw-beta');
    expect(result[1].keyword_name).toBe('Beta');
  });

  it('output array length matches input graphNodes length', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error 404'));
    const nodes = Array.from({ length: 7 }, (_, i) => ({
      id: `kw-${i}`,
      label: `K${i}`,
      type: 'keyword' as const,
      mastery: 0.5,
      masteryColor: 'yellow' as const,
    }));
    const result = await fetchClassMastery('t1', nodes);
    expect(result).toHaveLength(7);
  });
});

// ============================================================
// fetchGraphByCourse edge cases
// ============================================================

describe('mindmapApi: fetchGraphByCourse edge cases', () => {
  it('keyword belonging to multiple topics — last topic wins in topicMap', async () => {
    const map1 = makeMasteryMap([{ id: 'kw-shared', name: 'Shared', mastery: 0.5 }]);
    const map2 = makeMasteryMap([{ id: 'kw-shared', name: 'Shared', mastery: 0.6 }]);

    mockFetchMasteryByTopic
      .mockResolvedValueOnce(map1)
      .mockResolvedValueOnce(map2);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByCourse(['t1', 't2']);
    expect(result.nodes).toHaveLength(1);
    // last-write-wins: t2 overwrote t1 in topicMap
    expect(result.nodes[0].topicId).toBe('t2');
  });

  it('preserves successful topic when failure is at index 0', async () => {
    const map2 = makeMasteryMap([{ id: 'kw-2', name: 'K2', mastery: 0.5 }]);
    mockFetchMasteryByTopic
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce(map2);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByCourse(['t1', 't2']);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('kw-2');
    expect(result.nodes[0].topicId).toBe('t2');
  });

  it('preserves successful topic when failure is at last index', async () => {
    const map1 = makeMasteryMap([{ id: 'kw-1', name: 'K1', mastery: 0.5 }]);
    mockFetchMasteryByTopic
      .mockResolvedValueOnce(map1)
      .mockRejectedValueOnce(new Error('last failed'));
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByCourse(['t1', 't2']);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('kw-1');
    expect(result.nodes[0].topicId).toBe('t1');
  });

  it('builds connections call only once (single batch) for merged keywords', async () => {
    const map1 = makeMasteryMap([{ id: 'kw-1', name: 'K1', mastery: 0.5 }]);
    const map2 = makeMasteryMap([{ id: 'kw-2', name: 'K2', mastery: 0.5 }]);
    mockFetchMasteryByTopic
      .mockResolvedValueOnce(map1)
      .mockResolvedValueOnce(map2);
    mockApiCall.mockResolvedValue([]);

    await fetchGraphByCourse(['t1', 't2']);
    // 2 mastery calls + 1 connections call (both keywords fit in MAX_BATCH=50)
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// MAX_BATCH=50 boundary verification
// ============================================================

describe('mindmapApi: MAX_BATCH boundary', () => {
  it('exactly 50 keywords → 1 connections call', async () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      id: `kw-${i}`, name: `K${i}`, mastery: 0.5,
    }));
    mockFetchMasteryByTopic.mockResolvedValue(makeMasteryMap(entries));
    mockApiCall.mockResolvedValue([]);

    await fetchGraphByTopic('t1');
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('51 keywords → 2 connections calls', async () => {
    const entries = Array.from({ length: 51 }, (_, i) => ({
      id: `kw-${i}`, name: `K${i}`, mastery: 0.5,
    }));
    mockFetchMasteryByTopic.mockResolvedValue(makeMasteryMap(entries));
    mockApiCall.mockResolvedValue([]);

    await fetchGraphByTopic('t1');
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('100 keywords → 2 connections calls (50 + 50)', async () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      id: `kw-${i}`, name: `K${i}`, mastery: 0.5,
    }));
    mockFetchMasteryByTopic.mockResolvedValue(makeMasteryMap(entries));
    mockApiCall.mockResolvedValue([]);

    await fetchGraphByTopic('t1');
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('101 keywords → 3 connections calls (50 + 50 + 1)', async () => {
    const entries = Array.from({ length: 101 }, (_, i) => ({
      id: `kw-${i}`, name: `K${i}`, mastery: 0.5,
    }));
    mockFetchMasteryByTopic.mockResolvedValue(makeMasteryMap(entries));
    mockApiCall.mockResolvedValue([]);

    await fetchGraphByTopic('t1');
    expect(mockApiCall).toHaveBeenCalledTimes(3);
  });

  it('1 keyword → 1 connections call', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(
      makeMasteryMap([{ id: 'only', name: 'Only', mastery: 0.5 }]),
    );
    mockApiCall.mockResolvedValue([]);

    await fetchGraphByTopic('t1');
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('zero keywords → zero connections calls (empty mastery short-circuits)', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(new Map());
    await fetchGraphByTopic('t1');
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

// ============================================================
// buildGraphData direction & node attribute matrix
// ============================================================

describe('mindmapApi: buildGraphData node attributes', () => {
  it('node definition is undefined when info.definition is empty string', async () => {
    const map = makeMasteryMap([
      { id: 'kw', name: 'K', mastery: 0.5, definition: '' },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(map);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByTopic('t1');
    expect(result.nodes[0].definition).toBeUndefined();
  });

  it('node definition is preserved when present', async () => {
    const map = makeMasteryMap([
      { id: 'kw', name: 'K', mastery: 0.5, definition: 'A keyword definition' },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(map);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByTopic('t1');
    expect(result.nodes[0].definition).toBe('A keyword definition');
  });

  it('node has type === "keyword" always', async () => {
    const map = makeMasteryMap([
      { id: 'a', name: 'A', mastery: 0.0 },
      { id: 'b', name: 'B', mastery: 1.0 },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(map);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByTopic('t1');
    for (const n of result.nodes) {
      expect(n.type).toBe('keyword');
    }
  });

  it('flashcardCount and quizCount are NOT set on auto nodes (undefined)', async () => {
    // Per source comment: "Leaving undefined avoids misleading the UI into showing 0".
    const map = makeMasteryMap([{ id: 'kw', name: 'K', mastery: 0.5 }]);
    mockFetchMasteryByTopic.mockResolvedValue(map);
    mockApiCall.mockResolvedValue([]);

    const result = await fetchGraphByTopic('t1');
    expect(result.nodes[0].flashcardCount).toBeUndefined();
    expect(result.nodes[0].quizCount).toBeUndefined();
  });

  it('mastery 0 → red (boundary)', async () => {
    const map = makeMasteryMap([{ id: 'kw', name: 'K', mastery: 0 }]);
    mockFetchMasteryByTopic.mockResolvedValue(map);
    mockApiCall.mockResolvedValue([]);
    const result = await fetchGraphByTopic('t1');
    expect(result.nodes[0].masteryColor).toBe('red');
  });

  it('mastery 1.0 → green (boundary)', async () => {
    const map = makeMasteryMap([{ id: 'kw', name: 'K', mastery: 1.0 }]);
    mockFetchMasteryByTopic.mockResolvedValue(map);
    mockApiCall.mockResolvedValue([]);
    const result = await fetchGraphByTopic('t1');
    expect(result.nodes[0].masteryColor).toBe('green');
  });

  it('node summaryId reflects info.summary_id', async () => {
    const map = makeMasteryMap([
      { id: 'kw', name: 'K', mastery: 0.5, summary_id: 'sum-special-1' },
    ]);
    mockFetchMasteryByTopic.mockResolvedValue(map);
    mockApiCall.mockResolvedValue([]);
    const result = await fetchGraphByTopic('t1');
    expect(result.nodes[0].summaryId).toBe('sum-special-1');
  });
});

// ============================================================
// buildGraphData direction matrix (extended)
// ============================================================

describe('mindmapApi: edge direction matrix', () => {
  function setupTwo() {
    return makeMasteryMap([
      { id: 'a', name: 'A', mastery: 0.5 },
      { id: 'b', name: 'B', mastery: 0.5 },
    ]);
  }

  it('source_keyword_id === keyword_a_id → source=a target=b', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwo());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', source_keyword_id: 'a' },
    ]);
    const r = await fetchGraphByTopic('t1');
    expect(r.edges[0].source).toBe('a');
    expect(r.edges[0].target).toBe('b');
  });

  it('source_keyword_id === keyword_b_id → source=b target=a', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwo());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', source_keyword_id: 'b' },
    ]);
    const r = await fetchGraphByTopic('t1');
    expect(r.edges[0].source).toBe('b');
    expect(r.edges[0].target).toBe('a');
  });

  it('source_keyword_id is null → defaults to keyword_a -> keyword_b', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwo());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', source_keyword_id: null },
    ]);
    const r = await fetchGraphByTopic('t1');
    expect(r.edges[0].source).toBe('a');
    expect(r.edges[0].target).toBe('b');
  });

  it('source_keyword_id is undefined → defaults to keyword_a -> keyword_b', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwo());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b' },
    ]);
    const r = await fetchGraphByTopic('t1');
    expect(r.edges[0].source).toBe('a');
    expect(r.edges[0].target).toBe('b');
  });

  it('source_keyword_id is empty string → defaults to keyword_a -> keyword_b', async () => {
    mockFetchMasteryByTopic.mockResolvedValue(setupTwo());
    mockApiCall.mockResolvedValue([
      { id: 'c', keyword_a_id: 'a', keyword_b_id: 'b', source_keyword_id: '' },
    ]);
    const r = await fetchGraphByTopic('t1');
    expect(r.edges[0].source).toBe('a');
    expect(r.edges[0].target).toBe('b');
  });
});

// ============================================================
// fetchCustomGraph edge attribute completeness
// ============================================================

describe('mindmapApi: fetchCustomGraph attribute completeness', () => {
  it('omits arrowType when source returns no arrow_type', async () => {
    mockApiCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'ce', source_node_id: 's', target_node_id: 't',
      }]);
    const r = await fetchCustomGraph('t1');
    expect(r.edges[0].arrowType).toBeUndefined();
    expect(r.edges[0].directed).toBeUndefined();
    expect(r.edges[0].lineStyle).toBeUndefined();
    expect(r.edges[0].customColor).toBeUndefined();
  });

  it('preserves all 4 styling attributes from server response', async () => {
    mockApiCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'ce', source_node_id: 's', target_node_id: 't',
        line_style: 'dotted', custom_color: '#123456', directed: false, arrow_type: 'triangle',
      }]);
    const r = await fetchCustomGraph('t1');
    expect(r.edges[0].lineStyle).toBe('dotted');
    expect(r.edges[0].customColor).toBe('#123456');
    expect(r.edges[0].directed).toBe(false);
    expect(r.edges[0].arrowType).toBe('triangle');
  });

  it('custom node missing definition → definition is undefined', async () => {
    mockApiCall
      .mockResolvedValueOnce([{ id: 'cn', label: 'L', topic_id: 't1' }])
      .mockResolvedValueOnce([]);
    const r = await fetchCustomGraph('t1');
    expect(r.nodes[0].definition).toBeUndefined();
  });

  it('all custom nodes get masteryColor=gray uniformly', async () => {
    mockApiCall
      .mockResolvedValueOnce([
        { id: 'a', label: 'A', topic_id: 't1' },
        { id: 'b', label: 'B', topic_id: 't1' },
        { id: 'c', label: 'C', topic_id: 't1' },
      ])
      .mockResolvedValueOnce([]);
    const r = await fetchCustomGraph('t1');
    for (const n of r.nodes) {
      expect(n.masteryColor).toBe('gray');
      expect(n.mastery).toBe(-1);
      expect(n.isUserCreated).toBe(true);
    }
  });

  it('all custom edges get isUserCreated=true', async () => {
    mockApiCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'a', source_node_id: 'x', target_node_id: 'y' },
        { id: 'b', source_node_id: 'y', target_node_id: 'z' },
      ]);
    const r = await fetchCustomGraph('t1');
    for (const e of r.edges) {
      expect(e.isUserCreated).toBe(true);
    }
  });

  it('handles mixed-shape responses (array for nodes, items wrapper for edges)', async () => {
    mockApiCall
      .mockResolvedValueOnce([{ id: 'cn', label: 'N', topic_id: 't1' }])
      .mockResolvedValueOnce({ items: [{ id: 'ce', source_node_id: 'cn', target_node_id: 'kw' }] });
    const r = await fetchCustomGraph('t1');
    expect(r.nodes).toHaveLength(1);
    expect(r.edges).toHaveLength(1);
  });

  it('returns empty graph when both responses are empty', async () => {
    mockApiCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const r = await fetchCustomGraph('t1');
    expect(r).toEqual({ nodes: [], edges: [] });
  });
});

// ============================================================
// fetchClassMastery URL construction (passing case)
// ============================================================

describe('mindmapApi: fetchClassMastery URL construction', () => {
  it('uses GET (no method override → default)', async () => {
    mockApiCall.mockResolvedValue([]);
    await fetchClassMastery('t1', []);
    // apiCall called with only URL (no options) — default is GET
    expect(mockApiCall).toHaveBeenCalledWith(expect.any(String));
    const call = mockApiCall.mock.calls[0];
    expect(call.length).toBe(1); // only URL, no options object
  });

  it('encodes empty topicId as empty string segment', async () => {
    mockApiCall.mockResolvedValue([]);
    await fetchClassMastery('', []);
    expect(mockApiCall).toHaveBeenCalledWith('/ai/class-mastery?topic_id=');
  });
});
