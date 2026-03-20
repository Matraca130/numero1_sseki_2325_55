// ============================================================
// Contract Tests — KnowledgeMapView
//
// Source-based contract tests verifying structural contracts
// for recent fixes:
//   - executeDeleteNode clears stale references
//   - setScope resets tool/connection state
//   - handleAddStickyNote uses direct state read (no updater)
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

// ── handleAddStickyNote: direct state read ──────────────────

describe('KnowledgeMapView: handleAddStickyNote uses direct state read', () => {
  const addStickyMatch = source.match(
    /const\s+handleAddStickyNote\s*=\s*useCallback\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[([^\]]*)\]\)/,
  );
  const addStickyBody = addStickyMatch?.[1] ?? '';
  const addStickyDeps = addStickyMatch?.[2] ?? '';

  it('reads stickyNotes directly (not via functional updater)', () => {
    // It should use spread of stickyNotes, not setStickyNotes(prev => ...)
    expect(addStickyBody).toContain('[...stickyNotes, note]');
    expect(addStickyBody).not.toMatch(/setStickyNotes\(\s*prev\s*=>/);
  });

  it('includes stickyNotes in dependency array', () => {
    expect(addStickyDeps).toContain('stickyNotes');
  });

  it('calls setStickyNotes with the new array (not updater)', () => {
    expect(addStickyBody).toMatch(/setStickyNotes\(next\)/);
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
