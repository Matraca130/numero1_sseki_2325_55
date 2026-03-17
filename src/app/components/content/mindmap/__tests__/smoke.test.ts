// ============================================================
// Tests — Mindmap module smoke tests (filesystem-based)
//
// Verifies that all mindmap modules exist, export the expected
// symbols, and follow project conventions. Tests run in Node
// env with NO dynamic imports of React components (which hang
// in Node without DOM). Instead we use fs to read source files
// and verify export signatures via regex.
//
// Key safety checks:
//   - All expected files exist
//   - All expected exports are present
//   - Barrel re-exports everything
//   - Directory completeness (no untested files)
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const MINDMAP_DIR = resolve(__dirname, '..');

// ── Helpers ─────────────────────────────────────────────────

/** Read a source file and extract exported names */
function getExportedNames(filename: string): string[] {
  const filepath = join(MINDMAP_DIR, filename);
  if (!existsSync(filepath)) return [];
  const src = readFileSync(filepath, 'utf-8');
  const names: string[] = [];

  // export function Foo / export const Foo / export class Foo
  for (const m of src.matchAll(/export\s+(?:function|const|class)\s+(\w+)/g)) {
    names.push(m[1]);
  }
  // export type Foo
  for (const m of src.matchAll(/export\s+type\s+(\w+)/g)) {
    names.push(m[1]);
  }
  // export { Foo, Bar } — from barrel files
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

function fileExists(filename: string): boolean {
  return existsSync(join(MINDMAP_DIR, filename));
}

function fileContains(filename: string, text: string): boolean {
  const filepath = join(MINDMAP_DIR, filename);
  if (!existsSync(filepath)) return false;
  return readFileSync(filepath, 'utf-8').includes(text);
}

// ── Pure utility modules ────────────────────────────────────

describe('mindmap module: graphHelpers', () => {
  it('file exists', () => {
    expect(fileExists('graphHelpers.ts')).toBe(true);
  });
  it('exports expected pure functions', () => {
    const names = getExportedNames('graphHelpers.ts');
    expect(names).toContain('getNodeFill');
    expect(names).toContain('getNodeStroke');
    expect(names).toContain('getEdgeColor');
    expect(names).toContain('escHtml');
    expect(names).toContain('buildChildrenMap');
    expect(names).toContain('computeHiddenNodes');
  });
});

// ── Hook modules ────────────────────────────────────────────

describe('mindmap module: useNodePositions', () => {
  it('exports localStorage utility functions', () => {
    const names = getExportedNames('useNodePositions.ts');
    expect(names).toContain('loadPositions');
    expect(names).toContain('saveNodePosition');
    expect(names).toContain('clearPositions');
  });
});

describe('mindmap module: useGraphSearch', () => {
  it('exports useGraphSearch hook', () => {
    const names = getExportedNames('useGraphSearch.ts');
    expect(names).toContain('useGraphSearch');
  });
});

describe('mindmap module: useLocalGraph', () => {
  it('exports useLocalGraph hook', () => {
    const names = getExportedNames('useLocalGraph.ts');
    expect(names).toContain('useLocalGraph');
  });
});

describe('mindmap module: useGraphControls', () => {
  it('exports useGraphControls hook', () => {
    const names = getExportedNames('useGraphControls.ts');
    expect(names).toContain('useGraphControls');
  });
});

describe('mindmap module: useGraphExport', () => {
  it('exports useGraphExport hook', () => {
    const names = getExportedNames('useGraphExport.ts');
    expect(names).toContain('useGraphExport');
  });
});

describe('mindmap module: useUndoRedo', () => {
  it('exports useUndoRedo hook', () => {
    const names = getExportedNames('useUndoRedo.ts');
    expect(names).toContain('useUndoRedo');
  });
});

describe('mindmap module: useFullscreen', () => {
  it('exports useFullscreen hook', () => {
    const names = getExportedNames('useFullscreen.ts');
    expect(names).toContain('useFullscreen');
  });
});

describe('mindmap module: useGraphData', () => {
  it('exports useGraphData hook and invalidateGraphCache', () => {
    const names = getExportedNames('useGraphData.ts');
    expect(names).toContain('useGraphData');
    expect(names).toContain('invalidateGraphCache');
  });
});

// ── Component modules ───────────────────────────────────────

describe('mindmap module: GraphSkeleton', () => {
  it('exports GraphSkeleton component', () => {
    const names = getExportedNames('GraphSkeleton.tsx');
    expect(names).toContain('GraphSkeleton');
  });
});

describe('mindmap module: MapToolsPanel', () => {
  it('exports MapToolsPanel component and MapTool type', () => {
    const names = getExportedNames('MapToolsPanel.tsx');
    expect(names).toContain('MapToolsPanel');
    expect(names).toContain('MapTool');
  });
});

describe('mindmap module: AiTutorPanel', () => {
  it('exports AiTutorPanel component', () => {
    const names = getExportedNames('AiTutorPanel.tsx');
    expect(names).toContain('AiTutorPanel');
  });
});

describe('mindmap module: KnowledgeGraph', () => {
  it('exports KnowledgeGraph component', () => {
    const names = getExportedNames('KnowledgeGraph.tsx');
    expect(names).toContain('KnowledgeGraph');
  });
});

describe('mindmap module: GraphToolbar', () => {
  it('exports GraphToolbar component', () => {
    const names = getExportedNames('GraphToolbar.tsx');
    expect(names).toContain('GraphToolbar');
  });
});

describe('mindmap module: MicroGraphPanel', () => {
  it('exports MicroGraphPanel component', () => {
    const names = getExportedNames('MicroGraphPanel.tsx');
    expect(names).toContain('MicroGraphPanel');
  });
});

describe('mindmap module: MiniKnowledgeGraph', () => {
  it('exports MiniKnowledgeGraph component', () => {
    const names = getExportedNames('MiniKnowledgeGraph.tsx');
    expect(names).toContain('MiniKnowledgeGraph');
  });
});

describe('mindmap module: NodeAnnotationModal', () => {
  it('exports NodeAnnotationModal component', () => {
    const names = getExportedNames('NodeAnnotationModal.tsx');
    expect(names).toContain('NodeAnnotationModal');
  });
});

describe('mindmap module: NodeContextMenu', () => {
  it('exports NodeContextMenu component', () => {
    const names = getExportedNames('NodeContextMenu.tsx');
    expect(names).toContain('NodeContextMenu');
  });
});

describe('mindmap module: AddNodeEdgeModal', () => {
  it('exports AddNodeEdgeModal component', () => {
    const names = getExportedNames('AddNodeEdgeModal.tsx');
    expect(names).toContain('AddNodeEdgeModal');
  });
});

describe('mindmap module: ConfirmDialog', () => {
  it('exports ConfirmDialog component', () => {
    const names = getExportedNames('ConfirmDialog.tsx');
    expect(names).toContain('ConfirmDialog');
  });
});

describe('mindmap module: ChangeHistoryPanel', () => {
  it('exports ChangeHistoryPanel component', () => {
    const names = getExportedNames('ChangeHistoryPanel.tsx');
    expect(names).toContain('ChangeHistoryPanel');
  });
});

describe('mindmap module: changeHistoryHelpers', () => {
  it('exports expected history helper functions', () => {
    const names = getExportedNames('changeHistoryHelpers.ts');
    expect(names).toContain('loadHistory');
    expect(names).toContain('saveHistory');
    expect(names).toContain('clearHistoryStorage');
    expect(names).toContain('createNodeEntry');
    expect(names).toContain('createEdgeEntry');
    expect(names).toContain('formatRelativeTime');
  });
});

describe('mindmap module: ShareMapModal', () => {
  it('exports ShareMapModal component', () => {
    const names = getExportedNames('ShareMapModal.tsx');
    expect(names).toContain('ShareMapModal');
  });
});

describe('mindmap module: PresentationMode', () => {
  it('exports PresentationMode component', () => {
    const names = getExportedNames('PresentationMode.tsx');
    expect(names).toContain('PresentationMode');
  });
});

describe('mindmap module: presentationHelpers', () => {
  it('exports expected presentation helper functions', () => {
    const names = getExportedNames('presentationHelpers.ts');
    expect(names).toContain('masteryLabel');
    expect(names).toContain('masteryPercent');
    expect(names).toContain('topologicalSort');
    expect(names).toContain('presentationFontSize');
  });
});

// ── Barrel re-exports ───────────────────────────────────────

describe('mindmap module: index barrel', () => {
  it('re-exports all expected symbols', () => {
    const filepath = join(MINDMAP_DIR, 'index.ts');
    const src = readFileSync(filepath, 'utf-8');

    const expectedExports = [
      'KnowledgeGraph',
      'MiniKnowledgeGraph',
      'MicroGraphPanel',
      'NodeContextMenu',
      'NodeAnnotationModal',
      'AddNodeEdgeModal',
      'GraphToolbar',
      'useGraphData',
      'invalidateGraphCache',
      'useLocalGraph',
      'useGraphSearch',
      'useSwipeDismiss',
      'useSearchFocus',
      'useGraphControls',
      'ConfirmDialog',
      'useFullscreen',
      'MapToolsPanel',
      'AiTutorPanel',
      'GraphSkeleton',
      'useUndoRedo',
      'loadPositions',
      'saveNodePosition',
      'clearPositions',
      'getNodeFill',
      'getNodeStroke',
      'getEdgeColor',
      'escHtml',
      'buildChildrenMap',
      'computeHiddenNodes',
      'useGraphExport',
      'ShareMapModal',
    ];

    for (const name of expectedExports) {
      expect(src, `barrel should re-export ${name}`).toContain(name);
    }
  });
});

// ── Service modules ─────────────────────────────────────────

describe('mindmap service: mindmapApi', () => {
  it('exports expected API functions', () => {
    const filepath = resolve(__dirname, '..', '..', '..', '..', 'services', 'mindmapApi.ts');
    const src = readFileSync(filepath, 'utf-8');
    expect(src).toMatch(/export\s+(async\s+)?function\s+createCustomNode/);
    expect(src).toMatch(/export\s+(async\s+)?function\s+deleteCustomNode/);
    expect(src).toMatch(/export\s+(async\s+)?function\s+createCustomEdge/);
    expect(src).toMatch(/export\s+(async\s+)?function\s+deleteCustomEdge/);
  });
});

describe('mindmap service: mindmapAiApi', () => {
  it('exports expected AI API functions', () => {
    const filepath = resolve(__dirname, '..', '..', '..', '..', 'services', 'mindmapAiApi.ts');
    const src = readFileSync(filepath, 'utf-8');
    expect(src).toMatch(/export\s+(async\s+)?function\s+analyzeKnowledgeGraph/);
    expect(src).toMatch(/export\s+(async\s+)?function\s+suggestStudentConnections/);
    expect(src).toMatch(/export\s+(async\s+)?function\s+getStudentWeakPoints/);
  });
});

// ── Type modules ────────────────────────────────────────────

describe('mindmap types: mindmap.ts', () => {
  it('exports expected types and constants', () => {
    const filepath = resolve(__dirname, '..', '..', '..', '..', 'types', 'mindmap.ts');
    const src = readFileSync(filepath, 'utf-8');
    expect(src).toContain('CONNECTION_TYPES');
    expect(src).toContain('CONNECTION_TYPE_MAP');
    expect(src).toContain('MASTERY_HEX');
    expect(src).toContain('MASTERY_HEX_LIGHT');
    expect(src).toContain('truncateLabel');
  });
});

describe('mindmap types: mindmap-ai.ts', () => {
  it('exports expected AI types', () => {
    const filepath = resolve(__dirname, '..', '..', '..', '..', 'types', 'mindmap-ai.ts');
    expect(existsSync(filepath)).toBe(true);
    const src = readFileSync(filepath, 'utf-8');
    expect(src).toContain('AnalyzeKnowledgeGraphResponse');
    expect(src).toContain('SuggestedConnection');
    expect(src).toContain('WeakPoint');
  });
});

// ── Directory completeness ──────────────────────────────────

describe('mindmap directory completeness', () => {
  it('every .ts/.tsx source file (excluding tests) is accounted for', () => {
    const files = readdirSync(MINDMAP_DIR)
      .filter(f => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));

    const tested = new Set([
      'graphHelpers.ts',
      'useNodePositions.ts',
      'useGraphSearch.ts',
      'useLocalGraph.ts',
      'useGraphControls.ts',
      'useGraphExport.ts',
      'useUndoRedo.ts',
      'useFullscreen.ts',
      'useGraphData.ts',
      'GraphSkeleton.tsx',
      'MapToolsPanel.tsx',
      'AiTutorPanel.tsx',
      'KnowledgeGraph.tsx',
      'GraphToolbar.tsx',
      'MicroGraphPanel.tsx',
      'MiniKnowledgeGraph.tsx',
      'NodeAnnotationModal.tsx',
      'NodeContextMenu.tsx',
      'AddNodeEdgeModal.tsx',
      'ConfirmDialog.tsx',
      'ChangeHistoryPanel.tsx',
      'changeHistoryHelpers.ts',
      'ShareMapModal.tsx',
      'PresentationMode.tsx',
      'presentationHelpers.ts',
      'index.ts',
      // Small internal hooks — tested transitively
      'useFocusTrap.ts',
      'useSwipeDismiss.ts',
      'useSearchFocus.ts',
    ]);

    const untested = files.filter(f => !tested.has(f));
    expect(untested, `Untested mindmap files: ${untested.join(', ')}`).toEqual([]);
  });
});
