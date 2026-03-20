// ============================================================
// Tests -- AddNodeEdgeModal contract + logic tests
//
// Tests the pure logic and contract of AddNodeEdgeModal:
//   - Module export shape and props interface
//   - Node creation: validation, payload construction, callbacks
//   - Edge creation: validation, self-loop guard, payload construction
//   - Tab switching behavior
//   - Escape key / backdrop close (with savingRef guard)
//   - State reset on close/reopen
//   - Pre-filled initial props
//   - Accessibility attributes
//
// Pattern: source-based contract checks + replicated pure logic.
// No React rendering (no RTL).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const COMPONENT_PATH = resolve(__dirname, '..', 'AddNodeEdgeModal.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Mock dependencies ───────────────────────────────────────

const mockCreateNode = vi.fn();
const mockCreateEdge = vi.fn();

vi.mock('@/app/services/mindmapApi', () => ({
  createCustomNode: (...args: unknown[]) => mockCreateNode(...args),
  createCustomEdge: (...args: unknown[]) => mockCreateEdge(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Types (mirror internal types for payload testing) ───────

interface CreateCustomNodePayload {
  label: string;
  definition?: string;
  topic_id: string;
}

interface CreateCustomEdgePayload {
  source_node_id: string;
  target_node_id: string;
  label?: string;
  connection_type?: string;
  topic_id: string;
  line_style?: 'dashed' | 'dotted';
  custom_color?: string;
  directed?: boolean;
  arrow_type?: 'triangle' | 'diamond' | 'circle' | 'vee';
}

// ── Module contract ─────────────────────────────────────────

describe('AddNodeEdgeModal: module contract', () => {
  it('exports a named function AddNodeEdgeModal', () => {
    expect(source).toMatch(/export\s+(const\s+AddNodeEdgeModal\s*=\s*memo\s*\(\s*function\s+AddNodeEdgeModal|function\s+AddNodeEdgeModal)/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('exports the TabType type', () => {
    expect(source).toMatch(/export\s+type\s+TabType/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('AddNodeEdgeModal: props interface', () => {
  it('requires open, onClose, topicId, existingNodes, onCreated', () => {
    expect(source).toContain('open: boolean');
    expect(source).toContain('onClose: () => void');
    expect(source).toContain('topicId: string');
    expect(source).toContain('existingNodes: MapNode[]');
    expect(source).toContain('onCreated: () => void');
  });

  it('has optional callback props onNodeCreated and onEdgeCreated', () => {
    expect(source).toContain('onNodeCreated?:');
    expect(source).toContain('onEdgeCreated?:');
  });

  it('has optional initial edge props for prefill', () => {
    expect(source).toContain('initialEdgeSource?: string');
    expect(source).toContain('initialEdgeTarget?: string');
    expect(source).toContain('initialTab?: TabType');
  });
});

// ── Node creation: validation logic ─────────────────────────

describe('AddNodeEdgeModal: node creation validation', () => {
  // Replicate the guard condition from handleCreateNode
  function isNodeValid(label: string, saving: boolean): boolean {
    return !!label.trim() && !saving;
  }

  it('rejects empty label', () => {
    expect(isNodeValid('', false)).toBe(false);
  });

  it('rejects whitespace-only label', () => {
    expect(isNodeValid('   ', false)).toBe(false);
    expect(isNodeValid('\t\n', false)).toBe(false);
  });

  it('accepts non-empty trimmed label', () => {
    expect(isNodeValid('Hemoglobina', false)).toBe(true);
    expect(isNodeValid('  Mitocondria  ', false)).toBe(true);
  });

  it('rejects when saving is in progress (savingRef guard)', () => {
    expect(isNodeValid('Valid Label', true)).toBe(false);
  });

  it('source contains the guard condition', () => {
    expect(source).toContain('if (!nodeLabel.trim() || savingRef.current) return');
  });
});

// ── Node creation: payload construction ─────────────────────

describe('AddNodeEdgeModal: node payload construction', () => {
  // Replicate the payload builder from handleCreateNode
  function buildNodePayload(
    nodeLabel: string,
    nodeDefinition: string,
    topicId: string,
  ): CreateCustomNodePayload {
    return {
      label: nodeLabel.trim(),
      definition: nodeDefinition.trim() || undefined,
      topic_id: topicId,
    };
  }

  it('trims the label', () => {
    const payload = buildNodePayload('  Hemoglobina  ', '', 'topic-1');
    expect(payload.label).toBe('Hemoglobina');
  });

  it('sets definition to undefined when empty', () => {
    const payload = buildNodePayload('Test', '', 'topic-1');
    expect(payload.definition).toBeUndefined();
  });

  it('sets definition to undefined when whitespace-only', () => {
    const payload = buildNodePayload('Test', '   ', 'topic-1');
    expect(payload.definition).toBeUndefined();
  });

  it('preserves trimmed definition when provided', () => {
    const payload = buildNodePayload('Test', '  A protein  ', 'topic-1');
    expect(payload.definition).toBe('A protein');
  });

  it('passes topic_id as-is', () => {
    const payload = buildNodePayload('Test', '', 'uuid-abc-123');
    expect(payload.topic_id).toBe('uuid-abc-123');
  });
});

// ── Node creation: callbacks & side effects ─────────────────

describe('AddNodeEdgeModal: node creation callbacks', () => {
  it('calls createCustomNode API', () => {
    expect(source).toContain('const res = await createCustomNode(payload)');
  });

  it('calls onNodeCreated with id and payload after success', () => {
    expect(source).toContain('onNodeCreated?.(res.id, payload)');
  });

  it('calls onCreated after success', () => {
    // onCreated appears after onNodeCreated in handleCreateNode
    const handleCreateNodeBlock = source.slice(
      source.indexOf('const handleCreateNode'),
      source.indexOf('const handleCreateEdge'),
    );
    expect(handleCreateNodeBlock).toContain('onCreated()');
  });

  it('calls onClose after successful creation', () => {
    const handleCreateNodeBlock = source.slice(
      source.indexOf('const handleCreateNode'),
      source.indexOf('const handleCreateEdge'),
    );
    expect(handleCreateNodeBlock).toContain('onClose()');
  });

  it('shows success toast on node creation', () => {
    // Use regex to avoid encoding issues with ñ
    expect(source).toMatch(/toast\.success\(.Concepto a.adido al mapa.\)/);
  });

  it('shows error toast on failure', () => {
    expect(source).toContain("toast.error(err instanceof Error ? err.message : 'Error al crear concepto')");
  });

  it('resets savingRef in finally block', () => {
    expect(source).toContain('savingRef.current = false');
  });

  it('checks mountedRef before calling setSaving in finally', () => {
    expect(source).toContain('if (mountedRef.current) setSaving(false)');
  });
});

// ── Edge creation: validation logic ─────────────────────────

describe('AddNodeEdgeModal: edge creation validation', () => {
  // Replicate the guard condition from handleCreateEdge
  function isEdgeValid(
    source: string,
    target: string,
    saving: boolean,
  ): boolean {
    return !!source && !!target && source !== target && !saving;
  }

  it('rejects empty source', () => {
    expect(isEdgeValid('', 'node-2', false)).toBe(false);
  });

  it('rejects empty target', () => {
    expect(isEdgeValid('node-1', '', false)).toBe(false);
  });

  it('rejects same source and target (self-loop)', () => {
    expect(isEdgeValid('node-1', 'node-1', false)).toBe(false);
  });

  it('rejects when saving is in progress', () => {
    expect(isEdgeValid('node-1', 'node-2', true)).toBe(false);
  });

  it('accepts valid distinct source and target', () => {
    expect(isEdgeValid('node-1', 'node-2', false)).toBe(true);
  });

  it('source contains the guard condition', () => {
    expect(source).toContain(
      'if (!edgeSource || !edgeTarget || edgeSource === edgeTarget || savingRef.current) return',
    );
  });
});

// ── Edge creation: self-loop useEffect guard ────────────────

describe('AddNodeEdgeModal: self-loop prevention effect', () => {
  it('clears target when it matches source via useEffect', () => {
    // The component has a useEffect that resets edgeTarget if it equals edgeSource
    expect(source).toContain("if (edgeSource && edgeSource === edgeTarget) setEdgeTarget('')");
  });
});

// ── Edge creation: payload construction ─────────────────────

describe('AddNodeEdgeModal: edge payload construction', () => {
  const DEFAULT_COLOR = '#6366f1'; // placeholder for colors.primary[500]

  // Replicate the payload builder from handleCreateEdge
  function buildEdgePayload(opts: {
    edgeSource: string;
    edgeTarget: string;
    edgeLabel: string;
    edgeType: string;
    topicId: string;
    edgeLineStyle: 'solid' | 'dashed' | 'dotted';
    edgeColor: string;
    edgeDirected: boolean;
    edgeArrowType: 'triangle' | 'diamond' | 'circle' | 'vee';
    defaultColor: string;
  }): CreateCustomEdgePayload {
    return {
      source_node_id: opts.edgeSource,
      target_node_id: opts.edgeTarget,
      label: opts.edgeLabel.trim() || undefined,
      connection_type: opts.edgeType,
      topic_id: opts.topicId,
      line_style: opts.edgeLineStyle !== 'solid' ? (opts.edgeLineStyle as 'dashed' | 'dotted') : undefined,
      custom_color: opts.edgeColor !== opts.defaultColor ? opts.edgeColor : undefined,
      directed: opts.edgeDirected || undefined,
      arrow_type: opts.edgeDirected && opts.edgeArrowType !== 'triangle' ? opts.edgeArrowType : undefined,
    };
  }

  it('sets source_node_id and target_node_id', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.source_node_id).toBe('n1');
    expect(payload.target_node_id).toBe('n2');
  });

  it('sets label to undefined when empty', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.label).toBeUndefined();
  });

  it('trims label when provided', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '  regula  ',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.label).toBe('regula');
  });

  it('omits line_style when solid (default)', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.line_style).toBeUndefined();
  });

  it('includes line_style when dashed', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'dashed',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.line_style).toBe('dashed');
  });

  it('includes line_style when dotted', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'dotted',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.line_style).toBe('dotted');
  });

  it('omits custom_color when it matches default', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.custom_color).toBeUndefined();
  });

  it('includes custom_color when different from default', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: '#ff0000',
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.custom_color).toBe('#ff0000');
  });

  it('omits directed when false (falsy evaluates to undefined)', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.directed).toBeUndefined();
  });

  it('includes directed when true', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'prerequisito',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: true,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.directed).toBe(true);
  });

  it('omits arrow_type when not directed', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'asociacion',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: false,
      edgeArrowType: 'diamond',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.arrow_type).toBeUndefined();
  });

  it('omits arrow_type when directed but type is triangle (default)', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'prerequisito',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: true,
      edgeArrowType: 'triangle',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.arrow_type).toBeUndefined();
  });

  it('includes arrow_type when directed and non-default', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'prerequisito',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: true,
      edgeArrowType: 'diamond',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.arrow_type).toBe('diamond');
  });

  it('includes arrow_type vee when directed', () => {
    const payload = buildEdgePayload({
      edgeSource: 'n1',
      edgeTarget: 'n2',
      edgeLabel: '',
      edgeType: 'prerequisito',
      topicId: 'topic-1',
      edgeLineStyle: 'solid',
      edgeColor: DEFAULT_COLOR,
      edgeDirected: true,
      edgeArrowType: 'vee',
      defaultColor: DEFAULT_COLOR,
    });
    expect(payload.arrow_type).toBe('vee');
  });
});

// ── Edge creation: callbacks & side effects ─────────────────

describe('AddNodeEdgeModal: edge creation callbacks', () => {
  it('calls createCustomEdge API', () => {
    expect(source).toContain('const res = await createCustomEdge(payload)');
  });

  it('calls onEdgeCreated with id and payload after success', () => {
    expect(source).toContain('onEdgeCreated?.(res.id, payload)');
  });

  it('calls onCreated after success', () => {
    const edgeStart = source.indexOf('const handleCreateEdge');
    const firstClose = source.indexOf('};', edgeStart + 50);
    const edgeEnd = source.indexOf('};', firstClose + 1);
    const handleCreateEdgeBlock = source.slice(edgeStart, edgeEnd);
    expect(handleCreateEdgeBlock).toContain('onCreated()');
  });

  it('calls onClose after successful creation', () => {
    const edgeStart = source.indexOf('const handleCreateEdge');
    const firstClose = source.indexOf('};', edgeStart + 50);
    const edgeEnd = source.indexOf('};', firstClose + 1);
    const handleCreateEdgeBlock = source.slice(edgeStart, edgeEnd);
    expect(handleCreateEdgeBlock).toContain('onClose()');
  });

  it('shows success toast on edge creation', () => {
    // Use regex to avoid encoding issues with ó
    expect(source).toMatch(/toast\.success\(.Conexi.n a.adida al mapa.\)/);
  });

  it('shows error toast on failure', () => {
    expect(source).toContain("toast.error(err instanceof Error ? err.message : 'Error al crear conexión')");
  });
});

// ── Tab switching ───────────────────────────────────────────

describe('AddNodeEdgeModal: tab switching', () => {
  it('defines two tabs: node and edge', () => {
    expect(source).toContain("type TabType = 'node' | 'edge'");
  });

  it('defaults to node tab', () => {
    expect(source).toContain("useState<TabType>(initialTab || 'node')");
  });

  it('has tab buttons for Nuevo concepto and Nueva conexion', () => {
    expect(source).toContain('Nuevo concepto');
    expect(source).toContain('Nueva conexión');
  });

  it('supports arrow key navigation between tabs', () => {
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("setTab(tab === 'node' ? 'edge' : 'node')");
  });

  it('uses role="tablist" and role="tab"', () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
  });

  it('uses aria-selected to indicate active tab', () => {
    expect(source).toContain("aria-selected={tab === 'node'}");
    expect(source).toContain("aria-selected={tab === 'edge'}");
  });

  it('renders node form in tabpanel when tab is node', () => {
    expect(source).toContain("tab === 'node'");
    expect(source).toContain('id="add-node-panel"');
    expect(source).toContain('role="tabpanel"');
  });

  it('renders edge form in tabpanel when tab is edge', () => {
    expect(source).toContain('id="add-edge-panel"');
  });
});

// ── Initial props (prefill) ─────────────────────────────────

describe('AddNodeEdgeModal: initial props prefill', () => {
  it('applies initialTab when modal opens', () => {
    expect(source).toContain('if (initialTab) setTab(initialTab)');
  });

  it('applies initialEdgeSource when modal opens', () => {
    expect(source).toContain("setEdgeSource(initialEdgeSource || '')");
  });

  it('sets directed=true when initialEdgeSource is provided (connect tool default)', () => {
    expect(source).toContain('if (initialEdgeSource) setEdgeDirected(true); // Connect tool defaults to directed');
  });

  it('applies initialEdgeTarget when modal opens', () => {
    expect(source).toContain("setEdgeTarget(initialEdgeTarget || '')");
  });

  it('initializes edgeDirected from initialEdgeSource', () => {
    // At state initialization level
    expect(source).toContain('useState(!!initialEdgeSource)');
  });
});

// ── Escape key and backdrop close ───────────────────────────

describe('AddNodeEdgeModal: close behavior', () => {
  it('listens for Escape key when open', () => {
    expect(source).toContain("if (e.key === 'Escape' && !savingRef.current)");
  });

  it('blocks Escape close during save (savingRef guard)', () => {
    // The condition checks savingRef.current before calling onClose
    expect(source).toContain("e.key === 'Escape' && !savingRef.current");
  });

  it('backdrop click calls onClose when not saving', () => {
    expect(source).toContain('if (!savingRef.current) onClose()');
  });

  it('registers and cleans up keydown listener', () => {
    expect(source).toContain("document.addEventListener('keydown', handleKey)");
    expect(source).toContain("document.removeEventListener('keydown', handleKey)");
  });

  it('locks body scroll when open', () => {
    expect(source).toContain("document.documentElement.style.overflow = 'hidden'");
    expect(source).toContain("document.body.style.overflow = 'hidden'");
  });

  it('restores body scroll on cleanup (saves/restores original values)', () => {
    expect(source).toContain('document.documentElement.style.overflow = prevHtml');
    expect(source).toContain('document.body.style.overflow = prevBody');
  });
});

// ── State reset ─────────────────────────────────────────────

describe('AddNodeEdgeModal: state reset on close', () => {
  it('resets forms when open becomes false', () => {
    // The useEffect on [open] calls resetForms() when !open
    expect(source).toContain('if (!open) {');
    expect(source).toContain('resetForms()');
  });

  it('resets tab to node when closing', () => {
    expect(source).toContain("setTab('node')");
  });

  it('resetForms clears all node form fields', () => {
    const resetBlock = source.slice(
      source.indexOf('const resetForms'),
      source.indexOf('const handleCreateNode'),
    );
    expect(resetBlock).toContain("setNodeLabel('')");
    expect(resetBlock).toContain("setNodeDefinition('')");
  });

  it('resetForms clears all edge form fields', () => {
    const resetBlock = source.slice(
      source.indexOf('const resetForms'),
      source.indexOf('const handleCreateNode'),
    );
    expect(resetBlock).toContain("setEdgeSource('')");
    expect(resetBlock).toContain("setEdgeTarget('')");
    expect(resetBlock).toContain("setEdgeLabel('')");
    expect(resetBlock).toContain("setEdgeType('asociacion')");
    expect(resetBlock).toContain('setEdgeDirected(false)');
    expect(resetBlock).toContain("setEdgeLineStyle('solid')");
    expect(resetBlock).toContain("setEdgeArrowType('triangle')");
  });

  it('resetForms is called after successful node creation', () => {
    const handleCreateNodeBlock = source.slice(
      source.indexOf('const handleCreateNode'),
      source.indexOf('const handleCreateEdge'),
    );
    expect(handleCreateNodeBlock).toContain('resetForms()');
  });

  it('resetForms is called after successful edge creation', () => {
    const edgeStart = source.indexOf('const handleCreateEdge');
    const firstClose = source.indexOf('};', edgeStart + 50);
    const edgeEnd = source.indexOf('};', firstClose + 1);
    const handleCreateEdgeBlock = source.slice(edgeStart, edgeEnd);
    expect(handleCreateEdgeBlock).toContain('resetForms()');
  });
});

// ── SavingRef double-submit guard ───────────────────────────

describe('AddNodeEdgeModal: savingRef double-submit prevention', () => {
  it('uses a ref (not just state) for synchronous guard', () => {
    expect(source).toContain('const savingRef = useRef(false)');
  });

  it('sets savingRef.current = true before async work in handleCreateNode', () => {
    const handleCreateNodeBlock = source.slice(
      source.indexOf('const handleCreateNode'),
      source.indexOf('const handleCreateEdge'),
    );
    expect(handleCreateNodeBlock).toContain('savingRef.current = true');
    expect(handleCreateNodeBlock).toContain('setSaving(true)');
  });

  it('sets savingRef.current = true before async work in handleCreateEdge', () => {
    const edgeStart = source.indexOf('const handleCreateEdge');
    const firstClose = source.indexOf('};', edgeStart + 50);
    const edgeEnd = source.indexOf('};', firstClose + 1);
    const handleCreateEdgeBlock = source.slice(edgeStart, edgeEnd);
    expect(handleCreateEdgeBlock).toContain('savingRef.current = true');
    expect(handleCreateEdgeBlock).toContain('setSaving(true)');
  });

  it('resets savingRef in finally block (always runs)', () => {
    // Both handlers use finally { savingRef.current = false }
    const finallyMatches = source.match(/savingRef\.current = false/g);
    expect(finallyMatches).not.toBeNull();
    // Should appear at least twice: once per handler
    expect(finallyMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('submit button is disabled during saving', () => {
    expect(source).toContain('disabled={saving}');
  });
});

// ── Shake animation on invalid submit ───────────────────────

describe('AddNodeEdgeModal: shake animation on invalid submit', () => {
  it('triggers shake when node label is empty on submit', () => {
    expect(source).toContain("tab === 'node' && !nodeLabel.trim()");
  });

  it('triggers shake when edge fields are invalid on submit', () => {
    expect(source).toContain("tab === 'edge' && (!edgeSource || !edgeTarget || edgeSource === edgeTarget)");
  });

  it('sets shake state to trigger animation', () => {
    expect(source).toContain('setShake(true)');
  });

  it('resets shake after animation completes', () => {
    expect(source).toContain('if (shake) setShake(false)');
  });
});

// ── Node sorting ────────────────────────────────────────────

describe('AddNodeEdgeModal: node sorting for selects', () => {
  // Replicate the sort logic
  function sortNodes(nodes: { id: string; label: string }[]) {
    return [...nodes].sort((a, b) => a.label.localeCompare(b.label));
  }

  it('sorts nodes alphabetically by label', () => {
    const nodes = [
      { id: '1', label: 'Zygomatic' },
      { id: '2', label: 'Aorta' },
      { id: '3', label: 'Mitocondria' },
    ];
    const sorted = sortNodes(nodes);
    expect(sorted.map(n => n.label)).toEqual(['Aorta', 'Mitocondria', 'Zygomatic']);
  });

  it('does not mutate original array', () => {
    const nodes = [
      { id: '1', label: 'B' },
      { id: '2', label: 'A' },
    ];
    const original = [...nodes];
    sortNodes(nodes);
    expect(nodes).toEqual(original);
  });

  it('handles empty array', () => {
    expect(sortNodes([])).toEqual([]);
  });

  it('uses useMemo for performance', () => {
    expect(source).toContain('const sortedNodes = useMemo(');
  });

  it('filters out source node from target dropdown', () => {
    expect(source).toContain('.filter((n) => n.id !== edgeSource)');
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('AddNodeEdgeModal: accessibility', () => {
  it('has role="dialog" and aria-modal="true"', () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });

  it('has aria-labelledby referencing modal title', () => {
    expect(source).toContain('aria-labelledby="add-modal-title"');
    expect(source).toContain('id="add-modal-title"');
  });

  it('close button has aria-label="Cerrar"', () => {
    expect(source).toContain('aria-label="Cerrar"');
  });

  it('uses useFocusTrap hook', () => {
    expect(source).toContain('useFocusTrap(open)');
  });

  it('has labeled inputs with htmlFor/id pairs', () => {
    expect(source).toContain('htmlFor="custom-node-label"');
    expect(source).toContain('id="custom-node-label"');
    expect(source).toContain('htmlFor="custom-edge-source"');
    expect(source).toContain('id="custom-edge-source"');
    expect(source).toContain('htmlFor="custom-edge-target"');
    expect(source).toContain('id="custom-edge-target"');
  });

  it('edge directed toggle uses role="switch"', () => {
    expect(source).toContain('role="switch"');
    expect(source).toContain('aria-checked={edgeDirected}');
  });

  it('arrow type selector uses role="radiogroup"', () => {
    const radiogroups = source.match(/role="radiogroup"/g);
    expect(radiogroups).not.toBeNull();
    // At least two: arrow type + line style
    expect(radiogroups!.length).toBeGreaterThanOrEqual(2);
  });

  it('line style selector uses role="radio" with aria-checked', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain('aria-checked={edgeLineStyle === style}');
  });
});

// ── MountedRef cleanup guard ────────────────────────────────

describe('AddNodeEdgeModal: mountedRef cleanup guard', () => {
  it('initializes mountedRef to true', () => {
    expect(source).toContain('const mountedRef = useRef(true)');
  });

  it('sets mountedRef.current = true on mount', () => {
    expect(source).toContain('mountedRef.current = true');
  });

  it('sets mountedRef.current = false on unmount (cleanup)', () => {
    expect(source).toContain('mountedRef.current = false');
  });

  it('checks mountedRef before setState in finally block', () => {
    expect(source).toContain('if (mountedRef.current) setSaving(false)');
  });
});

// ── Connection type auto-sync ───────────────────────────────

describe('AddNodeEdgeModal: connection type auto-syncs directed toggle', () => {
  it('looks up CONNECTION_TYPE_MAP for directed metadata', () => {
    expect(source).toContain('CONNECTION_TYPE_MAP.get(newType)');
  });

  it('auto-sets directed from connection type metadata', () => {
    expect(source).toContain('if (meta) setEdgeDirected(meta.directed)');
  });
});

// ── Edge form default state ─────────────────────────────────

describe('AddNodeEdgeModal: edge form defaults', () => {
  it('defaults edge type to asociacion', () => {
    expect(source).toContain("useState('asociacion')");
  });

  it('defaults line style to solid', () => {
    expect(source).toContain("useState<'solid' | 'dashed' | 'dotted'>('solid')");
  });

  it('defaults arrow type to triangle', () => {
    expect(source).toContain("useState<EdgeArrowType>('triangle')");
  });
});

// ── Radio group WAI-ARIA arrow key navigation ─────────────────

describe('AddNodeEdgeModal: radiogroup arrow key navigation', () => {
  it('arrow type radiogroup has onKeyDown handler for ArrowRight/ArrowLeft', () => {
    const arrowTypeSection = source.slice(
      source.indexOf('aria-label="Tipo de flecha"'),
      source.indexOf('aria-label="Estilo de línea"'),
    );
    expect(arrowTypeSection).toContain("e.key === 'ArrowRight'");
    expect(arrowTypeSection).toContain("e.key === 'ArrowLeft'");
    expect(arrowTypeSection).toContain("e.key === 'ArrowDown'");
    expect(arrowTypeSection).toContain("e.key === 'ArrowUp'");
  });

  it('line style radiogroup has onKeyDown handler for ArrowRight/ArrowLeft', () => {
    const startIdx = source.indexOf('aria-label="Estilo de línea"');
    const endIdx = source.indexOf('edgeLineStyle === style', startIdx + 100);
    const lineStyleSection = source.slice(startIdx, endIdx > startIdx ? endIdx : startIdx + 800);
    expect(lineStyleSection).toContain("e.key === 'ArrowRight'");
    expect(lineStyleSection).toContain("e.key === 'ArrowLeft'");
  });

  it('selected radio has tabIndex=0, others have tabIndex=-1', () => {
    // Both radiogroups should use roving tabindex pattern
    expect(source).toMatch(/tabIndex=\{edgeArrowType === type \? 0 : -1\}/);
    expect(source).toMatch(/tabIndex=\{edgeLineStyle === style \? 0 : -1\}/);
  });

  it('arrow key handler calls e.preventDefault() to avoid page scroll', () => {
    expect(source).toContain('e.preventDefault()');
  });

  it('arrow key handler moves focus to the new radio button', () => {
    // Expects the handler to call .focus() on the target element
    expect(source).toContain('.focus()');
  });
});
