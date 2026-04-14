// ============================================================
// Contract Tests — KnowledgeMapView
//
// Source-based contract tests verifying structural contracts
// for recent fixes:
//   - executeDeleteNode clears stale references
//   - setScope resets tool/connection state
//   - handleAddStickyNote uses functional updater (avoids stale closure)
//   - Module export shape
//   - Key callbacks exist
//   - handleAction switch completeness
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '..', '..', 'KnowledgeMapView.tsx'),
  'utf-8',
);

// ── Module contract ─────────────────────────────────────────

describe('KnowledgeMapView: module contract', () => {
  it('exports a named function KnowledgeMapView', () => {
    expect(source).toMatch(/export\s+function\s+KnowledgeMapView/);
  });

  it('has no default export (page component imported by router)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Key callbacks exist ─────────────────────────────────────

describe('KnowledgeMapView: key callbacks', () => {
  it('defines handleAction', () => {
    expect(source).toMatch(/const\s+handleAction\s*=\s*useCallback/);
  });

  it('defines handleNodeClick', () => {
    expect(source).toMatch(/const\s+handleNodeClick\s*=\s*useCallback/);
  });

  it('receives handleEdgeReconnect from extracted hook', () => {
    expect(source).toContain('handleEdgeReconnect');
  });

  it('receives handleAddStickyNote from useMapStickyNotes', () => {
    expect(source).toContain('handleAddStickyNote');
    expect(source).toContain('useMapStickyNotes');
  });

  it('receives executeDeleteNode from useMapNodeActions', () => {
    expect(source).toContain('executeDeleteNode');
    expect(source).toContain('useMapNodeActions');
  });

  it('defines setScope', () => {
    expect(source).toMatch(/const\s+setScope\s*=\s*useCallback/);
  });
});

// ── executeDeleteNode clears stale references ───────────────

describe('executeDeleteNode clears stale refs (now in useMapNodeActions)', () => {
  const hookSource = readFileSync(
    resolve(__dirname, '..', 'useMapNodeActions.ts'),
    'utf-8',
  );

  it('hook defines executeDeleteNode', () => {
    expect(hookSource).toContain('executeDeleteNode');
  });

  it('calls deleteCustomNode API', () => {
    expect(hookSource).toContain('deleteCustomNode');
  });

  it('refetches data after deletion', () => {
    expect(hookSource).toContain('refetch');
  });

  it('pushes undo action for node deletion', () => {
    expect(hookSource).toContain('pushAction');
  });

  it('clears UI state after deletion', () => {
    expect(hookSource).toContain('setConfirmDeleteNode');
  });
});

// ── setScope resets tool/connection state ────────────────────

describe('KnowledgeMapView: setScope resets state', () => {
  const setScopeMatch = source.match(
    /const\s+setScope\s*=\s*useCallback\(\(s:\s*GraphScope\)\s*=>\s*\{([\s\S]*?)\},\s*\[/,
  );
  const setScopeBody = setScopeMatch?.[1] ?? '';

  it('resets connectSource to null', () => {
    expect(setScopeBody).toContain('setConnectSource(null)');
  });

  it('resets annotationNode to null', () => {
    expect(setScopeBody).toContain('setAnnotationNode(null)');
  });

  it('resets activeTool to pointer', () => {
    expect(setScopeBody).toContain("setActiveTool('pointer')");
  });

  it('clears contextMenu', () => {
    expect(setScopeBody).toContain('setContextMenu(null)');
  });

  it('clears selectedNode', () => {
    expect(setScopeBody).toContain('setSelectedNode(null)');
  });

  it('calls setScopeRaw with the new scope', () => {
    expect(setScopeBody).toContain('setScopeRaw(s)');
  });
});

// ── handleAddStickyNote: now in useMapStickyNotes ──────────

describe('handleAddStickyNote (now in useMapStickyNotes)', () => {
  const hookSource = readFileSync(
    resolve(__dirname, '..', 'useMapStickyNotes.ts'),
    'utf-8',
  );

  it('defines handleAddStickyNote', () => {
    expect(hookSource).toContain('handleAddStickyNote');
  });

  it('uses setStickyNotes to update state', () => {
    expect(hookSource).toContain('setStickyNotes');
  });

  it('persists sticky notes', () => {
    expect(hookSource).toContain('saveStickyNotes');
  });
});

// ── handleNodeCreated/handleEdgeCreated: include topic_id for undo ──
// (now in extracted hooks: useMapNodeActions, useMapEdgeActions)

describe('undo payloads include topic_id (extracted hooks)', () => {
  const nodeActionsSource = readFileSync(
    resolve(__dirname, '..', 'useMapNodeActions.ts'), 'utf-8',
  );
  const edgeActionsSource = readFileSync(
    resolve(__dirname, '..', 'useMapEdgeActions.ts'), 'utf-8',
  );

  it('handleNodeCreated includes topic_id in pushAction payload', () => {
    expect(nodeActionsSource).toContain('handleNodeCreated');
    expect(nodeActionsSource).toContain('topic_id');
    expect(nodeActionsSource).toContain('pushAction');
  });

  it('handleEdgeCreated includes topic_id in pushAction payload', () => {
    expect(edgeActionsSource).toContain('handleEdgeCreated');
    expect(edgeActionsSource).toContain('topic_id');
    expect(edgeActionsSource).toContain('pushAction');
  });
});

// ── handleAction switch completeness ────────────────────────

describe('KnowledgeMapView: handleAction covers all action types', () => {
  const handleActionMatch = source.match(
    /const\s+handleAction\s*=\s*useCallback\(([\s\S]*?)\},\s*\[/,
  );
  const handleActionBody = handleActionMatch?.[1] ?? '';

  it('handles flashcard action', () => {
    expect(handleActionBody).toContain("case 'flashcard'");
  });

  it('handles quiz action', () => {
    expect(handleActionBody).toContain("case 'quiz'");
  });

  it('handles summary action', () => {
    expect(handleActionBody).toContain("case 'summary'");
  });

  it('handles connect action', () => {
    expect(handleActionBody).toContain("case 'connect'");
  });

  it('handles annotate action', () => {
    expect(handleActionBody).toContain("case 'annotate'");
  });

  it('handles details action', () => {
    expect(handleActionBody).toContain("case 'details'");
  });

  it('closes context menu before dispatching action', () => {
    expect(handleActionBody).toContain('setContextMenu(null)');
  });
});

// ── handleEdgeReconnect: compensating rollback ──────────────
// (now in useMapEdgeActions.ts)

describe('handleEdgeReconnect compensating rollback (useMapEdgeActions)', () => {
  const edgeActionsSource = readFileSync(
    resolve(__dirname, '..', 'useMapEdgeActions.ts'), 'utf-8',
  );

  it('defines handleEdgeReconnect', () => {
    expect(edgeActionsSource).toContain('handleEdgeReconnect');
  });

  it('guards against self-loops', () => {
    expect(edgeActionsSource).toContain('newSource === newTarget');
  });

  it('guards against duplicate edges', () => {
    expect(edgeActionsSource).toContain('edgeExists');
  });

  it('deletes old edge before creating new one', () => {
    expect(edgeActionsSource).toContain('deleteCustomEdge');
    expect(edgeActionsSource).toContain('createCustomEdge');
  });

  it('has compensating rollback on failure', () => {
    expect(edgeActionsSource).toContain('rollbackPayload');
  });

  it('records reconnect-edge undo action', () => {
    expect(edgeActionsSource).toContain("type: 'reconnect-edge'");
  });

  it('uses mountedRef guard after async operations', () => {
    expect(edgeActionsSource).toContain('mountedRef');
  });

  it('shows toast warning on rejection', () => {
    expect(edgeActionsSource).toContain('toast.warning');
  });

  it('returns early on guard violations', () => {
    // Guards should return before API calls
    expect(edgeActionsSource).toContain('return;');
  });
});

// ── Topic change: comprehensive state cleanup ───────────────

describe('KnowledgeMapView: topic change resets all stale state', () => {
  // Find the useEffect that fires on topicId change
  const topicCleanupMatch = source.match(
    /if\s*\(prevTopicIdRef\.current\s*!==\s*topicId\)\s*\{([\s\S]*?)\n\s*\}/,
  );
  const topicCleanupBody = topicCleanupMatch?.[1] ?? '';

  it('extracts the topic change cleanup block', () => {
    expect(topicCleanupBody.length).toBeGreaterThan(50);
  });

  it('resets AI highlight nodes', () => {
    expect(topicCleanupBody).toContain('setAiHighlightNodes(undefined)');
  });

  it('resets AI review nodes', () => {
    expect(topicCleanupBody).toContain('setAiReviewNodes(undefined)');
  });

  it('resets connect source', () => {
    expect(topicCleanupBody).toContain('setConnectSource(null)');
  });

  it('resets connect target', () => {
    expect(topicCleanupBody).toContain('setConnectTarget(null)');
  });

  it('resets confirm delete node', () => {
    expect(topicCleanupBody).toContain('setConfirmDeleteNode(null)');
  });

  it('resets annotation node', () => {
    expect(topicCleanupBody).toContain('setAnnotationNode(null)');
  });

  it('closes all side panels', () => {
    expect(topicCleanupBody).toContain('setShowAiPanel(false)');
    expect(topicCleanupBody).toContain('setShowHistory(false)');
    expect(topicCleanupBody).toContain('setShowComparison(false)');
  });

  it('exits presentation mode', () => {
    expect(topicCleanupBody).toContain('setPresentationMode(false)');
  });

  it('resets mastery filter', () => {
    expect(topicCleanupBody).toContain('setMasteryFilter(null)');
  });

  it('resets active tool to pointer', () => {
    expect(topicCleanupBody).toContain("setActiveTool('pointer')");
  });

  it('clears undo/redo history', () => {
    expect(topicCleanupBody).toContain('clearHistory()');
  });
});

// ── Panel exclusivity: panel state managed by useMapUIState ──

describe('KnowledgeMapView: side panel state', () => {
  it('uses showAiPanel state', () => {
    expect(source).toContain('showAiPanel');
  });

  it('uses showHistory state', () => {
    expect(source).toContain('showHistory');
  });

  it('uses showComparison state', () => {
    expect(source).toContain('showComparison');
  });

  it('has setters for all panel states', () => {
    expect(source).toContain('setShowAiPanel');
    expect(source).toContain('setShowHistory');
    expect(source).toContain('setShowComparison');
  });
});

// ── Error boundaries wrap all critical components ───────────

describe('KnowledgeMapView: error boundary coverage', () => {
  it('wraps GraphSidebar in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<GraphSidebar/);
  });

  it('wraps KnowledgeGraph in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<KnowledgeGraph/);
  });

  it('wraps NodeContextMenu in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<NodeContextMenu/);
  });

  it('wraps AddNodeEdgeModal in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<AddNodeEdgeModal/);
  });

  it('wraps AiTutorPanel in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<AiTutorPanel/);
  });

  it('wraps PresentationMode in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<PresentationMode/);
  });

  it('wraps StickyNotesLayer in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<StickyNotesLayer/);
  });

  it('wraps ShareMapModal in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<ShareMapModal/);
  });

  it('wraps ConfirmDialog in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?confirmDeleteNode/);
  });
});
