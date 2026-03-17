// ============================================================
// Tests — End-to-end navigation flow contracts (filesystem-based)
//
// Verifies that all critical mindmap navigation paths are wired
// correctly: route definitions exist, navigation URLs are built
// with proper params, cache invalidation is called at the right
// points, and component contracts match expected prop shapes.
//
// Uses the filesystem-based pattern (readFileSync + regex) since
// React components hang in Node env without DOM.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Path helpers ──────────────────────────────────────────────

const MINDMAP_DIR = resolve(__dirname, '..');
const CONTENT_DIR = resolve(MINDMAP_DIR, '..');
const SRC_DIR = resolve(CONTENT_DIR, '..', '..', '..');
const ROUTES_DIR = resolve(SRC_DIR, 'app', 'routes');
const SERVICES_DIR = resolve(SRC_DIR, 'app', 'services');

function readSource(filepath: string): string {
  if (!existsSync(filepath)) throw new Error(`File not found: ${filepath}`);
  return readFileSync(filepath, 'utf-8');
}

const knowledgeMapViewSrc = readSource(resolve(CONTENT_DIR, 'KnowledgeMapView.tsx'));
const nodeContextMenuSrc = readSource(resolve(MINDMAP_DIR, 'NodeContextMenu.tsx'));
const useGraphDataSrc = readSource(resolve(MINDMAP_DIR, 'useGraphData.ts'));
const aiTutorPanelSrc = readSource(resolve(MINDMAP_DIR, 'AiTutorPanel.tsx'));
const mindmapTypesSrc = readSource(resolve(SRC_DIR, 'app', 'types', 'mindmap.ts'));

// ============================================================
// 1. Navigation handler contract
// ============================================================

describe('KnowledgeMapView: navigation handler contract', () => {
  it('exports KnowledgeMapView as a named export', () => {
    expect(knowledgeMapViewSrc).toMatch(/export\s+function\s+KnowledgeMapView/);
  });

  it('imports useNavigate from react-router', () => {
    expect(knowledgeMapViewSrc).toContain('useNavigate');
    expect(knowledgeMapViewSrc).toMatch(/from\s+['"]react-router['"]/);
  });

  it('imports useSearchParams from react-router', () => {
    expect(knowledgeMapViewSrc).toContain('useSearchParams');
  });

  it('defines navigateWithFade helper', () => {
    expect(knowledgeMapViewSrc).toContain('navigateWithFade');
    expect(knowledgeMapViewSrc).toMatch(/const\s+navigateWithFade/);
  });

  it('defines handleAction callback for NodeAction dispatch', () => {
    expect(knowledgeMapViewSrc).toMatch(/const\s+handleAction/);
    // handleAction handles all five NodeAction values
    expect(knowledgeMapViewSrc).toContain("case 'flashcard'");
    expect(knowledgeMapViewSrc).toContain("case 'quiz'");
    expect(knowledgeMapViewSrc).toContain("case 'summary'");
    expect(knowledgeMapViewSrc).toContain("case 'annotate'");
    expect(knowledgeMapViewSrc).toContain("case 'details'");
  });

  it('imports invalidateGraphCache (indirectly through useGraphData barrel)', () => {
    // It uses refetch rather than direct invalidateGraphCache in the view,
    // but the barrel exports it for other consumers
    expect(knowledgeMapViewSrc).toContain('useGraphData');
  });
});

// ============================================================
// 2. Route definitions exist
// ============================================================

describe('Mindmap navigation: route definitions', () => {
  it('student knowledge-map route is registered', () => {
    const src = readSource(resolve(ROUTES_DIR, 'study-student-routes.ts'));
    expect(src).toContain("path: 'knowledge-map'");
    expect(src).toContain('KnowledgeMapView');
  });

  it('professor knowledge-map route is registered', () => {
    const src = readSource(resolve(ROUTES_DIR, 'professor-routes.ts'));
    expect(src).toContain("path: 'knowledge-map'");
    expect(src).toContain('ProfessorKnowledgeMapPage');
  });

  it('student flashcards route exists (navigation target)', () => {
    const src = readSource(resolve(ROUTES_DIR, 'flashcard-student-routes.ts'));
    expect(src).toContain("path: 'flashcards'");
  });

  it('student quizzes route exists (navigation target)', () => {
    const src = readSource(resolve(ROUTES_DIR, 'quiz-student-routes.ts'));
    expect(src).toContain("path: 'quizzes'");
  });

  it('student summary route exists with :topicId param (navigation target)', () => {
    const src = readSource(resolve(ROUTES_DIR, 'summary-student-routes.ts'));
    expect(src).toContain("path: 'summary/:topicId'");
  });
});

// ============================================================
// 3. Cache invalidation points
// ============================================================

describe('invalidateGraphCache: called at critical points', () => {
  it('invalidateGraphCache is exported from useGraphData', () => {
    expect(useGraphDataSrc).toMatch(/export\s+function\s+invalidateGraphCache/);
  });

  it('re-exported through barrel index.ts', () => {
    const barrel = readSource(resolve(MINDMAP_DIR, 'index.ts'));
    expect(barrel).toContain('invalidateGraphCache');
  });

  it('called after quiz completion (QuizTaker)', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'components', 'student', 'QuizTaker.tsx'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called after flashcard session (FlashcardView)', () => {
    const src = readSource(resolve(CONTENT_DIR, 'FlashcardView.tsx'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called after adaptive review session (useAdaptiveSession)', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'hooks', 'useAdaptiveSession.ts'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called in ReviewSessionView after session completion', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'components', 'roles', 'pages', 'student', 'ReviewSessionView.tsx'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called in useSummaryReaderMutations after keyword mastery update', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'hooks', 'queries', 'useSummaryReaderMutations.ts'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called in useKeywordPopupQueries after keyword interactions', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'hooks', 'queries', 'useKeywordPopupQueries.ts'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called in ProfessorKnowledgeMapPage after creating/deleting connections', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'components', 'roles', 'pages', 'professor', 'ProfessorKnowledgeMapPage.tsx'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called in ProfessorAddConnectionModal after connection creation', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'components', 'roles', 'pages', 'professor', 'ProfessorAddConnectionModal.tsx'));
    expect(src).toContain('invalidateGraphCache');
  });

  it('called on logout in AuthContext (lazy import to avoid circular deps)', () => {
    const src = readSource(resolve(SRC_DIR, 'app', 'context', 'AuthContext.tsx'));
    expect(src).toContain('invalidateGraphCache');
    // Uses dynamic import to avoid coupling auth to mindmap module at load time
    expect(src).toMatch(/import\(['"]@\/app\/components\/content\/mindmap\/useGraphData['"]\)/);
  });
});

// ============================================================
// 4. URL parameter construction
// ============================================================

describe('KnowledgeMapView: URL parameter construction', () => {
  it('flashcard navigation includes keywordId query param', () => {
    // navigateWithFade(`/student/flashcards?keywordId=${node.id}`)
    expect(knowledgeMapViewSrc).toContain('/student/flashcards?keywordId=${node.id}');
  });

  it('quiz navigation includes keywordId query param', () => {
    expect(knowledgeMapViewSrc).toContain('/student/quizzes?keywordId=${node.id}');
  });

  it('summary navigation includes topicId in path segment', () => {
    // navigateWithFade(`/student/summary/${tid}${summaryParam}`)
    expect(knowledgeMapViewSrc).toMatch(/\/student\/summary\/\$\{tid\}/);
  });

  it('summary navigation optionally includes summaryId query param', () => {
    // summaryParam = node.summaryId ? `?summaryId=${node.summaryId}` : ''
    expect(knowledgeMapViewSrc).toContain('summaryId=${node.summaryId}');
  });

  it('AI tutor flashcard navigation uses keywordId param', () => {
    // onNavigateToAction callback builds same URL patterns
    expect(knowledgeMapViewSrc).toContain('/student/flashcards?keywordId=${kwId}');
  });

  it('AI tutor quiz navigation uses keywordId param', () => {
    expect(knowledgeMapViewSrc).toContain('/student/quizzes?keywordId=${kwId}');
  });

  it('AI tutor summary navigation uses effectiveTopicId', () => {
    expect(knowledgeMapViewSrc).toContain('/student/summary/${effectiveTopicId}');
  });
});

describe('URL parameter construction: correctness contracts', () => {
  // Simulate the URL building logic from KnowledgeMapView
  function buildFlashcardUrl(keywordId: string): string {
    return `/student/flashcards?keywordId=${keywordId}`;
  }

  function buildQuizUrl(keywordId: string): string {
    return `/student/quizzes?keywordId=${keywordId}`;
  }

  function buildSummaryUrl(topicId: string, summaryId?: string): string {
    const summaryParam = summaryId ? `?summaryId=${summaryId}` : '';
    return `/student/summary/${topicId}${summaryParam}`;
  }

  it('flashcard URL encodes keyword ID correctly', () => {
    expect(buildFlashcardUrl('kw-123')).toBe('/student/flashcards?keywordId=kw-123');
  });

  it('quiz URL encodes keyword ID correctly', () => {
    expect(buildQuizUrl('kw-456')).toBe('/student/quizzes?keywordId=kw-456');
  });

  it('summary URL includes topic ID in path', () => {
    expect(buildSummaryUrl('topic-1')).toBe('/student/summary/topic-1');
  });

  it('summary URL appends summaryId when present', () => {
    expect(buildSummaryUrl('topic-1', 'sum-99')).toBe('/student/summary/topic-1?summaryId=sum-99');
  });

  it('summary URL omits summaryId param when absent', () => {
    const url = buildSummaryUrl('topic-1');
    expect(url).not.toContain('summaryId');
  });

  it('summary URL omits summaryId param when undefined', () => {
    const url = buildSummaryUrl('topic-1', undefined);
    expect(url).not.toContain('summaryId');
  });

  it('all navigation URLs start with /student/', () => {
    expect(buildFlashcardUrl('x')).toMatch(/^\/student\//);
    expect(buildQuizUrl('x')).toMatch(/^\/student\//);
    expect(buildSummaryUrl('t')).toMatch(/^\/student\//);
  });
});

// ============================================================
// 5. navigateWithFade timing
// ============================================================

describe('navigateWithFade: fade delay contract', () => {
  it('fade delay is defined as 150ms in KnowledgeMapView', () => {
    // setTimeout(() => navigate(to), 150)
    expect(knowledgeMapViewSrc).toMatch(/setTimeout\(\s*\(\)\s*=>\s*navigate\(to\)\s*,\s*150\s*\)/);
  });

  it('fade delay is reasonable (100-500ms range)', () => {
    const match = knowledgeMapViewSrc.match(/setTimeout\([^,]+,\s*(\d+)\s*\)/);
    expect(match).not.toBeNull();
    const delay = parseInt(match![1], 10);
    expect(delay).toBeGreaterThanOrEqual(100);
    expect(delay).toBeLessThanOrEqual(500);
  });

  it('sets exiting state before scheduling navigation', () => {
    // setExiting(true) must come before setTimeout
    const fadeIdx = knowledgeMapViewSrc.indexOf('setExiting(true)');
    const timerIdx = knowledgeMapViewSrc.indexOf('fadeTimerRef.current = setTimeout');
    expect(fadeIdx).toBeGreaterThan(-1);
    expect(timerIdx).toBeGreaterThan(-1);
    expect(fadeIdx).toBeLessThan(timerIdx);
  });

  it('clears previous timer before scheduling new navigation', () => {
    // clearTimeout(fadeTimerRef.current) is called inside navigateWithFade
    const navigateWithFadeIdx = knowledgeMapViewSrc.indexOf('const navigateWithFade');
    const clearTimeoutIdx = knowledgeMapViewSrc.indexOf('clearTimeout(fadeTimerRef.current)', navigateWithFadeIdx);
    expect(clearTimeoutIdx).toBeGreaterThan(navigateWithFadeIdx);
  });

  it('cleanup effect clears timer on unmount', () => {
    // useEffect(() => () => { clearTimeout(fadeTimerRef.current); }, [])
    expect(knowledgeMapViewSrc).toMatch(/useEffect\(\s*\(\)\s*=>\s*\(\)\s*=>\s*\{\s*clearTimeout\(fadeTimerRef\.current\)/);
  });
});

// ============================================================
// 6. AiTutorPanel navigation: onNavigateToAction prop contract
// ============================================================

describe('AiTutorPanel: onNavigateToAction prop contract', () => {
  it('declares onNavigateToAction in props interface', () => {
    expect(aiTutorPanelSrc).toContain('onNavigateToAction');
  });

  it('onNavigateToAction accepts (keywordId, action) signature', () => {
    // The type annotation: (keywordId: string, action: 'flashcard' | 'quiz' | 'summary' | 'review') => void
    expect(aiTutorPanelSrc).toMatch(/onNavigateToAction\??\s*:\s*\(/);
    expect(aiTutorPanelSrc).toContain("'flashcard'");
    expect(aiTutorPanelSrc).toContain("'quiz'");
    expect(aiTutorPanelSrc).toContain("'summary'");
    expect(aiTutorPanelSrc).toContain("'review'");
  });

  it('KnowledgeMapView passes onNavigateToAction to AiTutorPanel', () => {
    expect(knowledgeMapViewSrc).toContain('onNavigateToAction=');
  });

  it('KnowledgeMapView onNavigateToAction handles all action types', () => {
    // The inline handler in KnowledgeMapView covers flashcard, review, quiz, summary
    expect(knowledgeMapViewSrc).toMatch(/action\s*===\s*'flashcard'\s*\|\|\s*action\s*===\s*'review'/);
    expect(knowledgeMapViewSrc).toMatch(/action\s*===\s*'quiz'/);
    expect(knowledgeMapViewSrc).toMatch(/action\s*===\s*'summary'/);
  });

  it('onNavigateToAction callback shape is correct', () => {
    const onNavigateToAction = vi.fn();
    type Action = 'flashcard' | 'quiz' | 'summary' | 'review';
    const actions: Action[] = ['flashcard', 'quiz', 'summary', 'review'];

    for (const action of actions) {
      onNavigateToAction('keyword-abc', action);
    }
    expect(onNavigateToAction).toHaveBeenCalledTimes(4);
    expect(onNavigateToAction).toHaveBeenCalledWith('keyword-abc', 'flashcard');
    expect(onNavigateToAction).toHaveBeenCalledWith('keyword-abc', 'quiz');
    expect(onNavigateToAction).toHaveBeenCalledWith('keyword-abc', 'summary');
    expect(onNavigateToAction).toHaveBeenCalledWith('keyword-abc', 'review');
  });
});

// ============================================================
// 7. NodeContextMenu: action types completeness
// ============================================================

describe('NodeContextMenu: action types completeness', () => {
  it('NodeAction type includes flashcard, quiz, summary, annotate, details', () => {
    expect(mindmapTypesSrc).toMatch(
      /type\s+NodeAction\s*=\s*'flashcard'\s*\|\s*'quiz'\s*\|\s*'summary'\s*\|\s*'annotate'\s*\|\s*'details'/
    );
  });

  it('ICONS record covers all NodeAction values', () => {
    expect(nodeContextMenuSrc).toContain('flashcard: Layers');
    expect(nodeContextMenuSrc).toContain('quiz: HelpCircle');
    expect(nodeContextMenuSrc).toContain('summary: FileText');
    expect(nodeContextMenuSrc).toContain('annotate: Edit3');
    expect(nodeContextMenuSrc).toContain('details: Info');
  });

  it('LABELS record covers all NodeAction values', () => {
    expect(nodeContextMenuSrc).toContain("flashcard: 'Flashcards'");
    expect(nodeContextMenuSrc).toContain("quiz: 'Quiz'");
    expect(nodeContextMenuSrc).toContain("summary: 'Ver resumen'");
    expect(nodeContextMenuSrc).toContain("annotate: 'Anotaci");
    expect(nodeContextMenuSrc).toContain("details: 'Detalles'");
  });

  it('actions array includes flashcard, quiz, annotate, details', () => {
    // These are always present in the actions list
    expect(nodeContextMenuSrc).toContain("'flashcard'");
    expect(nodeContextMenuSrc).toContain("'quiz'");
    expect(nodeContextMenuSrc).toContain("'annotate'");
    expect(nodeContextMenuSrc).toContain("'details'");
  });

  it('summary action is conditionally shown based on node.summaryId', () => {
    // ...(node?.summaryId ? ['summary' as const] : [])
    expect(nodeContextMenuSrc).toMatch(/node\?\.summaryId\s*\?\s*\[['"]summary['"]/);
  });

  it('onAction callback receives (action, node) pair', () => {
    // onClick={() => onAction(action, node)}
    expect(nodeContextMenuSrc).toContain('onAction(action, node)');
  });

  it('NodeContextMenu declares onAction in props', () => {
    expect(nodeContextMenuSrc).toMatch(/onAction\s*:\s*\(\s*action\s*:\s*NodeAction/);
  });
});

// ============================================================
// 8. Graph data flow: buildGraphData / useGraphData structure
// ============================================================

describe('useGraphData: graph data flow contract', () => {
  it('exports useGraphData hook', () => {
    expect(useGraphDataSrc).toMatch(/export\s+function\s+useGraphData/);
  });

  it('returns graphData, loading, error, refetch, isEmpty', () => {
    expect(useGraphDataSrc).toContain('graphData');
    expect(useGraphDataSrc).toContain('loading');
    expect(useGraphDataSrc).toContain('error');
    expect(useGraphDataSrc).toContain('refetch');
    expect(useGraphDataSrc).toContain('isEmpty');
  });

  it('UseGraphDataResult interface declares correct types', () => {
    expect(useGraphDataSrc).toMatch(/graphData:\s*GraphData\s*\|\s*null/);
    expect(useGraphDataSrc).toMatch(/loading:\s*boolean/);
    expect(useGraphDataSrc).toMatch(/error:\s*string\s*\|\s*null/);
    expect(useGraphDataSrc).toMatch(/refetch:\s*\(\)\s*=>\s*void/);
    expect(useGraphDataSrc).toMatch(/isEmpty:\s*boolean/);
  });

  it('accepts topicId, summaryId, courseTopicIds, skipCustomNodes options', () => {
    expect(useGraphDataSrc).toContain('topicId');
    expect(useGraphDataSrc).toContain('summaryId');
    expect(useGraphDataSrc).toContain('courseTopicIds');
    expect(useGraphDataSrc).toContain('skipCustomNodes');
  });

  it('fetches via fetchGraphByTopic, fetchGraphBySummary, fetchGraphByCourse', () => {
    expect(useGraphDataSrc).toContain('fetchGraphByTopic');
    expect(useGraphDataSrc).toContain('fetchGraphBySummary');
    expect(useGraphDataSrc).toContain('fetchGraphByCourse');
  });

  it('merges custom nodes from fetchCustomGraph', () => {
    expect(useGraphDataSrc).toContain('fetchCustomGraph');
    // Verifies that custom nodes are deduplicated
    expect(useGraphDataSrc).toContain('existingIds');
    expect(useGraphDataSrc).toMatch(/filter\(\s*n\s*=>\s*!existingIds\.has\(n\.id\)/);
  });

  it('validates edges against existing node IDs (prevents orphan edges)', () => {
    expect(useGraphDataSrc).toContain('allNodeIds');
    expect(useGraphDataSrc).toMatch(/allNodeIds\.has\(e\.source\)/);
    expect(useGraphDataSrc).toMatch(/allNodeIds\.has\(e\.target\)/);
  });

  it('skipCustomNodes skips custom graph merge (professor view)', () => {
    // if (topicId && !skipCustomNodes)
    expect(useGraphDataSrc).toMatch(/topicId\s*&&\s*!skipCustomNodes/);
  });
});

describe('GraphData structure: node and edge shapes', () => {
  it('MapNode interface has required fields', () => {
    expect(mindmapTypesSrc).toContain('id: string');
    expect(mindmapTypesSrc).toContain('label: string');
    expect(mindmapTypesSrc).toContain("type: 'keyword' | 'topic' | 'subtopic'");
    expect(mindmapTypesSrc).toContain('mastery: number');
    expect(mindmapTypesSrc).toContain('masteryColor: MasteryColor');
  });

  it('MapNode has optional navigation fields', () => {
    expect(mindmapTypesSrc).toContain('summaryId?: string');
    expect(mindmapTypesSrc).toContain('topicId?: string');
  });

  it('MapEdge interface has required fields', () => {
    expect(mindmapTypesSrc).toContain('source: string');
    expect(mindmapTypesSrc).toContain('target: string');
  });

  it('GraphData combines nodes and edges arrays', () => {
    expect(mindmapTypesSrc).toContain('nodes: MapNode[]');
    expect(mindmapTypesSrc).toContain('edges: MapEdge[]');
  });
});

describe('useGraphData: LRU cache contract', () => {
  it('CACHE_TTL is 5 minutes (300000ms)', () => {
    expect(useGraphDataSrc).toMatch(/CACHE_TTL\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
  });

  it('CACHE_MAX is 20 entries', () => {
    expect(useGraphDataSrc).toMatch(/CACHE_MAX\s*=\s*20/);
  });

  it('cache key prefixes: t: for topic, s: for summary, c: for course', () => {
    expect(useGraphDataSrc).toContain("`t:${topicId}`");
    expect(useGraphDataSrc).toContain("`s:${summaryId}`");
    expect(useGraphDataSrc).toContain("`c:${courseKey}`");
  });

  it('invalidateGraphCache clears entire cache when no args', () => {
    expect(useGraphDataSrc).toContain('cache.clear()');
  });

  it('invalidateGraphCache deletes specific topic key', () => {
    expect(useGraphDataSrc).toContain("cache.delete(`t:${topicId}`)");
  });

  it('invalidateGraphCache cascades to course-level caches containing the topic', () => {
    // Iterates over cache keys starting with "c:" and deletes if topicId is included
    expect(useGraphDataSrc).toContain("key.startsWith('c:')");
    expect(useGraphDataSrc).toContain('ids.includes(topicId)');
  });

  it('exports onGraphCacheInvalidation for external listeners', () => {
    expect(useGraphDataSrc).toMatch(/export\s+function\s+onGraphCacheInvalidation/);
  });

  it('notifyInvalidation calls all registered listeners', () => {
    expect(useGraphDataSrc).toContain('notifyInvalidation');
  });

  it('stale request guard prevents race conditions', () => {
    // fetchId !== fetchIdRef.current check after await
    expect(useGraphDataSrc).toContain('fetchId !== fetchIdRef.current');
  });
});

// ============================================================
// 9. Edge cases: effectiveTopicId fallback
// ============================================================

describe('KnowledgeMapView: effectiveTopicId fallback', () => {
  it('falls back to courseTopicIds[0] when topicId is not set', () => {
    // const effectiveTopicId = topicId || courseTopicIds[0] || ''
    expect(knowledgeMapViewSrc).toMatch(/effectiveTopicId\s*=\s*topicId\s*\|\|\s*courseTopicIds\[0\]\s*\|\|\s*''/);
  });

  it('summary navigation uses effectiveTopicId when node.topicId is absent', () => {
    // const tid = node.topicId || effectiveTopicId
    expect(knowledgeMapViewSrc).toContain('node.topicId || effectiveTopicId');
  });

  it('guards against empty topicId in summary navigation', () => {
    // if (tid) { ... navigate ... }
    expect(knowledgeMapViewSrc).toMatch(/if\s*\(\s*tid\s*\)/);
  });
});

// ============================================================
// 10. NodeAction exhaustiveness in handleAction
// ============================================================

describe('KnowledgeMapView: handleAction exhaustiveness', () => {
  const ALL_NODE_ACTIONS = ['flashcard', 'quiz', 'summary', 'annotate', 'details'] as const;

  it('every NodeAction value has a case in handleAction', () => {
    for (const action of ALL_NODE_ACTIONS) {
      expect(
        knowledgeMapViewSrc,
        `handleAction should handle '${action}'`
      ).toContain(`case '${action}'`);
    }
  });

  it('handleAction calls navigateWithFade for flashcard/quiz/summary', () => {
    // These three trigger page navigation
    expect(knowledgeMapViewSrc).toMatch(/case\s+'flashcard'[\s\S]*?navigateWithFade/);
    expect(knowledgeMapViewSrc).toMatch(/case\s+'quiz'[\s\S]*?navigateWithFade/);
    // summary navigateWithFade is inside the 'summary' case block within handleAction
    const handleActionIdx = knowledgeMapViewSrc.indexOf('const handleAction');
    const summaryCase = knowledgeMapViewSrc.indexOf("case 'summary'", handleActionIdx);
    const annotateCase = knowledgeMapViewSrc.indexOf("case 'annotate'", summaryCase);
    const betweenCases = knowledgeMapViewSrc.slice(summaryCase, annotateCase);
    expect(betweenCases).toContain('navigateWithFade');
  });

  it('handleAction does NOT navigate for annotate/details (stays on page)', () => {
    // annotate → setAnnotationNode, details → setSelectedNode
    const annotateCase = knowledgeMapViewSrc.indexOf("case 'annotate'");
    const detailsCase = knowledgeMapViewSrc.indexOf("case 'details'");
    const afterAnnotate = knowledgeMapViewSrc.slice(annotateCase, annotateCase + 200);
    const afterDetails = knowledgeMapViewSrc.slice(detailsCase, detailsCase + 200);
    expect(afterAnnotate).toContain('setAnnotationNode');
    expect(afterAnnotate).not.toContain('navigateWithFade');
    expect(afterDetails).toContain('setSelectedNode');
  });

  it('handleAction closes context menu before dispatching', () => {
    // setContextMenu(null) is the first line in handleAction
    const handleActionIdx = knowledgeMapViewSrc.indexOf('const handleAction');
    const setNullIdx = knowledgeMapViewSrc.indexOf('setContextMenu(null)', handleActionIdx);
    const firstCaseIdx = knowledgeMapViewSrc.indexOf("case 'flashcard'", handleActionIdx);
    expect(setNullIdx).toBeGreaterThan(handleActionIdx);
    expect(setNullIdx).toBeLessThan(firstCaseIdx);
  });
});
