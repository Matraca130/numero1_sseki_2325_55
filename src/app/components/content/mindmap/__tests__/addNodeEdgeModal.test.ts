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
    expect(source).toContain('toast.success(t.toastNodeSuccess)');
  });

  it('shows error toast on failure via i18n', () => {
    expect(source).toContain('t.toastNodeError');
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
    expect(source).toContain('toast.success(t.toastEdgeSuccess)');
  });

  it('shows error toast on failure via i18n', () => {
    expect(source).toContain('t.toastEdgeError');
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

  it('target dropdown filter is delegated to EdgeNodeSelect.Target (cycle 64 extraction)', () => {
    // Cycle 64: the inline `.filter((n) => n.id !== edgeSource)` moved into
    // EdgeNodeSelect.Target (asserted in edgeNodeSelect.test.ts). Parent must
    // pass the source id via the `excludeId` prop instead.
    expect(source).not.toContain('.filter((n) => n.id !== edgeSource)');
    expect(source).toContain('excludeId={edgeSource}');
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

  it('close button has aria-label via i18n', () => {
    expect(source).toContain('aria-label={t.close}');
  });

  it('uses useFocusTrap hook', () => {
    expect(source).toContain('useFocusTrap(open)');
  });

  it('has labeled inputs with htmlFor/id pairs', () => {
    // Node-label input still lives inline.
    expect(source).toContain('htmlFor="custom-node-label"');
    expect(source).toContain('id="custom-node-label"');
    // Cycle 64: source/target select id+htmlFor pairs moved into EdgeNodeSelect
    // (asserted in edgeNodeSelect.test.ts via the `inputId` prop). Parent must
    // forward the ids via prop, not declare them inline.
    expect(source).not.toContain('id="custom-edge-source"');
    expect(source).not.toContain('htmlFor="custom-edge-source"');
    expect(source).not.toContain('id="custom-edge-target"');
    expect(source).not.toContain('htmlFor="custom-edge-target"');
    expect(source).toContain('inputId="custom-edge-source"');
    expect(source).toContain('inputId="custom-edge-target"');
  });

  it('edge directed toggle uses role="switch"', () => {
    expect(source).toContain('role="switch"');
    expect(source).toContain('aria-checked={edgeDirected}');
  });

  it('arrow type selector is delegated to ArrowTypePicker (cycle 61 extraction)', () => {
    // After cycle 61, the arrow-type radiogroup lives in ArrowTypePicker.tsx.
    // The parent must import and render it, but no longer contain the
    // inline radiogroup body.
    expect(source).toContain("from './ArrowTypePicker'");
    expect(source).toContain('<ArrowTypePicker');
    // After cycle 62 BOTH pickers are extracted — zero inline radiogroups.
    const radiogroups = source.match(/role="radiogroup"/g);
    expect(radiogroups).toBeNull();
  });

  it('line style selector is delegated to LineStylePicker (cycle 62 extraction)', () => {
    // After cycle 62, the line-style radiogroup lives in LineStylePicker.tsx.
    // The parent must import and render it, but no longer contain the
    // inline radiogroup body, role="radio" attributes, or aria-checked
    // bound to edgeLineStyle.
    expect(source).toContain("from './LineStylePicker'");
    expect(source).toContain('<LineStylePicker');
    expect(source).not.toContain('aria-checked={edgeLineStyle === style}');
    expect(source).not.toContain('role="radio"');
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
    // Cycle 62: state type uses canonical EdgeLineStyle alias from
    // @/app/types/mindmap (imported alongside EdgeArrowType).
    expect(source).toContain("useState<EdgeLineStyle>('solid')");
  });

  it('defaults arrow type to triangle', () => {
    expect(source).toContain("useState<EdgeArrowType>('triangle')");
  });
});

// ── Radio group WAI-ARIA arrow key navigation ─────────────────

describe('AddNodeEdgeModal: radiogroup arrow key navigation', () => {
  it('arrow type radiogroup has onKeyDown handler for ArrowRight/ArrowLeft', () => {
    // i18n: aria-label={t.arrowTypeGroupLabel}
    expect(source).toContain('t.arrowTypeGroupLabel');
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
  });

  it('line style radiogroup is delegated to LineStylePicker (groupLabel passed via prop)', () => {
    // Cycle 62: keyboard handling moved into LineStylePicker.tsx
    // (asserted in lineStylePicker.test.ts). The parent only forwards
    // the i18n string via the groupLabel prop.
    expect(source).toContain('t.lineStyleGroupLabel');
    expect(source).toMatch(/groupLabel=\{t\.lineStyleGroupLabel\}/);
  });

  it('roving tabindex pattern is delegated (no inline tabIndex bound to edgeLineStyle)', () => {
    // Cycle 61 moved the arrow-type tabIndex pattern to ArrowTypePicker.
    // Cycle 62 moves the line-style tabIndex pattern to LineStylePicker.
    // The parent must not contain either inline pattern.
    expect(source).not.toMatch(/tabIndex=\{edgeLineStyle === style \? 0 : -1\}/);
    expect(source).not.toMatch(/tabIndex=\{value === type \? 0 : -1\}/);
  });

  it('arrow key handler calls e.preventDefault() to avoid page scroll', () => {
    expect(source).toContain('e.preventDefault()');
  });

  it('arrow key handler moves focus to the new radio button', () => {
    // Expects the handler to call .focus() on the target element
    expect(source).toContain('.focus()');
  });
});

// ── I18N shape (pt is active, es is dead-but-mirrored) ──────

describe('AddNodeEdgeModal: I18N shape', () => {
  it('hardcodes pt as the active language (es is dead code)', () => {
    // The component uses const t = I18N['pt']; — the es block exists but is never read.
    expect(source).toMatch(/const\s+t\s*=\s*I18N\[['"]pt['"]\]/);
  });

  it('declares both pt and es language blocks', () => {
    expect(source).toMatch(/I18N\s*=\s*\{[\s\S]*?\bpt:/);
    expect(source).toMatch(/\bes:\s*\{/);
  });

  it('exposes a colorAriaLabel function that interpolates the color string', () => {
    // Both blocks define colorAriaLabel: (c: string) => `Cor ${c}` / `Color ${c}`
    expect(source).toContain('colorAriaLabel: (c: string) =>');
    expect(source).toContain('Cor ${c}');
    expect(source).toContain('Color ${c}');
  });

  it('I18N is declared `as const` (literal types preserved)', () => {
    expect(source).toMatch(/\}\s*,?\s*\}\s*as\s+const\s*;/);
  });
});

// ── Real CONNECTION_TYPE_MAP autosync behavior ──────────────

describe('AddNodeEdgeModal: connection-type → directed autosync (live data)', () => {
  // Replicate the onChange handler of the connection-type select.
  // The actual handler imports CONNECTION_TYPE_MAP from @/app/types/mindmap.
  // We exercise it with the real map.
  function autosyncDirected(
    newType: string,
    map: Map<string, { directed: boolean }>,
    setDirected: (v: boolean) => void,
  ) {
    const meta = map.get(newType);
    if (meta) setDirected(meta.directed);
  }

  let CONNECTION_TYPE_MAP: Map<string, { directed: boolean }>;
  let CONNECTION_TYPES: ReadonlyArray<{ key: string; directed: boolean }>;

  beforeEach(async () => {
    const mod = await import('@/app/types/mindmap');
    CONNECTION_TYPE_MAP = mod.CONNECTION_TYPE_MAP as unknown as Map<string, { directed: boolean }>;
    CONNECTION_TYPES = mod.CONNECTION_TYPES as unknown as ReadonlyArray<{ key: string; directed: boolean }>;
  });

  it('prerequisito autosyncs to directed=true', () => {
    let v = false;
    autosyncDirected('prerequisito', CONNECTION_TYPE_MAP, (x) => { v = x; });
    expect(v).toBe(true);
  });

  it('causa-efecto autosyncs to directed=true', () => {
    let v = false;
    autosyncDirected('causa-efecto', CONNECTION_TYPE_MAP, (x) => { v = x; });
    expect(v).toBe(true);
  });

  it('asociacion autosyncs to directed=false', () => {
    let v = true;
    autosyncDirected('asociacion', CONNECTION_TYPE_MAP, (x) => { v = x; });
    expect(v).toBe(false);
  });

  it('dx-diferencial autosyncs to directed=false', () => {
    let v = true;
    autosyncDirected('dx-diferencial', CONNECTION_TYPE_MAP, (x) => { v = x; });
    expect(v).toBe(false);
  });

  it('contraste autosyncs to directed=false', () => {
    let v = true;
    autosyncDirected('contraste', CONNECTION_TYPE_MAP, (x) => { v = x; });
    expect(v).toBe(false);
  });

  it('mecanismo / tratamiento / manifestacion / regulacion / componente are directed=true', () => {
    const expected = ['mecanismo', 'tratamiento', 'manifestacion', 'regulacion', 'componente'];
    for (const key of expected) {
      let v = false;
      autosyncDirected(key, CONNECTION_TYPE_MAP, (x) => { v = x; });
      expect(v, `${key} should be directed`).toBe(true);
    }
  });

  it('unknown connection type leaves directed unchanged (no map hit)', () => {
    let v = true;
    autosyncDirected('not-a-real-type', CONNECTION_TYPE_MAP, (x) => { v = x; });
    expect(v).toBe(true);

    let w = false;
    autosyncDirected('also-fake', CONNECTION_TYPE_MAP, (x) => { w = x; });
    expect(w).toBe(false);
  });

  it('exactly 10 connection types are exposed', () => {
    expect(CONNECTION_TYPES).toHaveLength(10);
  });

  it('default connection type (asociacion) exists in the map', () => {
    // Component defaults edgeType to 'asociacion'; resetForms restores it.
    expect(CONNECTION_TYPE_MAP.has('asociacion')).toBe(true);
  });
});

// ── Roving tabindex / arrow-key cycling logic ───────────────

describe('AddNodeEdgeModal: arrow-type cycling (roving radio)', () => {
  const TYPES = ['triangle', 'diamond', 'circle', 'vee'] as const;
  type ArrowType = typeof TYPES[number];

  function next(current: ArrowType): ArrowType {
    const idx = TYPES.indexOf(current);
    return TYPES[(idx + 1) % TYPES.length];
  }
  function prev(current: ArrowType): ArrowType {
    const idx = TYPES.indexOf(current);
    return TYPES[(idx - 1 + TYPES.length) % TYPES.length];
  }

  it('next from triangle is diamond', () => { expect(next('triangle')).toBe('diamond'); });
  it('next from diamond is circle', () => { expect(next('diamond')).toBe('circle'); });
  it('next from circle is vee', () => { expect(next('circle')).toBe('vee'); });
  it('next from vee wraps to triangle', () => { expect(next('vee')).toBe('triangle'); });

  it('prev from triangle wraps to vee', () => { expect(prev('triangle')).toBe('vee'); });
  it('prev from diamond is triangle', () => { expect(prev('diamond')).toBe('triangle'); });
  it('prev from circle is diamond', () => { expect(prev('circle')).toBe('diamond'); });
  it('prev from vee is circle', () => { expect(prev('vee')).toBe('circle'); });

  it('source no longer declares the four-arrow-types literal (extracted to ArrowTypePicker)', () => {
    // Cycle 61: the cycling tuple moved into ArrowTypePicker.tsx
    // (asserted there via arrowTypePicker.test.ts). Parent must
    // not duplicate it.
    expect(source).not.toContain("['triangle', 'diamond', 'circle', 'vee']");
  });

  it('parent no longer carries inline ArrowDown / ArrowUp handler (extracted)', () => {
    // Cycle 62: with both ArrowTypePicker and LineStylePicker extracted,
    // the only arrow-key handler left in the parent is the tab-strip
    // (ArrowRight / ArrowLeft only — no Down/Up). The compound
    // "ArrowRight || ArrowDown" pattern lives inside the picker
    // components and is asserted in their dedicated tests.
    expect(source).not.toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).not.toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
  });
});

describe('AddNodeEdgeModal: line-style cycling — delegated to LineStylePicker', () => {
  // Pure-logic replication retained as a regression baseline;
  // the actual cycling is now exercised in lineStylePicker.test.ts.
  const STYLES = ['solid', 'dashed', 'dotted'] as const;
  type LineStyle = typeof STYLES[number];

  function next(current: LineStyle): LineStyle {
    const idx = STYLES.indexOf(current);
    return STYLES[(idx + 1) % STYLES.length];
  }
  function prev(current: LineStyle): LineStyle {
    const idx = STYLES.indexOf(current);
    return STYLES[(idx - 1 + STYLES.length) % STYLES.length];
  }

  it('cycles solid → dashed → dotted → solid', () => {
    expect(next('solid')).toBe('dashed');
    expect(next('dashed')).toBe('dotted');
    expect(next('dotted')).toBe('solid');
  });

  it('cycles backwards solid → dotted → dashed → solid', () => {
    expect(prev('solid')).toBe('dotted');
    expect(prev('dotted')).toBe('dashed');
    expect(prev('dashed')).toBe('solid');
  });

  it('source no longer declares the three-line-styles literal (extracted to LineStylePicker)', () => {
    // Cycle 62: the cycling tuple moved into LineStylePicker.tsx
    // (asserted there via lineStylePicker.test.ts). Parent must not
    // duplicate it.
    expect(source).not.toContain("['solid', 'dashed', 'dotted']");
  });
});

// ── Target dropdown filter (excludes source) ────────────────

describe('AddNodeEdgeModal: target dropdown excludes source node', () => {
  function filterTargets<T extends { id: string }>(nodes: T[], sourceId: string): T[] {
    return nodes.filter((n) => n.id !== sourceId);
  }

  it('excludes the source node when set', () => {
    const nodes = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];
    expect(filterTargets(nodes, 'b').map(n => n.id)).toEqual(['a', 'c']);
  });

  it('returns all nodes when source is empty string', () => {
    const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    expect(filterTargets(nodes, '')).toHaveLength(2);
  });

  it('returns empty array when source matches the only node', () => {
    expect(filterTargets([{ id: 'only', label: 'Only' }], 'only')).toEqual([]);
  });
});

// ── Option label rendering (isUserCreated suffix) ───────────

describe('AddNodeEdgeModal: select option label with isUserCreated suffix', () => {
  // Replicate template literal: `${n.label}${n.isUserCreated ? ` ${t.yours}` : ''}`
  function optionLabel(n: { label: string; isUserCreated?: boolean }, yoursToken: string): string {
    return `${n.label}${n.isUserCreated ? ` ${yoursToken}` : ''}`;
  }

  it('appends `(seu)` for user-created nodes (pt active)', () => {
    expect(optionLabel({ label: 'Aorta', isUserCreated: true }, '(seu)')).toBe('Aorta (seu)');
  });

  it('plain label when isUserCreated is false', () => {
    expect(optionLabel({ label: 'Aorta', isUserCreated: false }, '(seu)')).toBe('Aorta');
  });

  it('plain label when isUserCreated is undefined', () => {
    expect(optionLabel({ label: 'Aorta' }, '(seu)')).toBe('Aorta');
  });

  it('source no longer builds the option label inline (cycle 64 extraction)', () => {
    // Cycle 64: the per-option template literal moved into EdgeNodeSelect
    // (asserted in edgeNodeSelect.test.ts). Parent must forward the suffix
    // token via the `yoursSuffix` prop instead.
    expect(source).not.toContain("{n.label}{n.isUserCreated ? ` ${t.yours}` : ''}");
    expect(source).toContain('yoursSuffix={t.yours}');
  });
});

// ── EdgeNodeSelect delegation (cycle 64 extraction) ─────────

describe('AddNodeEdgeModal: EdgeNodeSelect delegation (cycle 64 extraction)', () => {
  it('imports EdgeNodeSelect from sibling module', () => {
    expect(source).toContain("from './EdgeNodeSelect'");
    expect(source).toContain('import { EdgeNodeSelect }');
  });

  it('renders <EdgeNodeSelect.Source> (compound dot-notation, not flat)', () => {
    expect(source).toContain('<EdgeNodeSelect.Source');
  });

  it('renders <EdgeNodeSelect.Target> (compound dot-notation, not flat)', () => {
    expect(source).toContain('<EdgeNodeSelect.Target');
  });

  it('forwards edgeSourceRef to <EdgeNodeSelect.Source> (focus discipline preserved)', () => {
    expect(source).toContain('ref={edgeSourceRef}');
    // The ref is wired on the Source variant — assert the ref usage occurs
    // in proximity to the Source render.
    const sourceIdx = source.indexOf('<EdgeNodeSelect.Source');
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    expect(sourceIdx).toBeGreaterThan(-1);
    expect(targetIdx).toBeGreaterThan(sourceIdx);
    const sourceBlock = source.slice(sourceIdx, targetIdx);
    expect(sourceBlock).toContain('ref={edgeSourceRef}');
  });

  it('Target variant does NOT receive a ref (asymmetry preserved)', () => {
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    // Slice from Target opening to the end of its JSX block. The next sibling
    // is <ColorPicker.Input ... or another component — find the next "<" after
    // the closing /> of EdgeNodeSelect.Target.
    const closeIdx = source.indexOf('/>', targetIdx);
    expect(closeIdx).toBeGreaterThan(targetIdx);
    const targetBlock = source.slice(targetIdx, closeIdx);
    expect(targetBlock).not.toContain('ref=');
  });

  it('forwards setEdgeSource as Source.onChange (controlled binding)', () => {
    const sourceIdx = source.indexOf('<EdgeNodeSelect.Source');
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    const sourceBlock = source.slice(sourceIdx, targetIdx);
    expect(sourceBlock).toContain('onChange={setEdgeSource}');
  });

  it('forwards setEdgeTarget as Target.onChange (controlled binding)', () => {
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    const closeIdx = source.indexOf('/>', targetIdx);
    const targetBlock = source.slice(targetIdx, closeIdx);
    expect(targetBlock).toContain('onChange={setEdgeTarget}');
  });

  it('passes excludeId={edgeSource} to Target only (filter delegation)', () => {
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    const closeIdx = source.indexOf('/>', targetIdx);
    const targetBlock = source.slice(targetIdx, closeIdx);
    expect(targetBlock).toContain('excludeId={edgeSource}');
    // Source must NOT receive excludeId.
    const sourceIdx = source.indexOf('<EdgeNodeSelect.Source');
    const sourceBlock = source.slice(sourceIdx, targetIdx);
    expect(sourceBlock).not.toContain('excludeId=');
  });

  it('forwards sortedNodes as `options` to BOTH variants', () => {
    const sourceIdx = source.indexOf('<EdgeNodeSelect.Source');
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    const closeIdx = source.indexOf('/>', targetIdx);
    expect(source.slice(sourceIdx, targetIdx)).toContain('options={sortedNodes}');
    expect(source.slice(targetIdx, closeIdx)).toContain('options={sortedNodes}');
  });

  it('forwards distinct fieldLabel tokens (edgeSourceField vs edgeTargetField)', () => {
    const sourceIdx = source.indexOf('<EdgeNodeSelect.Source');
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    const closeIdx = source.indexOf('/>', targetIdx);
    expect(source.slice(sourceIdx, targetIdx)).toContain('fieldLabel={t.edgeSourceField}');
    expect(source.slice(targetIdx, closeIdx)).toContain('fieldLabel={t.edgeTargetField}');
  });

  it('forwards selectPlaceholder + yoursSuffix tokens to BOTH variants', () => {
    const sourceIdx = source.indexOf('<EdgeNodeSelect.Source');
    const targetIdx = source.indexOf('<EdgeNodeSelect.Target');
    const closeIdx = source.indexOf('/>', targetIdx);
    const sourceBlock = source.slice(sourceIdx, targetIdx);
    const targetBlock = source.slice(targetIdx, closeIdx);
    expect(sourceBlock).toContain('placeholder={t.selectPlaceholder}');
    expect(targetBlock).toContain('placeholder={t.selectPlaceholder}');
    expect(sourceBlock).toContain('yoursSuffix={t.yours}');
    expect(targetBlock).toContain('yoursSuffix={t.yours}');
  });

  it('does NOT pass setEdgeSource via inline arrow (delegation owns the closure)', () => {
    // Pre-extraction the <select> body had `onChange={(e) => setEdgeSource(e.target.value)}`.
    // After extraction, the parent forwards the setter directly and the
    // closure lives inside EdgeNodeSelect. Guard against accidental drift.
    expect(source).not.toContain('onChange={(e) => setEdgeSource(e.target.value)}');
    expect(source).not.toContain('onChange={(e) => setEdgeTarget(e.target.value)}');
  });
});

// ── Shake-vs-submit branch decision ─────────────────────────

describe('AddNodeEdgeModal: shake-vs-submit decision in submit button', () => {
  // Replicate the inline isInvalid + branch from the primary submit button:
  //   const isInvalid = (tab === 'node' && !nodeLabel.trim())
  //                  || (tab === 'edge' && (!edgeSource || !edgeTarget || edgeSource === edgeTarget));
  function decide(opts: {
    tab: 'node' | 'edge';
    nodeLabel: string;
    edgeSource: string;
    edgeTarget: string;
    saving: boolean;
  }): 'shake' | 'submit' | 'noop' {
    const { tab, nodeLabel, edgeSource, edgeTarget, saving } = opts;
    const isInvalid =
      (tab === 'node' && !nodeLabel.trim()) ||
      (tab === 'edge' && (!edgeSource || !edgeTarget || edgeSource === edgeTarget));
    if (isInvalid && !saving) return 'shake';
    if (!saving) return 'submit';
    return 'noop';
  }

  it('node tab: empty label → shake', () => {
    expect(decide({ tab: 'node', nodeLabel: '', edgeSource: '', edgeTarget: '', saving: false })).toBe('shake');
  });

  it('node tab: whitespace-only label → shake', () => {
    expect(decide({ tab: 'node', nodeLabel: '   ', edgeSource: '', edgeTarget: '', saving: false })).toBe('shake');
  });

  it('node tab: valid label → submit', () => {
    expect(decide({ tab: 'node', nodeLabel: 'X', edgeSource: '', edgeTarget: '', saving: false })).toBe('submit');
  });

  it('edge tab: empty source → shake', () => {
    expect(decide({ tab: 'edge', nodeLabel: '', edgeSource: '', edgeTarget: 'b', saving: false })).toBe('shake');
  });

  it('edge tab: empty target → shake', () => {
    expect(decide({ tab: 'edge', nodeLabel: '', edgeSource: 'a', edgeTarget: '', saving: false })).toBe('shake');
  });

  it('edge tab: source equals target → shake', () => {
    expect(decide({ tab: 'edge', nodeLabel: '', edgeSource: 'a', edgeTarget: 'a', saving: false })).toBe('shake');
  });

  it('edge tab: distinct source/target → submit', () => {
    expect(decide({ tab: 'edge', nodeLabel: '', edgeSource: 'a', edgeTarget: 'b', saving: false })).toBe('submit');
  });

  it('saving=true blocks both shake and submit (noop)', () => {
    expect(decide({ tab: 'node', nodeLabel: '', edgeSource: '', edgeTarget: '', saving: true })).toBe('noop');
    expect(decide({ tab: 'edge', nodeLabel: '', edgeSource: 'a', edgeTarget: 'a', saving: true })).toBe('noop');
    expect(decide({ tab: 'node', nodeLabel: 'ok', edgeSource: '', edgeTarget: '', saving: true })).toBe('noop');
  });

  it('source uses ternary to dispatch the right handler', () => {
    expect(source).toContain("(tab === 'node' ? handleCreateNode : handleCreateEdge)()");
  });
});

// ── maxLength constraints on text inputs ────────────────────

describe('AddNodeEdgeModal: maxLength constraints', () => {
  it('node label input has maxLength=100', () => {
    // <input ref={nodeLabelRef} ... maxLength={100} />
    const nodeLabelBlock = source.slice(
      source.indexOf('id="custom-node-label"'),
      source.indexOf('id="custom-node-def"'),
    );
    expect(nodeLabelBlock).toContain('maxLength={100}');
  });

  it('node definition textarea has maxLength=300', () => {
    const defBlock = source.slice(
      source.indexOf('id="custom-node-def"'),
      source.indexOf('</form>', source.indexOf('id="custom-node-def"')),
    );
    expect(defBlock).toContain('maxLength={300}');
  });

  it('edge label input has maxLength=100', () => {
    const edgeLabelBlock = source.slice(
      source.indexOf('id="custom-edge-label"'),
      source.indexOf('</form>', source.indexOf('id="custom-edge-label"')),
    );
    expect(edgeLabelBlock).toContain('maxLength={100}');
  });
});

// ── Submit button: icon + label branches ────────────────────

describe('AddNodeEdgeModal: submit button rendering branches', () => {
  it('uses Loader2 with animate-spin while saving', () => {
    expect(source).toContain('<Loader2 className="w-3.5 h-3.5 animate-spin" />');
  });

  it('uses Plus icon when not saving', () => {
    // The else branch of the saving ternary in the footer button.
    const footerSlice = source.slice(source.indexOf('Footer'), source.length);
    expect(footerSlice).toMatch(/saving \? \(\s*<Loader2[\s\S]*?\) : \(\s*<Plus/);
  });

  it('shows full button text on >=sm via hidden sm:inline', () => {
    expect(source).toMatch(/<span className="hidden sm:inline">\{tab === 'node' \? t\.addNodeBtn : t\.addEdgeBtn\}<\/span>/);
  });

  it('shows short label on <sm via sm:hidden', () => {
    expect(source).toMatch(/<span className="sm:hidden">\{t\.addShort\}<\/span>/);
  });

  it('cancel button is disabled while saving', () => {
    // <button onClick={onClose} ... disabled={saving}>{t.cancel}</button>
    expect(source).toMatch(/onClick=\{onClose\}[\s\S]*?disabled=\{saving\}/);
  });

  it('primary submit button is disabled while saving', () => {
    // The footer primary button also has disabled={saving}
    const matches = source.match(/disabled=\{saving\}/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Modal layering / event isolation ────────────────────────

describe('AddNodeEdgeModal: modal layering and event isolation', () => {
  it('backdrop is aria-hidden (not exposed to screen readers)', () => {
    expect(source).toContain('aria-hidden="true"');
  });

  it('modal content stops click propagation (prevents backdrop close on inner click)', () => {
    expect(source).toContain('onClick={(e) => e.stopPropagation()}');
  });

  it('backdrop and overlay container both close on click when not saving', () => {
    // Two onClick handlers: backdrop motion.div + the centering wrapper div.
    const closeMatches = source.match(/onClick=\(\)\s*=>\s*\{ if \(!savingRef\.current\) onClose\(\); \}/g)
      ?? source.match(/onClick=\{\(\)\s*=>\s*\{\s*if\s*\(!savingRef\.current\)\s*onClose\(\);\s*\}\}/g);
    expect(closeMatches).not.toBeNull();
    expect(closeMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('z-50 layer ensures the modal floats above page content', () => {
    expect(source).toContain('z-50');
  });

  it('focusTrapRef is attached to the modal motion.div (not the backdrop)', () => {
    // The motion.div with role="dialog" carries ref={focusTrapRef}.
    // Source has it before className/etc and dialog is much further down.
    const dialogIdx = source.indexOf('role="dialog"');
    const refIdx = source.indexOf('ref={focusTrapRef}');
    expect(refIdx).toBeGreaterThan(0);
    expect(refIdx).toBeLessThan(dialogIdx);
    // Also verify there's exactly one such ref (not on backdrop too).
    const matches = source.match(/ref=\{focusTrapRef\}/g);
    expect(matches).toHaveLength(1);
  });
});

// ── Tab focus management on switch ──────────────────────────

describe('AddNodeEdgeModal: tab focus management', () => {
  it('uses requestAnimationFrame to defer focus until DOM is ready', () => {
    expect(source).toContain('requestAnimationFrame(()');
  });

  it('cleans up rAF on unmount via cancelAnimationFrame', () => {
    expect(source).toContain('cancelAnimationFrame(rafId)');
  });

  it('focuses node label input when tab is node', () => {
    expect(source).toContain('nodeLabelRef.current?.focus()');
  });

  it('focuses edge source select when tab is edge', () => {
    expect(source).toContain('edgeSourceRef.current?.focus()');
  });

  it('skip focus effect when modal is closed (early return)', () => {
    // The focus useEffect early-returns if !open
    const focusEffect = source.slice(
      source.indexOf('// Focus first field when switching tabs'),
      source.indexOf('}, [tab, open]);'),
    );
    expect(focusEffect).toContain('if (!open) return');
  });

  it('focus effect runs on tab change AND open change (deps array)', () => {
    expect(source).toContain('}, [tab, open]);');
  });
});

// ── Self-loop guard semantics ───────────────────────────────

describe('AddNodeEdgeModal: self-loop useEffect semantics', () => {
  // Replicate the effect: clear target ONLY if both are set AND equal.
  function selfLoopFix(source: string, target: string): string {
    if (source && source === target) return '';
    return target;
  }

  it('clears target when source==target and both non-empty', () => {
    expect(selfLoopFix('a', 'a')).toBe('');
  });

  it('preserves target when source differs from target', () => {
    expect(selfLoopFix('a', 'b')).toBe('b');
  });

  it('preserves target when source is empty (nothing selected yet)', () => {
    expect(selfLoopFix('', 'b')).toBe('b');
  });

  it('preserves empty target when source is empty', () => {
    expect(selfLoopFix('', '')).toBe('');
  });

  it('does not clear when both are empty (both falsy avoid the branch)', () => {
    // The guard `edgeSource && edgeSource === edgeTarget` is false when source is ''
    expect(selfLoopFix('', '')).toBe('');
  });
});

// ── Quick color swatches list — delegated to ColorPicker.Swatches (cycle 63) ──

describe('AddNodeEdgeModal: quick color swatches — delegated to ColorPicker.Swatches', () => {
  // Cycle 63: the swatches row was extracted into ColorPicker.Swatches.
  // The host owns the design-system import and forwards the 6-color
  // palette via the `palette` prop. The active-swatch comparison,
  // CSS classes, and aria-label wiring all live inside the component
  // (asserted in colorPicker.test.ts).

  it('imports ColorPicker from the canonical module path', () => {
    expect(source).toContain("from './ColorPicker'");
    expect(source).toContain("import { ColorPicker }");
  });

  it('renders <ColorPicker.Swatches> with the 6-color palette prop', () => {
    expect(source).toContain('<ColorPicker.Swatches');
    expect(source).toMatch(/palette=\{\[/);
  });

  it('host still declares the 6 hex colors (palette literal owned by host)', () => {
    // The host keeps the design-system import and forwards palette as a prop,
    // so the 6 colors remain in this file (just not as inline JSX rendering).
    expect(source).toContain('#f97316'); // orange
    expect(source).toContain('#8b5cf6'); // violet
    expect(source).toContain('#06b6d4'); // cyan
    expect(source).toContain('#64748b'); // slate
    expect(source).toContain('colors.primary[500]');
    expect(source).toContain('colors.semantic.error');
  });

  it('forwards i18n quickLabel + ariaLabel callback to ColorPicker.Swatches', () => {
    expect(source).toMatch(/quickLabel=\{t\.quickLabel\}/);
    expect(source).toMatch(/ariaLabel=\{t\.colorAriaLabel\}/);
  });

  it('forwards edgeColor + setEdgeColor as value/onChange to swatches', () => {
    // Replicates the original setEdgeColor(c) closure via onChange prop.
    const swatchesIdx = source.indexOf('<ColorPicker.Swatches');
    const closeIdx = source.indexOf('/>', swatchesIdx);
    const block = source.slice(swatchesIdx, closeIdx);
    expect(block).toContain('value={edgeColor}');
    expect(block).toContain('onChange={setEdgeColor}');
  });

  it('host no longer contains the inline aria-label closure', () => {
    expect(source).not.toContain('aria-label={t.colorAriaLabel(c)}');
  });

  it('host no longer contains the active-swatch ternary (extracted to ColorPicker)', () => {
    expect(source).not.toContain("edgeColor === c ? 'border-gray-800 scale-110' : 'border-transparent'");
  });

  it('host no longer contains the inline single-line palette bracket-literal', () => {
    // Negative guard: the original `[colors.primary[500], colors.semantic.error, ...]`
    // single-line array literal must not appear inline anymore. After cycle 63
    // the palette is passed via a multi-line prop, so this exact substring
    // no longer matches.
    expect(source).not.toContain('[colors.primary[500], colors.semantic.error,');
  });
});

// ── Color picker (custom hex) — delegated to ColorPicker.Input (cycle 63) ──

describe('AddNodeEdgeModal: custom color hex picker — delegated to ColorPicker.Input', () => {
  // Cycle 63: the native <input type="color"> + label moved into
  // ColorPicker.Input. The host invokes the sub-component inside the
  // `flex gap-3` row alongside <LineStylePicker>.

  it('renders <ColorPicker.Input> inside the line-style + color row', () => {
    expect(source).toContain('<ColorPicker.Input');
    // The Input lives in the w-20 cell of the row (sister of LineStylePicker).
    const rowIdx = source.indexOf('Line style + color row');
    const inputIdx = source.indexOf('<ColorPicker.Input', rowIdx);
    expect(inputIdx).toBeGreaterThan(rowIdx);
  });

  it('forwards edgeColor + setEdgeColor as value/onChange to the input', () => {
    const inputIdx = source.indexOf('<ColorPicker.Input');
    const closeIdx = source.indexOf('/>', inputIdx);
    const block = source.slice(inputIdx, closeIdx);
    expect(block).toContain('value={edgeColor}');
    expect(block).toContain('onChange={setEdgeColor}');
  });

  it('forwards i18n fieldLabel + inputTitle props', () => {
    expect(source).toMatch(/fieldLabel=\{t\.colorField\}/);
    expect(source).toMatch(/inputTitle=\{t\.colorTitle\}/);
  });

  it('preserves the parent flex gap-3 row layout (LineStylePicker + ColorPicker.Input row-mates)', () => {
    // Critical: the row is still `<div className="flex gap-3">` containing
    // both the LineStylePicker and the ColorPicker.Input. This must NOT
    // collapse into a single fragment — the row layout is preserved.
    expect(source).toContain('<div className="flex gap-3">');
    const rowOpenIdx = source.indexOf('<div className="flex gap-3">');
    const rowCloseSearchEnd = source.indexOf('Quick color swatches', rowOpenIdx);
    const rowSlice = source.slice(rowOpenIdx, rowCloseSearchEnd);
    expect(rowSlice).toContain('<LineStylePicker');
    expect(rowSlice).toContain('<ColorPicker.Input');
  });

  it('host no longer contains a native <input type="color"> (extracted to ColorPicker)', () => {
    expect(source).not.toContain('type="color"');
  });

  it('host no longer contains the inline color-input onChange closure', () => {
    expect(source).not.toContain('onChange={(e) => setEdgeColor(e.target.value)}');
  });

  it('host no longer contains the title={t.colorTitle} attribute (moved into ColorPicker.Input)', () => {
    // The host now passes inputTitle={t.colorTitle} as a prop; the literal
    // `title={t.colorTitle}` JSX attribute belongs to the extracted component.
    expect(source).not.toContain('title={t.colorTitle}');
  });
});

// ── Directed-toggle UI semantics ────────────────────────────

describe('AddNodeEdgeModal: directed toggle', () => {
  it('toggles via functional setter (avoids stale state)', () => {
    expect(source).toContain('setEdgeDirected(d => !d)');
  });

  it('renders the From / origin → target hint when directed && source && target', () => {
    expect(source).toContain('edgeDirected && edgeSource && edgeTarget &&');
  });

  it('falls back to originFallback / targetFallback if node not found', () => {
    expect(source).toContain('?? t.originFallback');
    expect(source).toContain('?? t.targetFallback');
  });

  it('arrow type selector only renders when directed', () => {
    // Cycle 61: inline <div> body extracted into <ArrowTypePicker /> —
    // the conditional wrapper is preserved in the parent.
    expect(source).toMatch(/\{edgeDirected && \(\s*<ArrowTypePicker/);
  });
});

// ── Form submit handlers ────────────────────────────────────

describe('AddNodeEdgeModal: form submit handlers', () => {
  it('node form preventDefault and only submits when label trimmed and not saving', () => {
    expect(source).toContain('e.preventDefault(); if (nodeLabel.trim() && !saving) handleCreateNode()');
  });

  it('edge form preventDefault and validates source != target before submit', () => {
    expect(source).toContain(
      'e.preventDefault(); if (edgeSource && edgeTarget && edgeSource !== edgeTarget && !saving) handleCreateEdge()',
    );
  });
});

// ── Memoization ─────────────────────────────────────────────

describe('AddNodeEdgeModal: memoization', () => {
  it('component is wrapped in memo()', () => {
    expect(source).toMatch(/memo\(\s*function AddNodeEdgeModal/);
  });

  it('sortedNodes useMemo depends only on existingNodes', () => {
    expect(source).toMatch(/sortedNodes = useMemo\(\s*\(\) => \[\.\.\.existingNodes\][\s\S]*?\[existingNodes\]/);
  });
});

// ── Default state initial values ────────────────────────────

describe('AddNodeEdgeModal: state initialization defaults', () => {
  it('saving starts false', () => {
    expect(source).toContain('useState(false)');
  });

  it('edgeColor initializes to colors.primary[500]', () => {
    expect(source).toContain('useState<string>(colors.primary[500])');
  });

  it('edgeDirected initializes from initialEdgeSource truthiness', () => {
    expect(source).toContain('useState(!!initialEdgeSource)');
  });

  it('savingRef initializes to false (synchronous mirror of saving state)', () => {
    expect(source).toContain('useRef(false)');
  });

  it('shake state defaults to false', () => {
    // setShake(false) called inside onAnimationComplete; initial value is false.
    expect(source).toMatch(/const \[shake, setShake\] = useState\(false\)/);
  });
});

// ── Animation timing on the modal ───────────────────────────

describe('AddNodeEdgeModal: motion / animation contract', () => {
  it('modal enter/exit transition uses 0.2s with custom easing', () => {
    expect(source).toContain('transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}');
  });

  it('shake animation duration is 0.4s with easeInOut', () => {
    expect(source).toContain("transition={{ duration: 0.4, ease: 'easeInOut' }}");
  });

  it('shake animates x: [0, -3, 3, -3, 3, 0]', () => {
    expect(source).toContain('x: [0, -3, 3, -3, 3, 0]');
  });

  it('modal slides in from y:40 and fades from opacity 0', () => {
    expect(source).toContain('initial={{ opacity: 0, y: 40 }}');
    expect(source).toContain('animate={{ opacity: 1, y: 0 }}');
    expect(source).toContain('exit={{ opacity: 0, y: 40 }}');
  });

  it('uses AnimatePresence as the conditional wrapper', () => {
    expect(source).toContain('<AnimatePresence>');
    expect(source).toContain('{open && (');
  });
});

// ── onCloseRef pattern (latest-onClose without effect re-runs) ──

describe('AddNodeEdgeModal: onCloseRef latest-callback pattern', () => {
  it('stores onClose in a ref to avoid stale closures in keydown handler', () => {
    expect(source).toContain('const onCloseRef = useRef(onClose)');
    expect(source).toContain('onCloseRef.current = onClose');
  });

  it('Escape handler uses onCloseRef.current (not closure-captured onClose)', () => {
    expect(source).toContain('onCloseRef.current()');
  });
});

// ── Submit button label data flow ───────────────────────────

describe('AddNodeEdgeModal: submit button label switches with tab', () => {
  function buttonLabel(tab: 'node' | 'edge', i18n: { addNodeBtn: string; addEdgeBtn: string }) {
    return tab === 'node' ? i18n.addNodeBtn : i18n.addEdgeBtn;
  }

  it('returns addNodeBtn when tab=node', () => {
    expect(buttonLabel('node', { addNodeBtn: 'Add concept', addEdgeBtn: 'Add edge' })).toBe('Add concept');
  });

  it('returns addEdgeBtn when tab=edge', () => {
    expect(buttonLabel('edge', { addNodeBtn: 'Add concept', addEdgeBtn: 'Add edge' })).toBe('Add edge');
  });
});

// ── Header / structural contract ────────────────────────────

describe('AddNodeEdgeModal: header structural contract', () => {
  it('mobile drag handle is visible only on <sm and centered', () => {
    expect(source).toContain('flex sm:hidden justify-center');
  });

  it('modal title uses headingStyle from design-system', () => {
    expect(source).toContain('...headingStyle');
  });

  it('modal title font-size uses clamp() (responsive without Tailwind classes)', () => {
    expect(source).toContain("fontSize: 'clamp(1rem, 2vw, 1.125rem)'");
  });

  it('modal scrolls vertically on overflow with max-h-[90dvh]', () => {
    expect(source).toContain('max-h-[90dvh]');
    expect(source).toContain('overflow-y-auto');
  });

  it('modal anchors to bottom on <sm (drawer style) and center on >=sm', () => {
    expect(source).toContain('items-end sm:items-center');
  });
});
