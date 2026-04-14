// Axon — StudentSummaryReader (read-only summary with student features)
// Refactored (Phase C.1): state/effects extracted to useStudentSummaryReader hook.
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Layers, Tag, Video as VideoIcon,
  CheckCircle2, Clock, Loader2,
  StickyNote, Search as SearchIcon,
  Timer, Settings, PanelLeftOpen, Minimize2,
} from 'lucide-react';
import { ReadingProgress } from '@/app/components/student/ReadingProgress';
import { SidebarOutline } from '@/app/components/student/SidebarOutline';
import { StickyNotesPanel } from '@/app/components/summary/StickyNotesPanel';
import { MasteryLegend } from '@/app/components/student/MasteryLegend';
import { SearchBar } from '@/app/components/student/SearchBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import {
  PageNavigation,
  CompletionCard,
  XpToast,
  proseClasses,
} from '@/app/components/design-kit';
import { KeywordHighlighterInline } from '@/app/components/student/KeywordHighlighterInline';
import { ThemeToggle } from '@/app/components/student/ThemeToggle';
import { colors } from '@/app/design-system';

// ── Extracted helpers (Phase B.1) ─────────────────────────
import { renderPlainLine } from '@/app/lib/summary-content-helpers';
import { sanitizeHtml } from '@/app/lib/sanitize';

// ── Extracted atoms (Phase B.2) ───────────────────────────
import { TabBadge } from '@/app/components/student/reader-atoms';

// ── Extracted tab components (Phase B.4-B.5) ──────────────
import { ReaderAnnotationsTab } from '@/app/components/student/ReaderAnnotationsTab';
import { ReaderKeywordsTab } from '@/app/components/student/ReaderKeywordsTab';
import { ReaderChunksTab } from '@/app/components/student/ReaderChunksTab';
import { StudyTimer } from '@/app/components/student/StudyTimer';
import ReadingSettingsPanel from '@/app/components/student/ReadingSettingsPanel';

// ── Extracted state hook (Phase C.1) ──────────────────────
import { useStudentSummaryReader } from '@/app/hooks/useStudentSummaryReader';

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
  const s = useStudentSummaryReader({
    summary,
    readingState,
    onReadingStateChanged,
    onNavigateKeyword,
    initialTab,
  });

  // ── Shared toolbar button style ──
  const toolbarBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 10,
    cursor: 'pointer',
    color: colors.reader.iconDefault,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    borderRadius: 6,
  };

  return (
    <>
    <motion.div
      ref={s.readerRef}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`axon-reader overflow-y-auto ${s.isDark ? 'bg-[#111215]' : 'bg-[#F0F2F5]'}`}
      style={{ minHeight: '100vh' }}
    >
      {/* ── Skip to content link (a11y) ── */}
      <a
        href="#reader-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[999] focus:px-4 focus:py-2 focus:bg-white focus:text-teal-700 focus:rounded-lg focus:shadow-lg focus:border focus:border-teal-200 focus:font-semibold"
        style={{ fontSize: 'clamp(0.8rem, 1.5vw, 0.875rem)' }}
      >
        Saltar al contenido
      </a>

      {/* ── Reading progress bar (Wave 1) ── */}
      <ReadingProgress containerRef={s.readerRef} />

      {/* XP Toast */}
      <XpToast amount={15} show={s.showXpToast} />

      {/* ── Search bar (Wave 1) ── */}
      {s.searchOpen && (
        <SearchBar
          query={s.searchQuery}
          onQueryChange={s.setSearchQuery}
          resultCount={s.searchResultCount}
          onClose={() => { s.setSearchOpen(false); s.setSearchQuery(''); }}
        />
      )}

      {/* ── Focus mode floating exit button ── */}
      {s.readingSettings.focusMode && (
        <button
          onClick={() => s.updateReadingSettings({ ...s.readingSettings, focusMode: false })}
          title="Salir de modo enfocado (Esc)"
          aria-label="Salir de modo enfocado"
          className="fixed top-5 right-5 z-[500] flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg hover:shadow-xl transition-all"
          style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)' }}
        >
          <Minimize2 size={14} />
          Salir del modo enfocado
        </button>
      )}

      <div className="flex mx-auto p-6 sm:p-8 gap-6" style={{ maxWidth: s.readingSettings.focusMode ? 768 : 1100 }}>
        {/* ── Sidebar outline (Wave 1) — hidden in focus mode ── */}
        {!s.readingSettings.focusMode && s.sidebarBlocks.length > 0 && (
          <div className="relative" style={{ width: 52, flexShrink: 0 }}>
            <SidebarOutline
              blocks={s.sidebarBlocks}
              activeBlockId={s.activeBlockId}
              onBlockClick={s.handleSidebarBlockClick}
              collapsed={s.sidebarCollapsed}
              onToggleCollapse={() => s.setSidebarCollapsed((v) => !v)}
              masteryLevels={s.masteryLevels}
              viewMode={s.viewMode}
              onViewModeChange={s.setViewMode}
              masteryLegend={
                Object.keys(s.masteryLevels).length > 0 ? (
                  <MasteryLegend
                    masteryLevels={s.masteryLevels}
                    totalBlocks={s.sidebarBlocks.length}
                  />
                ) : undefined
              }
            />
          </div>
        )}

        <div id="reader-main-content" tabIndex={-1} className={`flex-1 min-w-0 transition-all duration-200 ${s.readingSettings.focusMode ? 'mx-auto' : ''}`} style={{ maxWidth: s.readingSettings.focusMode ? 680 : 800 }}>

        {/* ── Compact header toolbar with title ── */}
        {!s.readingSettings.focusMode && (
        <header
          role="banner"
          aria-label="Barra de herramientas del resumen"
          className="flex items-center justify-between"
          style={{
            background: s.isDark ? colors.reader.headerBgDark : colors.reader.headerBg,
            padding: '10px 20px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            borderBottom: s.isDark ? '1px solid #2d2e34' : '1px solid transparent',
            borderRadius: '12px 12px 0 0',
          }}
        >
          {/* Left side: back + title */}
          <div className="flex items-center min-w-0" style={{ gap: 10 }}>
            <button
              onClick={onBack}
              aria-label="Volver a resúmenes"
              style={{ ...toolbarBtnStyle, flexShrink: 0 }}
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
                {summary.title || 'Sin título'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ color: colors.reader.iconSubtle, fontSize: 11 }}>
                  {new Date(summary.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {readingState?.time_spent_seconds != null && readingState.time_spent_seconds > 0 && (
                  <span className="flex items-center gap-1" style={{ color: colors.reader.iconSubtle, fontSize: 11 }}>
                    <Clock className="w-3 h-3" />
                    {Math.round(readingState.time_spent_seconds / 60)} min
                  </span>
                )}
                {s.isCompleted && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: 'rgba(16,185,129,0.2)', color: colors.reader.iconActive }}>
                    <CheckCircle2 className="w-2.5 h-2.5" /> Leído
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: tool icons */}
          <div className="flex items-center" style={{ gap: 6 }}>
            {/* Mark complete */}
            <button
              onClick={s.isCompleted ? s.handleUnmarkCompleted : s.handleMarkCompleted}
              disabled={s.markingRead}
              title={s.isCompleted ? 'Marcar no leído' : 'Marcar como leído'}
              aria-label={s.isCompleted ? 'Marcar no leído' : 'Marcar como leído'}
              style={{
                background: s.isCompleted ? 'rgba(16,185,129,0.2)' : 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: s.isCompleted ? colors.reader.iconActive : colors.reader.iconDefault,
                display: 'flex',
                borderRadius: 6,
              }}
            >
              {s.markingRead ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            </button>

            {/* Search toggle */}
            <button
              onClick={() => s.setSearchOpen((v) => !v)}
              title="Buscar (Ctrl+F)"
              aria-label="Buscar"
              style={{ ...toolbarBtnStyle, background: s.searchOpen ? 'rgba(42,140,122,0.15)' : 'none', color: s.searchOpen ? '#2a8c7a' : colors.reader.iconDefault }}
            >
              <SearchIcon size={16} />
            </button>

            {/* Timer toggle */}
            <button
              onClick={() => s.setShowTimer((prev) => !prev)}
              title="Temporizador de estudio"
              aria-label={s.showTimer ? 'Cerrar timer' : 'Abrir timer'}
              style={{ ...toolbarBtnStyle, background: s.showTimer ? 'rgba(42,140,122,0.15)' : 'none', color: s.showTimer ? '#2a8c7a' : colors.reader.iconDefault }}
            >
              <Timer size={16} />
            </button>

            {/* Separator */}
            <div role="separator" aria-hidden="true" style={{ width: 1, height: 20, background: '#6b9e95', margin: '0 4px' }} />

            {/* Theme toggle */}
            <ThemeToggle isDark={s.isDark} onToggle={s.toggleTheme} />

            {/* Settings toggle */}
            <div className="relative">
              <button
                onClick={() => s.setShowSettings((prev) => !prev)}
                title="Configuración de lectura"
                aria-label={s.showSettings ? 'Cerrar configuración' : 'Configuración de lectura'}
                style={{ ...toolbarBtnStyle, background: s.showSettings ? 'rgba(42,140,122,0.15)' : 'none', color: s.showSettings ? '#2a8c7a' : colors.reader.iconDefault }}
              >
                <Settings size={16} />
              </button>
              {s.showSettings && (
                <ReadingSettingsPanel
                  settings={s.readingSettings}
                  onChange={s.updateReadingSettings}
                  onClose={() => s.setShowSettings(false)}
                />
              )}
            </div>

            {/* Separator */}
            <div role="separator" aria-hidden="true" style={{ width: 1, height: 20, background: '#6b9e95', margin: '0 4px' }} />

            {/* Sidebar toggle */}
            <button
              onClick={() => s.setSidebarCollapsed((v) => !v)}
              title="Outline"
              aria-label={s.sidebarCollapsed ? 'Mostrar panel de estructura' : 'Ocultar panel de estructura'}
              style={{ ...toolbarBtnStyle, background: !s.sidebarCollapsed ? 'rgba(42,140,122,0.15)' : 'none', color: !s.sidebarCollapsed ? '#2a8c7a' : colors.reader.iconDefault }}
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        </header>
        )}

        {/* ── Study Timer (fixed position, self-managed) ── */}
        {s.showTimer && <StudyTimer onClose={() => s.setShowTimer(false)} />}

        {/* ── Main content area (white card) ── */}
        <div className="reader-card bg-white dark:bg-[#1e1f25] rounded-b-[20px] border-2 border-t-0 border-zinc-200 dark:border-[#2d2e34] shadow-sm overflow-hidden">

          {/* ── Reading mode fallback when no content_markdown ── */}
          {s.viewMode === 'reading' && !summary?.content_markdown && (
            <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
              Este resumen no tiene contenido en formato texto. Cambiando a modo enriquecido...
            </p>
          )}

          {/* ── Reading mode: plain markdown ── */}
          {s.viewMode === 'reading' && summary.content_markdown && (
            <div
              className="px-6 sm:px-8 py-8"
              style={{
                fontSize: `${s.readingSettings.fontSize}px`,
                lineHeight: s.readingSettings.lineHeight,
                fontFamily: s.readingSettings.fontFamily,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={s.safePage}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {s.isHtmlContent ? (
                    <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={s.handleNavigateKeywordWrapped}>
                      <div className={proseClasses} dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.htmlPages[s.safePage] || '') }} />
                    </KeywordHighlighterInline>
                  ) : (
                    <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={s.handleNavigateKeywordWrapped}>
                      <div className="axon-prose max-w-none">
                        {s.textPages[s.safePage]?.map((line, i) => renderPlainLine(line, i))}
                      </div>
                    </KeywordHighlighterInline>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Pagination */}
              {s.totalPages > 1 && (
                <PageNavigation
                  currentPage={s.safePage}
                  totalPages={s.totalPages}
                  onPrev={() => s.setContentPage(Math.max(0, s.safePage - 1))}
                  onNext={() => s.setContentPage(Math.min(s.totalPages - 1, s.safePage + 1))}
                  onPageClick={(i) => s.setContentPage(i)}
                />
              )}
            </div>
          )}

          {/* ── Enriched mode: structured blocks ── */}
          {s.viewMode === 'enriched' && (
            <div className="py-4">
              <ReaderChunksTab
                summaryId={summary.id}
                chunks={s.chunks}
                chunksLoading={s.chunksLoading}
                hasBlocks={s.hasBlocks}
                blocksLoading={s.blocksLoading}
                onNavigateKeyword={s.handleNavigateKeywordWrapped}
                readingSettings={s.readingSettings}
                keywords={s.keywords}
                annotations={s.textAnnotations}
              />
            </div>
          )}

          {/* Completion card when read */}
          {s.isCompleted && (
            <div className="px-6 sm:px-8 pb-6">
              <CompletionCard
                title="Resumen completado!"
                subtitle={`Has leido "${summary.title || 'este resumen'}"`}
                xpEarned={15}
                actions={[
                  { label: `Flashcards`, icon: Layers, onClick: () => s.setActiveTab('keywords'), variant: 'secondary' },
                ]}
              />
            </div>
          )}
        </div>

        {/* ── Secondary tabs: Keywords, Videos, Notes (below content) ── */}
        <div className="mt-6">
          <Tabs value={s.activeTab} onValueChange={s.setActiveTab}>
            <TabsList className="mb-4 bg-white dark:bg-[#1e1f25] border border-zinc-200 dark:border-[#2d2e34] rounded-xl p-1">
              <TabsTrigger value="keywords" className="gap-1.5 rounded-lg">
                <Tag className="w-3.5 h-3.5" />
                <span lang="en">Keywords</span>
                {!s.keywordsLoading && <TabBadge count={s.keywords.length} active={s.activeTab === 'keywords'} />}
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5 rounded-lg">
                <VideoIcon className="w-3.5 h-3.5" />
                <span lang="en">Videos</span>
                {!s.videosLoading && <TabBadge count={s.videosCount} active={s.activeTab === 'videos'} />}
              </TabsTrigger>
              <TabsTrigger value="annotations" className="gap-1.5 rounded-lg">
                <StickyNote className="w-3.5 h-3.5" />
                Mis Notas
                {!s.annotationsLoading && s.textAnnotations.length > 0 && <TabBadge count={s.textAnnotations.length} active={s.activeTab === 'annotations'} />}
              </TabsTrigger>
            </TabsList>

            {/* ── KEYWORDS TAB ── */}
            <TabsContent value="keywords">
              <ReaderKeywordsTab
                keywords={s.keywords}
                keywordsLoading={s.keywordsLoading}
                expandedKeyword={s.expandedKeyword}
                onToggleExpand={s.toggleKeywordExpand}
                subtopics={s.subtopics}
                subtopicsLoading={s.subtopicsLoading}
                kwNotes={s.kwNotes}
                kwNotesLoading={s.kwNotesLoading}
                onCreateKwNote={s.handleCreateKwNote}
                onUpdateKwNote={s.handleUpdateKwNote}
                onDeleteKwNote={s.handleDeleteKwNote}
                savingKwNote={s.savingKwNote}
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
                annotations={s.textAnnotations}
                annotationsLoading={s.annotationsLoading}
                onCreateAnnotation={s.handleCreateAnnotation}
                onDeleteAnnotation={s.handleDeleteAnnotation}
                savingAnnotation={s.savingAnnotation}
              />
            </TabsContent>
          </Tabs>
        </div>
        </div>{/* end flex-1 content wrapper */}
      </div>{/* end flex layout */}
    </motion.div>
    <StickyNotesPanel
      summaryId={summary.id}
      contextLabel={summary.title || topicName}
    />
    </>
  );
}
