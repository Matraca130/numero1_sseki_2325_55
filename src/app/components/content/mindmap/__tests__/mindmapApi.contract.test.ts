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
