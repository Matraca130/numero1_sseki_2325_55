// ============================================================
// Axon — StudentSummaryReader (read-only summary with student features)
//
// REFACTORED (Phase B): Mutations → hook, helpers → imports,
// Annotations/Keywords tabs → sub-components.
// 51KB → ~25KB. All E2E connections preserved.
//
// Sub-components used:
//   - summary-content-helpers (enrichHtmlWithImages, pagination, renderPlainLine)
//   - reader-atoms (ListSkeleton, TabBadge)
//   - useSummaryReaderMutations (7 mutations → 1 hook)
//   - ReaderAnnotationsTab (self-contained annotations CRUD)
//   - ReaderKeywordsTab (self-contained keywords + notes)
// ============================================================
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ChevronLeft, Layers, Tag, Video as VideoIcon,
  CheckCircle2, Clock, Loader2,
  StickyNote, BookOpen, Search as SearchIcon,
  Timer, Settings, PanelLeftOpen, Minimize2,
} from 'lucide-react';
import { ReadingProgress } from '@/app/components/student/ReadingProgress';
import { SidebarOutline } from '@/app/components/student/SidebarOutline';
import { MasteryLegend } from '@/app/components/student/MasteryLegend';
import { SearchBar } from '@/app/components/student/SearchBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import { useSummaryReaderQueries } from '@/app/hooks/queries/useSummaryReaderQueries';
import { useKeywordDetailQueries } from '@/app/hooks/queries/useKeywordDetailQueries';
import { useSummaryReaderMutations } from '@/app/hooks/queries/useSummaryReaderMutations';
import { useSummaryBlockMastery } from '@/app/hooks/queries/useSummaryBlockMastery';
import {
  PageNavigation,
  CompletionCard,
  XpToast,
  focusRing,
  proseClasses,
} from '@/app/components/design-kit';
import { KeywordHighlighterInline } from '@/app/components/student/KeywordHighlighterInline';
import { useReadingTimeTracker } from '@/app/hooks/useReadingTimeTracker';
import { useVideoListQuery } from '@/app/hooks/queries/useVideoPlayerQueries';
import { useThemeToggle } from '@/app/hooks/useThemeToggle';
import { ThemeToggle } from '@/app/components/student/ThemeToggle';

// ── Extracted helpers (Phase B.1) ─────────────────────────
import {
  CONTENT_PAGE_SIZE,
  enrichHtmlWithImages,
  paginateHtml,
  paginateLines,
  renderPlainLine,
} from '@/app/lib/summary-content-helpers';
import { sanitizeHtml } from '@/app/lib/sanitize';

// ── Extracted atoms (Phase B.2) ───────────────────────────
import { ListSkeleton, TabBadge } from '@/app/components/student/reader-atoms';

// ── Extracted tab components (Phase B.4-B.5) ──────────────
import { ReaderAnnotationsTab } from '@/app/components/student/ReaderAnnotationsTab';
import { ReaderKeywordsTab } from '@/app/components/student/ReaderKeywordsTab';
import { ReaderChunksTab } from '@/app/components/student/ReaderChunksTab';
import { StudyTimer } from '@/app/components/student/StudyTimer';
import ReadingSettingsPanel, { useReadingSettings } from '@/app/components/student/ReadingSettingsPanel';
import { useSummaryBlocksQuery } from '@/app/hooks/queries/useSummaryBlocksQuery';

// ── Props ─────────────────────────────────────────────────
interface StudentSummaryReaderProps {
  summary: Summary;
  topicName: string;
  readingState: ReadingState | null;
  onBack: () => void;
  onReadingStateChanged: (rs: ReadingState) => void;
  /** Navigate to a keyword in another (or same) summary */
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
  /** Tab to open when entering the reader (e.g. 'videos' from TopicSessionGrid) */
  initialTab?: string;
}

export function StudentSummaryReader({
  summary,
  topicName,
  readingState,
  onBack,
  onReadingStateChanged,
  onNavigateKeyword,
  initialTab,
}: StudentSummaryReaderProps) {
  const [activeTab, setActiveTab] = useState(initialTab === 'chunks' ? 'keywords' : (initialTab || 'keywords'));
  const readerRef = useRef<HTMLDivElement>(null);
  const { isDark, toggle: toggleTheme } = useThemeToggle(readerRef);
  const [showTimer, setShowTimer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { settings: readingSettings, update: updateReadingSettings } = useReadingSettings();

  // ── Wave 1: Sidebar, search, reading progress ─────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  /** View mode: 'enriched' shows structured blocks, 'reading' shows plain markdown */
  const [viewMode, setViewMode] = useState<'enriched' | 'reading'>('enriched');

  // ── Content pagination ──────────────────────────────────
  const [contentPage, setContentPage] = useState(0);

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

  // ── Sidebar block click → scroll into view ──
  const handleSidebarBlockClick = useCallback((blockId: string) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${blockId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveBlockId(blockId);
    }, 50);
  }, []);

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

  // MEJORA-P1: Map each keyword ID to its first page index.
  const keywordPageMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!keywords.length || totalPages <= 1) return map;

    const pageTexts = isHtmlContent
      ? htmlPages.map(h => h.replace(/<[^>]+>/g, ''))
      : textPages.map(lines => lines.join('\n'));

    for (const kw of keywords) {
      const needle = kw.name.toLowerCase();
      for (let i = 0; i < pageTexts.length; i++) {
        if (pageTexts[i].toLowerCase().includes(needle)) {
          map.set(kw.id, i);
          break;
        }
      }
    }
    return map;
  }, [keywords, htmlPages, textPages, isHtmlContent, totalPages]);

  // MEJORA-P1: Pending cross-page keyword navigation.
  const pendingPageNavRef = useRef<{ keywordId: string; summaryId: string } | null>(null);

  useEffect(() => {
    if (!pendingPageNavRef.current) return;
    const { keywordId, summaryId } = pendingPageNavRef.current;
    pendingPageNavRef.current = null;

    const timer = window.setTimeout(() => {
      onNavigateKeyword?.(keywordId, summaryId);
    }, 500);

    return () => clearTimeout(timer);
  }, [contentPage, onNavigateKeyword]);

  // MEJORA-P1: Wrap onNavigateKeyword to handle cross-page navigation.
  const handleNavigateKeywordWrapped = useCallback(
    (keywordId: string, summaryId: string) => {
      if (summaryId === summary.id && totalPages > 1) {
        const targetPage = keywordPageMap.get(keywordId);
        if (targetPage !== undefined && targetPage !== safePage) {
          setContentPage(targetPage);
          pendingPageNavRef.current = { keywordId, summaryId };
          toast.info('Navegando a otra pagina del resumen...');
          return;
        }
      }
      onNavigateKeyword?.(keywordId, summaryId);
    },
    [summary.id, totalPages, keywordPageMap, safePage, onNavigateKeyword],
  );

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

  // ── Reading time tracking ───────────────────────────────
  const { snapshotForExternalSave } = useReadingTimeTracker(
    summary.id,
    readingState?.time_spent_seconds ?? 0,
  );

  // ── Mutations hook (Phase B.3) ──────────────────────────
  // Replaces 7 inline useMutation + 6 handlers + 3 derived flags + showXpToast
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
    // Form state reset callbacks — sub-components handle their own form state
    onAnnotationCreated: () => {},
    onKwNoteCreated: () => {},
    onKwNoteUpdated: () => {},
  });

  const toggleKeywordExpand = (keywordId: string) => {
    if (expandedKeyword === keywordId) { setExpandedKeyword(null); } else {
      setExpandedKeyword(keywordId);
    }
  };

  const isCompleted = readingState?.completed === true;

  return (
    <motion.div
      ref={readerRef}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`axon-reader overflow-y-auto ${isDark ? 'bg-[#111215]' : 'bg-[#F0F2F5]'}`}
      style={{ minHeight: '100vh' }}
    >
      {/* ── Reading progress bar (Wave 1) ── */}
      <ReadingProgress containerRef={readerRef} />

      {/* XP Toast */}
      <XpToast amount={15} show={showXpToast} />

      {/* ── Search bar (Wave 1) ── */}
      {searchOpen && (
        <SearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          resultCount={searchResultCount}
          onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
        />
      )}

      {/* ── Focus mode floating exit button ── */}
      {readingSettings.focusMode && (
        <button
          onClick={() => updateReadingSettings({ ...readingSettings, focusMode: false })}
          title="Salir de modo enfocado (Esc)"
          aria-label="Salir de modo enfocado"
          className="fixed top-4 right-4 z-[500] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 border border-gray-200 shadow-sm transition-all"
          style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.75rem)' }}
        >
          <Minimize2 size={13} />
          Salir
        </button>
      )}

      <div className="flex mx-auto p-6 sm:p-8 gap-6" style={{ maxWidth: readingSettings.focusMode ? 768 : 1100 }}>
        {/* ── Sidebar outline (Wave 1) — hidden in focus mode ── */}
        {/* Wrapper is relative so expanded sidebar overlays from its own position */}
        {!readingSettings.focusMode && sidebarBlocks.length > 0 && (
          <div className="relative" style={{ width: 52, flexShrink: 0 }}>
            <SidebarOutline
              blocks={sidebarBlocks}
              activeBlockId={activeBlockId}
              onBlockClick={handleSidebarBlockClick}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              masteryLevels={masteryLevels}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              masteryLegend={
                Object.keys(masteryLevels).length > 0 ? (
                  <MasteryLegend
                    masteryLevels={masteryLevels}
                    totalBlocks={sidebarBlocks.length}
                  />
                ) : undefined
              }
            />
          </div>
        )}

        <div className={`flex-1 min-w-0 ${readingSettings.focusMode ? 'mx-auto' : ''}`} style={{ maxWidth: readingSettings.focusMode ? 680 : 800 }}>

        {/* ── Compact header toolbar with title ── */}
        {!readingSettings.focusMode && (
        <header
          role="banner"
          aria-label="Barra de herramientas del resumen"
          className="flex items-center justify-between"
          style={{
            background: isDark ? '#0d0e11' : '#1B3B36',
            padding: '10px 20px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            borderBottom: isDark ? '1px solid #2d2e34' : '1px solid transparent',
            borderRadius: '12px 12px 0 0',
          }}
        >
          {/* Left side: back + title */}
          <div className="flex items-center min-w-0" style={{ gap: 10 }}>
            <button
              onClick={onBack}
              aria-label="Volver a resúmenes"
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: '#b4d9d1',
                display: 'flex',
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1
                className="truncate"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: 'Georgia, serif',
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                {summary.title || 'Sin titulo'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ color: '#8cb8af', fontSize: 11 }}>
                  {new Date(summary.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {readingState?.time_spent_seconds != null && readingState.time_spent_seconds > 0 && (
                  <span className="flex items-center gap-1" style={{ color: '#8cb8af', fontSize: 11 }}>
                    <Clock className="w-3 h-3" />
                    {Math.round(readingState.time_spent_seconds / 60)} min
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                    <CheckCircle2 className="w-2.5 h-2.5" /> Leido
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: tool icons */}
          <div className="flex items-center" style={{ gap: 6 }}>
            {/* Mark complete */}
            <button
              onClick={isCompleted ? handleUnmarkCompleted : handleMarkCompleted}
              disabled={markingRead}
              title={isCompleted ? 'Marcar no leido' : 'Marcar como leido'}
              aria-label={isCompleted ? 'Marcar no leido' : 'Marcar como leido'}
              style={{
                background: isCompleted ? 'rgba(16,185,129,0.2)' : 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: isCompleted ? '#6ee7b7' : '#b4d9d1',
                display: 'flex',
                borderRadius: 6,
              }}
            >
              {markingRead ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            </button>

            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              title="Buscar (Ctrl+F)"
              aria-label="Buscar"
              style={{
                background: searchOpen ? 'rgba(42,140,122,0.15)' : 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: searchOpen ? '#2a8c7a' : '#b4d9d1',
                display: 'flex',
                borderRadius: 6,
              }}
            >
              <SearchIcon size={16} />
            </button>

            {/* Timer toggle */}
            <button
              onClick={() => setShowTimer((prev) => !prev)}
              title="Temporizador de estudio"
              aria-label={showTimer ? 'Cerrar timer' : 'Abrir timer'}
              style={{
                background: showTimer ? 'rgba(42,140,122,0.15)' : 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: showTimer ? '#2a8c7a' : '#b4d9d1',
                display: 'flex',
                borderRadius: 6,
              }}
            >
              <Timer size={16} />
            </button>

            {/* Separator */}
            <div style={{ width: 1, height: 20, background: '#6b9e95', margin: '0 4px' }} />

            {/* Theme toggle */}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

            {/* Settings toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSettings((prev) => !prev)}
                title="Configuración de lectura"
                aria-label={showSettings ? 'Cerrar configuración' : 'Configuración de lectura'}
                style={{
                  background: showSettings ? 'rgba(42,140,122,0.15)' : 'none',
                  border: 'none',
                  padding: 6,
                  cursor: 'pointer',
                  color: showSettings ? '#2a8c7a' : '#b4d9d1',
                  display: 'flex',
                  borderRadius: 6,
                }}
              >
                <Settings size={16} />
              </button>
              {showSettings && (
                <ReadingSettingsPanel
                  settings={readingSettings}
                  onChange={updateReadingSettings}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 20, background: '#6b9e95', margin: '0 4px' }} />

            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              title="Outline"
              aria-label={sidebarCollapsed ? 'Mostrar panel de estructura' : 'Ocultar panel de estructura'}
              style={{
                background: !sidebarCollapsed ? 'rgba(42,140,122,0.15)' : 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: !sidebarCollapsed ? '#2a8c7a' : '#b4d9d1',
                display: 'flex',
                borderRadius: 6,
              }}
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        </header>
        )}

        {/* ── Study Timer (fixed position, self-managed) ── */}
        {showTimer && <StudyTimer onClose={() => setShowTimer(false)} />}

        {/* ── Main content area (white card) ── */}
        <div className="reader-card bg-white dark:bg-[#1e1f25] rounded-b-[20px] border-2 border-t-0 border-zinc-200 dark:border-[#2d2e34] shadow-sm overflow-hidden">

          {/* ── Reading mode: plain markdown ── */}
          {viewMode === 'reading' && summary.content_markdown && (
            <div
              className="px-6 sm:px-8 py-8"
              style={{
                fontSize: `${readingSettings.fontSize}px`,
                lineHeight: readingSettings.lineHeight,
                fontFamily: readingSettings.fontFamily,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={safePage}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {isHtmlContent ? (
                    <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                      <div className={proseClasses} dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlPages[safePage] || '') }} />
                    </KeywordHighlighterInline>
                  ) : (
                    <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                      <div className="axon-prose max-w-none">
                        {textPages[safePage]?.map((line, i) => renderPlainLine(line, i))}
                      </div>
                    </KeywordHighlighterInline>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <PageNavigation
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPrev={() => setContentPage(Math.max(0, safePage - 1))}
                  onNext={() => setContentPage(Math.min(totalPages - 1, safePage + 1))}
                  onPageClick={(i) => setContentPage(i)}
                />
              )}
            </div>
          )}

          {/* ── Enriched mode: structured blocks ── */}
          {viewMode === 'enriched' && (
            <div className="py-4">
              <ReaderChunksTab
                summaryId={summary.id}
                chunks={chunks}
                chunksLoading={chunksLoading}
                hasBlocks={hasBlocks}
                blocksLoading={blocksLoading}
                onNavigateKeyword={handleNavigateKeywordWrapped}
                readingSettings={readingSettings}
                keywords={keywords}
                annotations={textAnnotations}
              />
            </div>
          )}

          {/* Completion card when read */}
          {isCompleted && (
            <div className="px-6 sm:px-8 pb-6">
              <CompletionCard
                title="Resumen completado!"
                subtitle={`Has leido "${summary.title || 'este resumen'}"`}
                xpEarned={15}
                actions={[
                  { label: `Flashcards`, icon: Layers, onClick: () => setActiveTab('keywords'), variant: 'secondary' },
                ]}
              />
            </div>
          )}
        </div>

        {/* ── Secondary tabs: Keywords, Videos, Notes (below content) ── */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-white dark:bg-[#1e1f25] border border-zinc-200 dark:border-[#2d2e34] rounded-xl p-1">
              <TabsTrigger value="keywords" className="gap-1.5 rounded-lg">
                <Tag className="w-3.5 h-3.5" />
                Keywords
                {!keywordsLoading && <TabBadge count={keywords.length} active={activeTab === 'keywords'} />}
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5 rounded-lg">
                <VideoIcon className="w-3.5 h-3.5" />
                Videos
                {!videosLoading && <TabBadge count={videosCount} active={activeTab === 'videos'} />}
              </TabsTrigger>
              <TabsTrigger value="annotations" className="gap-1.5 rounded-lg">
                <StickyNote className="w-3.5 h-3.5" />
                Mis Notas
                {!annotationsLoading && textAnnotations.length > 0 && <TabBadge count={textAnnotations.length} active={activeTab === 'annotations'} />}
              </TabsTrigger>
            </TabsList>

            {/* ── KEYWORDS TAB ── */}
            <TabsContent value="keywords">
              <ReaderKeywordsTab
                keywords={keywords}
                keywordsLoading={keywordsLoading}
                expandedKeyword={expandedKeyword}
                onToggleExpand={toggleKeywordExpand}
                subtopics={subtopics}
                subtopicsLoading={subtopicsLoading}
                kwNotes={kwNotes}
                kwNotesLoading={kwNotesLoading}
                onCreateKwNote={handleCreateKwNote}
                onUpdateKwNote={handleUpdateKwNote}
                onDeleteKwNote={handleDeleteKwNote}
                savingKwNote={savingKwNote}
              />
            </TabsContent>

            {/* ── VIDEOS TAB ── */}
            <TabsContent value="videos">
              <div className="bg-white dark:bg-[#1e1f25] rounded-2xl border border-zinc-200 dark:border-[#2d2e34] overflow-hidden">
                <VideoPlayer summaryId={summary.id} />
              </div>
            </TabsContent>

            {/* ── ANNOTATIONS TAB ── */}
            <TabsContent value="annotations">
              <ReaderAnnotationsTab
                annotations={textAnnotations}
                annotationsLoading={annotationsLoading}
                onCreateAnnotation={handleCreateAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                savingAnnotation={savingAnnotation}
              />
            </TabsContent>
          </Tabs>
        </div>
        </div>{/* end flex-1 content wrapper */}
      </div>{/* end flex layout */}
    </motion.div>
  );
}
