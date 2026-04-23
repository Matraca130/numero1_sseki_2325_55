// ============================================================
// Unit tests for useStudentSummaryReader hook
//
// This hook is a large state/behavior aggregator with ~15 external
// dependencies. We mock everything and exercise the observable state
// machine: tab/panel toggles, view-mode auto-switch, pagination
// clamping, keyboard shortcuts, scroll-spy, sidebar clicks, and
// search matching.
//
// Mocks: every child hook + summary-content-helpers. Fake timers
// used selectively for the 2s auto-switch effect.
//
// RUN: npx vitest run src/app/hooks/__tests__/useStudentSummaryReader.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mock child hooks / modules BEFORE import ───────────────

vi.mock('@/app/hooks/queries/useSummaryReaderQueries', () => ({
  useSummaryReaderQueries: vi.fn(() => ({
    chunks: [],
    chunksLoading: false,
    keywords: [],
    keywordsLoading: false,
    textAnnotations: [],
    annotationsLoading: false,
    hasBlocks: true,
    blocksLoading: false,
    invalidateAnnotations: vi.fn(),
  })),
}));

vi.mock('@/app/hooks/queries/useKeywordDetailQueries', () => ({
  useKeywordDetailQueries: vi.fn(() => ({
    subtopics: [],
    subtopicsLoading: false,
    kwNotes: [],
    kwNotesLoading: false,
    invalidateKwNotes: vi.fn(),
  })),
}));

const mockHandlers = {
  handleMarkCompleted: vi.fn(),
  handleUnmarkCompleted: vi.fn(),
  handleCreateAnnotation: vi.fn(),
  handleDeleteAnnotation: vi.fn(),
  handleCreateKwNote: vi.fn(),
  handleUpdateKwNote: vi.fn(),
  handleDeleteKwNote: vi.fn(),
};

vi.mock('@/app/hooks/queries/useSummaryReaderMutations', () => ({
  useSummaryReaderMutations: vi.fn(() => ({
    ...mockHandlers,
    markingRead: false,
    savingAnnotation: false,
    savingKwNote: false,
    showXpToast: false,
  })),
}));

vi.mock('@/app/hooks/queries/useSummaryBlockMastery', () => ({
  useSummaryBlockMastery: vi.fn(() => ({ data: {}, isLoading: false })),
}));

vi.mock('@/app/hooks/useReadingTimeTracker', () => ({
  useReadingTimeTracker: vi.fn(() => ({
    save: vi.fn(),
    snapshotForExternalSave: vi.fn(() => 0),
    getCurrentTotal: vi.fn(() => 0),
  })),
}));

vi.mock('@/app/hooks/useScrollPositionSave', () => ({
  useScrollPositionSave: vi.fn(() => ({ getScrollPercentage: vi.fn(() => 0) })),
}));

vi.mock('@/app/hooks/useScrollPositionRestore', () => ({
  useScrollPositionRestore: vi.fn(() => ({
    initialViewMode: 'enriched' as const,
    initialContentPage: 0,
    restoreScroll: vi.fn(),
  })),
}));

vi.mock('@/app/hooks/queries/useVideoPlayerQueries', () => ({
  useVideoListQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/app/hooks/useThemeToggle', () => ({
  useThemeToggle: vi.fn(() => ({ isDark: false, toggle: vi.fn() })),
}));

vi.mock('@/app/components/student/ReadingSettingsPanel', () => ({
  useReadingSettings: vi.fn(() => ({
    settings: {
      fontSize: 17,
      lineHeight: 1.65,
      fontFamily: 'Inter, sans-serif',
      focusMode: false,
    },
    update: vi.fn(),
  })),
}));

vi.mock('@/app/hooks/queries/useSummaryBlocksQuery', () => ({
  useSummaryBlocksQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

const mockHandleNavigateKeywordWrapped = vi.fn();
vi.mock('@/app/hooks/useKeywordPageNavigation', () => ({
  useKeywordPageNavigation: vi.fn(() => ({
    handleNavigateKeyword: mockHandleNavigateKeywordWrapped,
  })),
}));

vi.mock('@/app/lib/summary-content-helpers', () => ({
  CONTENT_PAGE_SIZE: 2000,
  enrichHtmlWithImages: vi.fn((html: string) => html),
  paginateHtml: vi.fn((html: string) => (html ? [html] : [])),
  paginateLines: vi.fn((text: string) => (text ? [text.split('\n')] : [])),
}));

// ── Import under test AFTER mocks ──────────────────────────
import { useStudentSummaryReader } from '@/app/hooks/useStudentSummaryReader';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { useSummaryBlocksQuery } from '@/app/hooks/queries/useSummaryBlocksQuery';

// ── Fixtures ───────────────────────────────────────────────

function makeSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    id: 'sum-1',
    topic_id: 'top-1',
    title: 'Test summary',
    content_markdown: null,
    status: 'published',
    order_index: 0,
    is_active: true,
    created_at: '2026-04-18T09:00:00Z',
    updated_at: '2026-04-18T09:00:00Z',
    ...overrides,
  };
}

function makeReadingState(overrides: Partial<ReadingState> = {}): ReadingState {
  return {
    id: 'rs-1',
    student_id: 'stu-1',
    summary_id: 'sum-1',
    scroll_position: 0,
    time_spent_seconds: 0,
    completed: false,
    last_read_at: null,
    created_at: '2026-04-18T09:00:00Z',
    updated_at: '2026-04-18T09:00:00Z',
    ...overrides,
  };
}

// jsdom does not implement IntersectionObserver. The hook's scroll-spy
// effect instantiates one whenever sidebarBlocks.length > 0, so stub it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset window size for sidebar init
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1440,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IntersectionObserver = IntersectionObserverStub;
});

afterEach(() => {
  vi.useRealTimers();
});

// ══════════════════════════════════════════════════════════════
// Initial state
// ══════════════════════════════════════════════════════════════

describe('initial state', () => {
  it('initializes with default tab = keywords', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.activeTab).toBe('keywords');
  });

  it('honors initialTab prop', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
        initialTab: 'notes',
      }),
    );
    expect(result.current.activeTab).toBe('notes');
  });

  it('sidebar expanded when window >= 1280 px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true });
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it('sidebar collapsed when window < 1280 px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.sidebarCollapsed).toBe(true);
  });

  it('isCompleted reflects readingState.completed', () => {
    const { result: r1 } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: makeReadingState({ completed: false }),
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(r1.current.isCompleted).toBe(false);

    const { result: r2 } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: makeReadingState({ completed: true }),
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(r2.current.isCompleted).toBe(true);
  });

  it('isCompleted is false when readingState is null', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.isCompleted).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// Tab/panel toggles
// ══════════════════════════════════════════════════════════════

describe('panel toggles', () => {
  it('setShowTimer flips showTimer state', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.showTimer).toBe(false);
    act(() => result.current.setShowTimer(true));
    expect(result.current.showTimer).toBe(true);
  });

  it('setShowSettings, setShowStickyNotes, setShowBookmarksPanel are independent', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => {
      result.current.setShowSettings(true);
      result.current.setShowStickyNotes(true);
      result.current.setShowBookmarksPanel(true);
    });
    expect(result.current.showSettings).toBe(true);
    expect(result.current.showStickyNotes).toBe(true);
    expect(result.current.showBookmarksPanel).toBe(true);
  });

  it('setActiveTab updates the current tab', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.setActiveTab('notes'));
    expect(result.current.activeTab).toBe('notes');
  });
});

// ══════════════════════════════════════════════════════════════
// Pagination
// ══════════════════════════════════════════════════════════════

describe('pagination', () => {
  it('totalPages = 0 when content_markdown is null', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: null }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.totalPages).toBe(0);
    expect(result.current.isHtmlContent).toBe(false);
    expect(result.current.htmlPages).toEqual([]);
  });

  it('isHtmlContent=true when markdown contains HTML tags', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: '<p>hello</p>' }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.isHtmlContent).toBe(true);
    expect(result.current.totalPages).toBeGreaterThan(0);
  });

  it('isHtmlContent=false for plain-text markdown', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: 'just\ntext\nlines' }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.isHtmlContent).toBe(false);
    expect(result.current.textPages.length).toBeGreaterThan(0);
  });

  it('safePage clamps to totalPages - 1', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: '<p>x</p>' }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.setContentPage(999));
    expect(result.current.safePage).toBe(result.current.totalPages - 1);
  });

  it('safePage is 0 when totalPages = 0 (Math.max guards against negative)', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: null }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.safePage).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// View mode auto-switch
// ══════════════════════════════════════════════════════════════

describe('view mode auto-switch', () => {
  it('stays in enriched when content_markdown is null', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: null }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.viewMode).toBe('enriched');
  });

  it('allows manual view-mode change to reading', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: 'plain text' }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.setViewMode('reading'));
    expect(result.current.viewMode).toBe('reading');
  });

  it('auto-switches reading → enriched after 2s when content_markdown is null', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: null }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.setViewMode('reading'));
    expect(result.current.viewMode).toBe('reading');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.viewMode).toBe('enriched');
  });
});

// ══════════════════════════════════════════════════════════════
// Expanded keyword toggle
// ══════════════════════════════════════════════════════════════

describe('toggleKeywordExpand', () => {
  it('toggles expandedKeyword on repeated click', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.expandedKeyword).toBeNull();
    act(() => result.current.toggleKeywordExpand('kw-1'));
    expect(result.current.expandedKeyword).toBe('kw-1');
    // Same key → collapse
    act(() => result.current.toggleKeywordExpand('kw-1'));
    expect(result.current.expandedKeyword).toBeNull();
  });

  it('switches expanded keyword between different keys', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.toggleKeywordExpand('kw-1'));
    act(() => result.current.toggleKeywordExpand('kw-2'));
    expect(result.current.expandedKeyword).toBe('kw-2');
  });
});

// ══════════════════════════════════════════════════════════════
// Search
// ══════════════════════════════════════════════════════════════

describe('search', () => {
  it('searchResultCount is 0 when query is empty', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.searchResultCount).toBe(0);
  });

  it('searchResultCount counts matching blocks (case-insensitive)', () => {
    // Inject blocks via the useSummaryBlocksQuery mock for every render
    const mockedBlocksQuery = vi.mocked(useSummaryBlocksQuery);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedBlocksQuery.mockReturnValue({
      data: [
        { id: 'b1', content: { title: 'Mitocondria energy plant' } },
        { id: 'b2', content: { text: 'The nucleus stores DNA' } },
        { id: 'b3', content: { label: 'MITOCONDRIA label' } },
      ],
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.setSearchQuery('mitocondria'));
    expect(result.current.searchResultCount).toBe(2);
    // Restore default mock so other tests see empty blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedBlocksQuery.mockReturnValue({ data: [], isLoading: false } as any);
  });

  it('setSearchOpen / setSearchQuery update public state', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => {
      result.current.setSearchOpen(true);
      result.current.setSearchQuery('hello');
    });
    expect(result.current.searchOpen).toBe(true);
    expect(result.current.searchQuery).toBe('hello');
  });
});

// ══════════════════════════════════════════════════════════════
// Keyboard shortcuts
// ══════════════════════════════════════════════════════════════

describe('keyboard shortcuts', () => {
  it('Ctrl+F opens search', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.searchOpen).toBe(false);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }),
      );
    });
    expect(result.current.searchOpen).toBe(true);
  });

  it('Escape closes searchOpen and clears query', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => {
      result.current.setSearchOpen(true);
      result.current.setSearchQuery('hi');
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.searchOpen).toBe(false);
    expect(result.current.searchQuery).toBe('');
  });

  it('Escape closes the topmost overlay first (bookmarks before sticky)', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => {
      result.current.setShowBookmarksPanel(true);
      result.current.setShowStickyNotes(true);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    // Bookmarks closed, stickyNotes still open
    expect(result.current.showBookmarksPanel).toBe(false);
    expect(result.current.showStickyNotes).toBe(true);
  });

  it('Escape closes showTimer last when all other overlays are closed', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.setShowTimer(true));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.showTimer).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// Sidebar block click (enriched mode)
// ══════════════════════════════════════════════════════════════

describe('handleSidebarBlockClick', () => {
  it('does not throw when called with non-existent block id', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(() => {
      act(() => result.current.handleSidebarBlockClick('nonexistent'));
    }).not.toThrow();
  });

  it('switches view mode from reading → enriched before scrolling', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary({ content_markdown: 'abc' }),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    act(() => result.current.setViewMode('reading'));
    expect(result.current.viewMode).toBe('reading');
    act(() => result.current.handleSidebarBlockClick('blk-1'));
    expect(result.current.viewMode).toBe('enriched');
  });
});

// ══════════════════════════════════════════════════════════════
// Navigation passthrough
// ══════════════════════════════════════════════════════════════

describe('wired handlers', () => {
  it('exposes handleNavigateKeywordWrapped from useKeywordPageNavigation mock', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.handleNavigateKeywordWrapped).toBe(
      mockHandleNavigateKeywordWrapped,
    );
  });

  it('exposes mutation handlers from useSummaryReaderMutations mock', () => {
    const { result } = renderHook(() =>
      useStudentSummaryReader({
        summary: makeSummary(),
        readingState: null,
        onReadingStateChanged: vi.fn(),
      }),
    );
    expect(result.current.handleMarkCompleted).toBe(mockHandlers.handleMarkCompleted);
    expect(result.current.handleCreateAnnotation).toBe(mockHandlers.handleCreateAnnotation);
    expect(result.current.handleDeleteAnnotation).toBe(mockHandlers.handleDeleteAnnotation);
  });
});
