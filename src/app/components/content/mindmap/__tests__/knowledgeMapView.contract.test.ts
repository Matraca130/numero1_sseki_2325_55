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

  it('defines handleEdgeReconnect', () => {
    expect(source).toMatch(/const\s+handleEdgeReconnect\s*=\s*useCallback/);
  });

  it('defines handleAddStickyNote', () => {
    expect(source).toMatch(/const\s+handleAddStickyNote\s*=\s*useCallback/);
  });

  it('defines executeDeleteNode', () => {
    expect(source).toMatch(/const\s+executeDeleteNode\s*=\s*useCallback/);
  });

  it('defines setScope', () => {
    expect(source).toMatch(/const\s+setScope\s*=\s*useCallback/);
  });
});

// ── executeDeleteNode clears stale references ───────────────

describe('KnowledgeMapView: executeDeleteNode clears stale refs', () => {
  // Extract the executeDeleteNode function body for targeted checks
  const execDeleteMatch = source.match(
    /const\s+executeDeleteNode\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[/,
  );
  const execDeleteBody = execDeleteMatch?.[1] ?? '';

  it('clears contextMenu when deleted node matches', () => {
    expect(execDeleteBody).toContain('setContextMenu(prev => prev?.node.id === deletedId ? null : prev)');
  });

  it('clears connectSource when deleted node matches', () => {
    expect(execDeleteBody).toContain('setConnectSource(prev => prev?.id === deletedId ? null : prev)');
  });

  it('clears annotationNode when deleted node matches', () => {
    expect(execDeleteBody).toContain('setAnnotationNode(prev => prev?.id === deletedId ? null : prev)');
  });

  it('clears selectedNode when deleted node matches', () => {
    expect(execDeleteBody).toContain('setSelectedNode(prev => prev?.id === deletedId ? null : prev)');
  });

  it('uses deletedId variable to compare against prev state', () => {
    expect(execDeleteBody).toContain('const deletedId = confirmDeleteNode.id');
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

// ── handleAddStickyNote: functional updater pattern ──────────

describe('KnowledgeMapView: handleAddStickyNote uses functional updater', () => {
  const addStickyMatch = source.match(
    /const\s+handleAddStickyNote\s*=\s*useCallback\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[([^\]]*)\]\)/,
  );
  const addStickyBody = addStickyMatch?.[1] ?? '';
  const addStickyDeps = addStickyMatch?.[2] ?? '';

  it('uses functional updater to avoid stale closure on stickyNotes', () => {
    // Uses setStickyNotes(prev => ...) to read latest state
    expect(addStickyBody).toMatch(/setStickyNotes\(\s*prev\s*=>/);
  });

  it('does NOT include stickyNotes in dependency array (uses updater instead)', () => {
    expect(addStickyDeps).not.toContain('stickyNotes');
  });

  it('spreads prev (not stickyNotes) when building the new array', () => {
    expect(addStickyBody).toContain('[...prev, note]');
  });
});

// ── handleNodeCreated/handleEdgeCreated: include topic_id for undo ──

describe('KnowledgeMapView: undo payloads include topic_id', () => {
  it('handleNodeCreated spreads topic_id into pushAction payload', () => {
    const match = source.match(
      /const\s+handleNodeCreated\s*=\s*useCallback\(([\s\S]*?)\},\s*\[/,
    );
    const body = match?.[1] ?? '';
    expect(body).toContain('topic_id: effectiveTopicId');
    // Should NOT use unsafe 'as' cast
    expect(body).not.toContain('as Parameters<typeof pushAction>');
  });

  it('handleEdgeCreated spreads topic_id into pushAction payload', () => {
    const match = source.match(
      /const\s+handleEdgeCreated\s*=\s*useCallback\(([\s\S]*?)\},\s*\[/,
    );
    const body = match?.[1] ?? '';
    expect(body).toContain('topic_id: effectiveTopicId');
    expect(body).not.toContain('as Parameters<typeof pushAction>');
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

describe('KnowledgeMapView: handleEdgeReconnect has compensating rollback', () => {
  const reconnectMatch = source.match(
    /const\s+handleEdgeReconnect\s*=\s*useCallback\(async\s*\(result:\s*EdgeReconnectResult\)\s*=>\s*\{([\s\S]*?)\},\s*\[/,
  );
  const reconnectBody = reconnectMatch?.[1] ?? '';

  it('extracts the reconnect function body', () => {
    expect(reconnectBody.length).toBeGreaterThan(100);
  });

  it('guards against self-loops', () => {
    expect(reconnectBody).toContain('newSource === newTarget');
  });

  it('guards against duplicate edges', () => {
    expect(reconnectBody).toContain('edgeExists');
  });

  it('deletes old edge before creating new one', () => {
    const deleteIdx = reconnectBody.indexOf('deleteCustomEdge(oldEdge.id)');
    const createIdx = reconnectBody.indexOf('createCustomEdge({');
    expect(deleteIdx).toBeGreaterThan(-1);
    expect(createIdx).toBeGreaterThan(deleteIdx);
  });

  it('has compensating rollback — re-creates old edge if new edge creation fails', () => {
    // Should have a catch block that calls createCustomEdge(oldEdgePayload)
    expect(reconnectBody).toContain('createCustomEdge(oldEdgePayload)');
    expect(reconnectBody).toContain('throw createErr');
  });

  it('records reconnect-edge undo action', () => {
    expect(reconnectBody).toContain("type: 'reconnect-edge'");
  });

  it('uses mountedRef guard after async operations', () => {
    expect(reconnectBody).toContain('mountedRef.current');
  });

  it('shows toast warning on self-loop rejection', () => {
    // Extract the self-loop guard block
    const selfLoopSection = reconnectBody.slice(
      reconnectBody.indexOf('newSource === newTarget'),
      reconnectBody.indexOf('edgeExists'),
    );
    expect(selfLoopSection).toContain('toast.warning');
    expect(selfLoopSection).toContain('consigo mismo');
  });

  it('shows toast warning on duplicate edge rejection', () => {
    const dupeSection = reconnectBody.slice(
      reconnectBody.indexOf('edgeExists'),
      reconnectBody.indexOf('deleteCustomEdge'),
    );
    expect(dupeSection).toContain('toast.warning');
    expect(dupeSection).toContain('Ya existe');
  });

  it('guard clause returns without calling deleteCustomEdge', () => {
    // Guards are inside try block but return before any API calls
    const selfLoopToDelete = reconnectBody.slice(
      reconnectBody.indexOf('newSource === newTarget'),
      reconnectBody.indexOf('deleteCustomEdge'),
    );
    // There should be a 'return' between the self-loop guard and deleteCustomEdge
    expect(selfLoopToDelete).toContain('return');
  });

  it('finally block always resets reconnectingRef (no inline reset needed)', () => {
    // Guard clauses should NOT have redundant reconnectingRef.current = false
    const selfLoopBlock = reconnectBody.slice(
      reconnectBody.indexOf('newSource === newTarget'),
      reconnectBody.indexOf('edgeExists'),
    );
    expect(selfLoopBlock).not.toContain('reconnectingRef.current = false');
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

// ── Panel exclusivity: opening one closes others ────────────

describe('KnowledgeMapView: side panel exclusivity', () => {
  it('opening AI panel closes history and comparison', () => {
    // The onClick handler for AI button should close other panels
    expect(source).toMatch(/setShowAiPanel\(v\s*=>\s*\{[^}]*setShowHistory\(false\)[^}]*setShowComparison\(false\)/s);
  });

  it('opening history panel closes AI and comparison', () => {
    expect(source).toMatch(/setShowHistory\(v\s*=>\s*\{[^}]*setShowAiPanel\(false\)[^}]*setShowComparison\(false\)/s);
  });

  it('opening comparison panel closes AI and history', () => {
    expect(source).toMatch(/setShowComparison\(v\s*=>\s*\{[^}]*setShowAiPanel\(false\)[^}]*setShowHistory\(false\)/s);
  });
});

// ── Error boundaries wrap all critical components ───────────

describe('KnowledgeMapView: error boundary coverage', () => {
  it('wraps GraphToolbar in ErrorBoundary', () => {
    expect(source).toMatch(/ErrorBoundary[\s\S]*?<GraphToolbar/);
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
