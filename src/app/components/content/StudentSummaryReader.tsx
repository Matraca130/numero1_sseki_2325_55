// Axon — StudentSummaryReader (read-only summary with student features)
// Refactored (Phase C.1): state/effects extracted to useStudentSummaryReader hook.
import React from 'react';
import { motion } from 'motion/react';
import { Minimize2 } from 'lucide-react';
import { ReadingProgress } from '@/app/components/student/ReadingProgress';
import { SidebarOutline } from '@/app/components/student/SidebarOutline';
import { StickyNotesPanel } from '@/app/components/summary/StickyNotesPanel';
import { MasteryLegend } from '@/app/components/student/MasteryLegend';
import { SearchBar } from '@/app/components/student/SearchBar';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { XpToast } from '@/app/components/design-kit';
import { SummaryReaderToolbar } from '@/app/components/student/SummaryReaderToolbar';
import { SummaryReaderBody } from '@/app/components/student/SummaryReaderBody';
import { SummaryReaderBottomTabs } from '@/app/components/student/SummaryReaderBottomTabs';
import { StudyTimer } from '@/app/components/student/StudyTimer';
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

      <div className="flex mx-auto p-6 sm:p-8 gap-6 lg:gap-8" style={{ maxWidth: s.readingSettings.focusMode ? 820 : 1068 }}>
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

        <div id="reader-main-content" tabIndex={-1} className={`flex-1 min-w-0 transition-all duration-200 ${s.readingSettings.focusMode ? 'mx-auto' : ''}`} style={{ maxWidth: s.readingSettings.focusMode ? 720 : 860 }}>

        {/* ── Compact header toolbar with title ── */}
        {!s.readingSettings.focusMode && (
          <SummaryReaderToolbar
            summary={summary}
            readingState={readingState}
            isDark={s.isDark}
            isCompleted={s.isCompleted}
            markingRead={s.markingRead}
            searchOpen={s.searchOpen}
            showTimer={s.showTimer}
            showSettings={s.showSettings}
            sidebarCollapsed={s.sidebarCollapsed}
            readingSettings={s.readingSettings}
            onBack={onBack}
            onToggleRead={s.isCompleted ? s.handleUnmarkCompleted : s.handleMarkCompleted}
            onToggleSearch={() => s.setSearchOpen((v) => !v)}
            onToggleTimer={() => s.setShowTimer((prev) => !prev)}
            onToggleTheme={s.toggleTheme}
            onToggleSettings={() => s.setShowSettings((prev) => !prev)}
            onCloseSettings={() => s.setShowSettings(false)}
            onToggleSidebar={() => s.setSidebarCollapsed((v) => !v)}
            onUpdateReadingSettings={s.updateReadingSettings}
          />
        )}

        {/* ── Study Timer (fixed position, self-managed) ── */}
        {s.showTimer && <StudyTimer onClose={() => s.setShowTimer(false)} />}

        {/* ── Main content area (white card) ── */}
        <SummaryReaderBody
          summary={summary}
          viewMode={s.viewMode}
          readingSettings={s.readingSettings}
          isHtmlContent={s.isHtmlContent}
          htmlPages={s.htmlPages}
          textPages={s.textPages}
          safePage={s.safePage}
          totalPages={s.totalPages}
          setContentPage={s.setContentPage}
          onNavigateKeyword={s.handleNavigateKeywordWrapped}
          chunks={s.chunks}
          chunksLoading={s.chunksLoading}
          hasBlocks={s.hasBlocks}
          blocksLoading={s.blocksLoading}
          keywords={s.keywords}
          annotations={s.textAnnotations}
          isCompleted={s.isCompleted}
          onGoToKeywordsTab={() => s.setActiveTab('keywords')}
        />

        {/* ── Secondary tabs: Keywords, Videos, Notes (below content) ── */}
        <SummaryReaderBottomTabs
          summaryId={summary.id}
          activeTab={s.activeTab}
          onActiveTabChange={s.setActiveTab}
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
          videosLoading={s.videosLoading}
          videosCount={s.videosCount}
          textAnnotations={s.textAnnotations}
          annotationsLoading={s.annotationsLoading}
          onCreateAnnotation={s.handleCreateAnnotation}
          onDeleteAnnotation={s.handleDeleteAnnotation}
          savingAnnotation={s.savingAnnotation}
        />
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
