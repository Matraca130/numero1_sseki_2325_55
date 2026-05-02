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

// ── i18n locale + fallback ─────────────────────────────────

describe('i18n locale + fallback', () => {
  it("hardcodes locale = 'pt' (student default)", () => {
    expect(source).toMatch(/const\s+locale:\s*GraphLocale\s*=\s*['"]pt['"]/);
  });

  it("falls back to I18N_MAP_VIEW.es when locale lookup misses", () => {
    expect(source).toMatch(/I18N_MAP_VIEW\[locale\]\s*\?\?\s*I18N_MAP_VIEW\.es/);
  });

  it("falls back to I18N_GRAPH.es when passing i18n into useUndoRedo", () => {
    expect(source).toMatch(/useUndoRedo\(refetch,\s*I18N_GRAPH\[locale\]\s*\?\?\s*I18N_GRAPH\.es\)/);
  });
});

// ── Module-level constants ─────────────────────────────────

describe('Module-level constants (avoid new refs per render)', () => {
  it('declares EMPTY_NODES as module-level constant', () => {
    expect(source).toMatch(/const\s+EMPTY_NODES:\s*MapNode\[\]\s*=\s*\[\]/);
  });

  it('imports haptic helper from shared mindmap/hapticHelper module', () => {
    // Cycle #44: haptic was triplicated across KnowledgeMapView, useMapEdgeActions,
    // and useMapNodeActions. Extracted to mindmap/hapticHelper.ts as single source of truth.
    expect(source).toMatch(/import\s+\{\s*haptic\s*\}\s+from\s+['"]\.\/mindmap\/hapticHelper['"]/);
    // Confirm the local declaration is gone — no duplicate at module scope.
    expect(source).not.toMatch(/const\s+haptic\s*=\s*\(ms\s*=\s*50\)/);
  });
});

// ── Topic resolution priority ─────────────────────────────

describe('Topic resolution priority', () => {
  it('topicId resolves URL > context > manualTopicId', () => {
    expect(source).toMatch(/searchParams\.get\(['"]topicId['"]\)\s*\|\|\s*currentTopic\?\.id\s*\|\|\s*manualTopicId/);
  });

  it('summaryId from URL only', () => {
    expect(source).toMatch(/searchParams\.get\(['"]summaryId['"]\)\s*\|\|\s*undefined/);
  });

  it('effectiveTopicId fallback: topicId || courseTopicIds[0] || ""', () => {
    expect(source).toMatch(/const\s+effectiveTopicId\s*=\s*topicId\s*\|\|\s*courseTopicIds\[0\]\s*\|\|\s*['"]['"]/);
  });
});

// ── allTopics flatten ──────────────────────────────────────

describe('allTopics flatten (course→semester→section→topic)', () => {
  it('iterates 4 levels: course → semester → section → topic', () => {
    expect(source).toMatch(/for\s*\(const course of tree\.courses\)[\s\S]{0,300}for\s*\(const semester of course\.semesters[\s\S]{0,300}for\s*\(const section of semester\.sections[\s\S]{0,300}for\s*\(const topic of section\.topics/);
  });

  it('falls back to t.untitled for missing topic.name', () => {
    expect(source).toMatch(/topic\.name\s*\|\|\s*t\.untitled/);
  });

  it('attaches courseName for selector display', () => {
    expect(source).toMatch(/courseName:\s*course\.name/);
  });

  it('useMemo dep is [tree]', () => {
    expect(source).toMatch(/allTopics\s*=\s*useMemo\([\s\S]{0,800}\},\s*\[tree\]\)/);
  });
});

// ── courseTopicIds extraction ──────────────────────────────

describe('courseTopicIds extraction', () => {
  it('flattens semesters → sections → topics from currentCourse', () => {
    expect(source).toMatch(/courseTopicIds\s*=\s*useMemo[\s\S]{0,400}for\s*\(const sem of currentCourse\.semesters[\s\S]{0,300}sec\.topics/);
  });

  it('hasCourseTopics is true when more than 1 topic in course', () => {
    expect(source).toMatch(/const\s+hasCourseTopics\s*=\s*courseTopicIds\.length\s*>\s*1/);
  });

  it('useMemo dep is [currentCourse]', () => {
    expect(source).toMatch(/courseTopicIds\s*=\s*useMemo\([\s\S]{0,500}\},\s*\[currentCourse\]\)/);
  });
});

// ── Scope branching for useGraphData ───────────────────────

describe("Scope branching: 'topic' vs 'course'", () => {
  it("passes topicId only when scope==='topic', else undefined", () => {
    expect(source).toMatch(/topicId:\s*scope\s*===\s*['"]topic['"]\s*\?\s*topicId\s*:\s*undefined/);
  });

  it("passes summaryId only when scope==='topic'", () => {
    expect(source).toMatch(/summaryId:\s*scope\s*===\s*['"]topic['"]\s*\?\s*summaryId\s*:\s*undefined/);
  });

  it("passes courseTopicIds only when scope==='course'", () => {
    expect(source).toMatch(/courseTopicIds:\s*scope\s*===\s*['"]course['"]\s*\?\s*courseTopicIds\s*:\s*undefined/);
  });
});

// ── Stable graphData refs ──────────────────────────────────

describe('Stable graphData refs', () => {
  it('mirrors graphData.nodes into graphDataNodesRef on every render', () => {
    expect(source).toMatch(/const graphDataNodesRef\s*=\s*useRef\(graphData\?\.nodes\);[\s\S]{0,80}graphDataNodesRef\.current\s*=\s*graphData\?\.nodes/);
  });

  it('mirrors graphData.edges into graphDataEdgesRef on every render', () => {
    expect(source).toMatch(/const graphDataEdgesRef\s*=\s*useRef\(graphData\?\.edges\);[\s\S]{0,80}graphDataEdgesRef\.current\s*=\s*graphData\?\.edges/);
  });

  it('mirrors entire graphData into graphDataRef (used by panel callbacks)', () => {
    expect(source).toMatch(/const graphDataRef\s*=\s*useRef\(graphData\);[\s\S]{0,80}graphDataRef\.current\s*=\s*graphData/);
  });
});

// ── handleNodeClick tool-mode branches ─────────────────────

describe('handleNodeClick tool-mode branches', () => {
  const handleNodeClickMatch = source.match(
    /const\s+handleNodeClick\s*=\s*useCallback\(\(node:[\s\S]{0,3500}\}\,\s*\[\]\)/,
  );
  const body = handleNodeClickMatch?.[0] ?? '';

  it('extracts the handleNodeClick body', () => {
    expect(body.length).toBeGreaterThan(100);
  });

  it("annotate tool sets annotationNode and reverts to 'pointer'", () => {
    expect(body).toMatch(/case\s+['"]annotate['"]:\s*setAnnotationNode\(node\);\s*setActiveTool\(['"]pointer['"]\)/);
  });

  it('delete tool checks node.isUserCreated (errors on system nodes)', () => {
    expect(body).toMatch(/case\s+['"]delete['"]:[\s\S]{0,300}if\s*\(node\.isUserCreated\)/);
    expect(body).toContain('toast.error(t.deleteOnlyUserCreated)');
  });

  it('connect tool: first click sets source via setConnectSource(node)', () => {
    expect(body).toMatch(/case\s+['"]connect['"]:[\s\S]{0,300}if\s*\(!source\)\s*\{[\s\S]{0,200}setConnectSource\(node\)/);
  });

  it('connect tool: clicking same source cancels connect mode', () => {
    expect(body).toMatch(/source\.id\s*===\s*node\.id[\s\S]{0,300}t\.connectionCancelled/);
  });

  it('connect tool: second-click opens addModal pre-filled with target', () => {
    expect(body).toMatch(/setConnectTarget\(node\);\s*setAddModalOpen\(true\);\s*setActiveTool\(['"]pointer['"]\)/);
  });

  it('default tool: setSelectedNode + clamped contextMenu + haptic(10)', () => {
    expect(body).toMatch(/setSelectedNode\(node\);\s*const\s+rawPos[\s\S]{0,400}haptic\(10\)/);
  });

  it("null node + connect tool with source: cancels and toasts t.connectionCancelled", () => {
    expect(body).toMatch(/if\s*\(!node\)[\s\S]{0,500}tool\s*===\s*['"]connect['"][\s\S]{0,200}t\.connectionCancelled/);
  });

  it("null node + add-node tool: opens add modal", () => {
    expect(body).toMatch(/if\s*\(!node\)[\s\S]{0,800}tool\s*===\s*['"]add-node['"][\s\S]{0,200}setAddModalOpen\(true\)/);
  });
});

// ── handleNodeRightClick / clampedPos formula ──────────────

describe('handleNodeRightClick clamping', () => {
  it('uses haptic(30) for right-click', () => {
    expect(source).toMatch(/handleNodeRightClick[\s\S]{0,300}haptic\(30\)/);
  });

  it('clamps x to window.innerWidth - 250 (menu width margin)', () => {
    expect(source).toMatch(/x:\s*Math\.min\(position\.x,\s*window\.innerWidth\s*-\s*250\)/);
  });

  it('clamps y to window.innerHeight - 300 (menu height margin)', () => {
    expect(source).toMatch(/y:\s*Math\.min\(position\.y,\s*window\.innerHeight\s*-\s*300\)/);
  });
});

// ── handleAction navigation URLs ───────────────────────────

describe('handleAction navigation URLs', () => {
  it('flashcard navigates to /student/flashcards?keywordId=<id>', () => {
    expect(source).toMatch(/navigateWithFade\(`\/student\/flashcards\?keywordId=\$\{node\.id\}`\)/);
  });

  it('quiz navigates to /student/quizzes?keywordId=<id>', () => {
    expect(source).toMatch(/navigateWithFade\(`\/student\/quizzes\?keywordId=\$\{node\.id\}`\)/);
  });

  it('summary uses node.topicId || effectiveTopicId, optional ?summaryId=<sid>', () => {
    expect(source).toMatch(/const tid\s*=\s*node\.topicId\s*\|\|\s*effectiveTopicId/);
    expect(source).toMatch(/navigateWithFade\(`\/student\/summary\/\$\{tid\}\$\{summaryParam\}`\)/);
    expect(source).toMatch(/node\.summaryId\s*\?\s*`\?summaryId=\$\{node\.summaryId\}`\s*:\s*['"]['"]/);
  });

  it('connect action sets source + activates connect tool', () => {
    expect(source).toMatch(/case\s+['"]connect['"]:[\s\S]{0,300}setConnectSource\(node\);\s*setActiveTool\(['"]connect['"]\)/);
  });
});

// ── Fade-out navigation ────────────────────────────────────

describe('navigateWithFade', () => {
  it('uses 150ms fade-out before navigate', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*navigate\(to\),\s*150\)/);
  });

  it('clears any prior fade timer before starting a new one', () => {
    expect(source).toMatch(/clearTimeout\(fadeTimerRef\.current\)/);
  });

  it('sets exiting=true to start fade animation', () => {
    expect(source).toMatch(/navigateWithFade[\s\S]{0,300}setExiting\(true\)/);
  });

  it('cleanup effect clears fade timer on unmount', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\(\)\s*=>\s*\{\s*clearTimeout\(fadeTimerRef\.current\)/);
  });
});

// ── Mastery filter ─────────────────────────────────────────

describe('Mastery filter', () => {
  it('uses getSafeMasteryColor to classify each node', () => {
    expect(source).toMatch(/getSafeMasteryColor\(node\.mastery\)\s*===\s*masteryFilter/);
  });

  it('returns undefined when no nodes match (size===0) or filter is null', () => {
    expect(source).toMatch(/ids\.size\s*>\s*0\s*\?\s*ids\s*:\s*undefined/);
    expect(source).toMatch(/if\s*\(!masteryFilter\s*\|\|\s*!graphData\)\s*return\s+undefined/);
  });

  it('useMemo dep is [masteryFilter, graphData]', () => {
    expect(source).toMatch(/masteryFilterNodeIds\s*=\s*useMemo\([\s\S]{0,500}\},\s*\[masteryFilter,\s*graphData\]\)/);
  });
});

// ── Memoized derived sets/maps ─────────────────────────────

describe('Memoized derived collections', () => {
  it('nodesWithChildren is a Set of edge sources', () => {
    expect(source).toMatch(/nodesWithChildren\s*=\s*useMemo[\s\S]{0,400}new Set\(graphData\.edges\.map\(e\s*=>\s*e\.source\)\.filter\(Boolean\)\)/);
  });

  it('nodeLabels is a Map<id, label> from graphData.nodes', () => {
    expect(source).toMatch(/nodeLabels\s*=\s*useMemo[\s\S]{0,400}new Map\(graphData\.nodes\.map\(n\s*=>\s*\[n\.id,\s*n\.label\]\)\)/);
  });

  it('existingNodeIds depends on [graphData?.nodes] (granular dep)', () => {
    expect(source).toMatch(/existingNodeIds\s*=\s*useMemo\([\s\S]{0,300}\[graphData\?\.nodes\]/);
  });

  it('existingEdgeIds depends on [graphData?.edges] (granular dep)', () => {
    expect(source).toMatch(/existingEdgeIds\s*=\s*useMemo\([\s\S]{0,300}\[graphData\?\.edges\]/);
  });
});

// ── Mounted ref lifecycle ──────────────────────────────────

describe('Mounted ref lifecycle', () => {
  it('mountedRef starts true, set to false on unmount', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*true;\s*return\s*\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*false/);
  });
});

// ── History persistence effects ────────────────────────────

describe('History persistence effects', () => {
  it('loadHistory called when effectiveTopicId changes', () => {
    expect(source).toMatch(/setHistoryEntries\(loadHistory\(effectiveTopicId\)\)[\s\S]{0,80}\},\s*\[effectiveTopicId\]\)/);
  });

  it('saveHistory persists when entries.length > 0 (avoids overwrite-with-empty on initial mount)', () => {
    expect(source).toMatch(/historyEntries\.length\s*>\s*0\)\s*saveHistory\(effectiveTopicId,\s*historyEntries\)/);
  });

  it('save effect deps are [effectiveTopicId, historyEntries]', () => {
    expect(source).toMatch(/saveHistory\([\s\S]{0,300}\},\s*\[effectiveTopicId,\s*historyEntries\]\)/);
  });
});

// ── Search wiring ──────────────────────────────────────────

describe('Search hook wiring', () => {
  it('uses useGraphSearch(graphData) to derive matchingNodeIds + filteredGraphData', () => {
    expect(source).toMatch(/useGraphSearch\(graphData\)/);
  });

  it('binds Ctrl+F / "/" via useSearchFocus(searchInputRef)', () => {
    expect(source).toMatch(/useSearchFocus\(searchInputRef\)/);
  });
});

// ── handleTopicSelect ──────────────────────────────────────

describe('handleTopicSelect', () => {
  const match = source.match(/handleTopicSelect\s*=\s*useCallback\([\s\S]{0,500}\},\s*\[setSearchParams,\s*setSearchQuery\]\)/);
  const body = match?.[0] ?? '';

  it('exists and depends on [setSearchParams, setSearchQuery]', () => {
    expect(body.length).toBeGreaterThan(50);
  });

  it('updates manualTopicId state', () => {
    expect(body).toContain('setManualTopicId(tid)');
  });

  it("updates URL via setSearchParams({ topicId: tid }) or {}", () => {
    expect(body).toMatch(/setSearchParams\(tid\s*\?\s*\{\s*topicId:\s*tid\s*\}\s*:\s*\{\}\)/);
  });

  it('clears selectedNode, contextMenu, search query', () => {
    expect(body).toContain('setSelectedNode(null)');
    expect(body).toContain('setContextMenu(null)');
    expect(body).toContain("setSearchQuery('')");
  });
});

// ── GraphScope type ────────────────────────────────────────

describe('GraphScope type contract', () => {
  it("declares GraphScope = 'topic' | 'course'", () => {
    expect(source).toMatch(/type\s+GraphScope\s*=\s*['"]topic['"]\s*\|\s*['"]course['"]/);
  });

  it("scope state defaults to 'topic'", () => {
    expect(source).toMatch(/useState<GraphScope>\(['"]topic['"]\)/);
  });
});
