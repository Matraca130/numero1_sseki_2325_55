// Axon — useStudentSummaryReader
// Extracted from StudentSummaryReader.tsx (refactor split).
// Centralizes state, effects, queries, mutations, and derived values for the reader shell.
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { useSummaryReaderQueries } from '@/app/hooks/queries/useSummaryReaderQueries';
import { useKeywordDetailQueries } from '@/app/hooks/queries/useKeywordDetailQueries';
import { useSummaryReaderMutations } from '@/app/hooks/queries/useSummaryReaderMutations';
import { useSummaryBlockMastery } from '@/app/hooks/queries/useSummaryBlockMastery';
import { useReadingTimeTracker } from '@/app/hooks/useReadingTimeTracker';
import { useScrollPositionSave } from '@/app/hooks/useScrollPositionSave';
import { useScrollPositionRestore } from '@/app/hooks/useScrollPositionRestore';
import { useVideoListQuery } from '@/app/hooks/queries/useVideoPlayerQueries';
import { useThemeToggle } from '@/app/hooks/useThemeToggle';
import { useReadingSettings } from '@/app/components/student/ReadingSettingsPanel';
import { useSummaryBlocksQuery } from '@/app/hooks/queries/useSummaryBlocksQuery';
import { useKeywordPageNavigation } from '@/app/hooks/useKeywordPageNavigation';
import {
  CONTENT_PAGE_SIZE,
  enrichHtmlWithImages,
  paginateHtml,
  paginateLines,
} from '@/app/lib/summary-content-helpers';

interface UseStudentSummaryReaderArgs {
  summary: Summary;
  readingState: ReadingState | null;
  onReadingStateChanged: (rs: ReadingState) => void;
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
  initialTab?: string;
}

export function useStudentSummaryReader({
  summary,
  readingState,
  onReadingStateChanged,
  onNavigateKeyword,
  initialTab,
}: UseStudentSummaryReaderArgs) {
  // ── Tabs + refs ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(initialTab || 'keywords');
  const readerRef = useRef<HTMLDivElement>(null);
  const { isDark, toggle: toggleTheme } = useThemeToggle(readerRef);
  const [showTimer, setShowTimer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { settings: readingSettings, update: updateReadingSettings } = useReadingSettings();

  // ── Wave 1: Sidebar, search, reading progress ─────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1280 : true
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // ── Scroll position restore (must be before state init) ──
  const { initialViewMode, initialContentPage, restoreScroll } = useScrollPositionRestore(
    summary.id,
    readingState?.scroll_position ?? null,
  );

  /** View mode: 'enriched' shows structured blocks, 'reading' shows plain markdown */
  const [viewMode, setViewMode] = useState<'enriched' | 'reading'>(initialViewMode ?? 'enriched');

  // Auto-switch to enriched if reading mode selected but no content_markdown
  useEffect(() => {
    if (viewMode === 'reading' && !summary?.content_markdown) {
      const timer = setTimeout(() => setViewMode('enriched'), 2000);
      return () => clearTimeout(timer);
    }
  }, [viewMode, summary?.content_markdown]);

  // ── Content pagination ──────────────────────────────────
  const [contentPage, setContentPage] = useState(initialContentPage ?? 0);

  // ── React Query: 4 initial fetches ──────────────────────
  const {
    chunks, chunksLoading,
    keywords, keywordsLoading,
    textAnnotations, annotationsLoading,
    hasBlocks, blocksLoading,
    invalidateAnnotations,
  } = useSummaryReaderQueries(summary.id);

  // ── Blocks for sidebar outline (shared cache — no extra fetch) ──
  const { data: sidebarBlocks = [] } = useSummaryBlocksQuery(summary.id);

  // ── Block mastery levels (Delta scale) ──
  const { data: masteryLevels = {} } = useSummaryBlockMastery(summary.id);

  // ── Scroll-spy: track which block is currently visible ──
  useEffect(() => {
    if (!sidebarBlocks.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveBlockId(entry.target.getAttribute('data-block-id'));
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );
    const elements = document.querySelectorAll('[data-block-id]');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sidebarBlocks, activeTab]);

  // ── Suppress browser native scroll restoration ──
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // ── Restore scroll position after content loads ──
  useEffect(() => {
    if (!blocksLoading && !chunksLoading) {
      restoreScroll(readerRef);
    }
  }, [blocksLoading, chunksLoading, restoreScroll]);

  // ── Sidebar block click → scroll into view ──
  const handleSidebarBlockClick = useCallback((blockId: string) => {
    const scrollToBlock = () => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-block-id="${blockId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setActiveBlockId(blockId);
        }
      });
    };

    if (viewMode === 'reading') {
      setViewMode('enriched');
      // Double rAF ensures React has flushed the DOM update
      requestAnimationFrame(() => scrollToBlock());
      return;
    }
    scrollToBlock();
  }, [viewMode]);

  // ── Search: count matches in blocks ──
  const searchResultCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return sidebarBlocks.filter((b) => {
      const c = b.content || {};
      const text = [c.title, c.text, c.label, c.html, c.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    }).length;
  }, [searchQuery, sidebarBlocks]);

  // ── Keyboard shortcuts (Ctrl+F, Ctrl+Shift+F, Escape) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        updateReadingSettings({ ...readingSettings, focusMode: !readingSettings.focusMode });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        if (readingSettings.focusMode) {
          updateReadingSettings({ ...readingSettings, focusMode: false });
          return;
        }
        setSearchOpen(false);
        setSearchQuery('');
        setShowSettings(false);
        setShowTimer(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [readingSettings, updateReadingSettings]);

  // ── Memoized pagination + keyword-to-page map ───────────
  const { isHtmlContent, htmlPages, textPages, totalPages } = useMemo(() => {
    if (!summary.content_markdown) {
      return { isHtmlContent: false, htmlPages: [] as string[], textPages: [] as string[][], totalPages: 0 };
    }
    const isHtml = /<[a-z][\s\S]*>/i.test(summary.content_markdown);
    const enriched = isHtml ? enrichHtmlWithImages(summary.content_markdown) : '';
    const html = isHtml ? paginateHtml(enriched, CONTENT_PAGE_SIZE) : [];
    const text = !isHtml ? paginateLines(summary.content_markdown, 45) : [];
    return {
      isHtmlContent: isHtml,
      htmlPages: html,
      textPages: text,
      totalPages: isHtml ? html.length : text.length,
    };
  }, [summary.content_markdown]);

  const safePage = Math.min(contentPage, Math.max(0, totalPages - 1));

  // MEJORA-P1: Cross-page keyword navigation (extracted hook)
  const { handleNavigateKeyword: handleNavigateKeywordWrapped } = useKeywordPageNavigation({
    summaryId: summary.id,
    keywords,
    isHtmlContent,
    htmlPages,
    textPages,
    totalPages,
    safePage,
    contentPage,
    setContentPage,
    onNavigateKeyword,
  });

  // ── Keywords: React Query on-demand (cache per keywordId) ──
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const {
    subtopics, subtopicsLoading,
    kwNotes, kwNotesLoading,
    invalidateKwNotes,
  } = useKeywordDetailQueries(expandedKeyword);

  // ── Videos ──────────────────────────────────────────────
  const { data: videos, isLoading: videosLoading } = useVideoListQuery(summary.id);
  const videosCount = videos?.length || 0;

  // ── Scroll position save ────────────────────────────────
  const { getScrollPercentage } = useScrollPositionSave(
    summary.id,
    activeBlockId,
    viewMode,
    contentPage,
  );

  // ── Reading time tracking (+ scroll position piggyback) ─
  const { snapshotForExternalSave } = useReadingTimeTracker(
    summary.id,
    readingState?.time_spent_seconds ?? 0,
    () => getScrollPercentage(readerRef),
  );

  // ── Mutations hook (Phase B.3) ──────────────────────────
  const {
    handleMarkCompleted,
    handleUnmarkCompleted,
    handleCreateAnnotation,
    handleDeleteAnnotation,
    handleCreateKwNote,
    handleUpdateKwNote,
    handleDeleteKwNote,
    markingRead,
    savingAnnotation,
    savingKwNote,
    showXpToast,
  } = useSummaryReaderMutations({
    summaryId: summary.id,
    topicId: summary.topic_id,
    snapshotForExternalSave,
    onReadingStateChanged,
    invalidateAnnotations,
    invalidateKwNotes,
    onAnnotationCreated: () => {},
    onKwNoteCreated: () => {},
    onKwNoteUpdated: () => {},
  });

  const toggleKeywordExpand = useCallback((keywordId: string) => {
    setExpandedKeyword((prev) => (prev === keywordId ? null : keywordId));
  }, []);

  const isCompleted = readingState?.completed === true;

  return {
    // refs
    readerRef,
    // theme
    isDark, toggleTheme,
    // tabs
    activeTab, setActiveTab,
    // panels
    showTimer, setShowTimer,
    showSettings, setShowSettings,
    // reading settings
    readingSettings, updateReadingSettings,
    // sidebar + search
    sidebarCollapsed, setSidebarCollapsed,
    searchOpen, setSearchOpen,
    searchQuery, setSearchQuery,
    searchResultCount,
    activeBlockId,
    // view mode + pagination
    viewMode, setViewMode,
    contentPage, setContentPage,
    safePage, totalPages,
    isHtmlContent, htmlPages, textPages,
    // queries: content
    chunks, chunksLoading,
    keywords, keywordsLoading,
    textAnnotations, annotationsLoading,
    hasBlocks, blocksLoading,
    sidebarBlocks,
    masteryLevels,
    // videos
    videos, videosLoading, videosCount,
    // keyword detail
    expandedKeyword, toggleKeywordExpand,
    subtopics, subtopicsLoading,
    kwNotes, kwNotesLoading,
    // keyword nav
    handleNavigateKeywordWrapped,
    // sidebar click
    handleSidebarBlockClick,
    // mutations
    handleMarkCompleted,
    handleUnmarkCompleted,
    handleCreateAnnotation,
    handleDeleteAnnotation,
    handleCreateKwNote,
    handleUpdateKwNote,
    handleDeleteKwNote,
    markingRead,
    savingAnnotation,
    savingKwNote,
    showXpToast,
    // completion
    isCompleted,
  };
}

export type UseStudentSummaryReaderReturn = ReturnType<typeof useStudentSummaryReader>;
