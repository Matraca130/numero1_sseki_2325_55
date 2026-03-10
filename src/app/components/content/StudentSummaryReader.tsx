// ============================================================
// Axon — StudentSummaryReader (orchestrator)
//
// Phase 2 refactor: this file is now a PURE ORCHESTRATOR.
// All presentation lives in extracted sub-components:
//   - ReaderHeader        (breadcrumb + header card + paginated preview)
//   - ReaderChunksTab     (summary chunks / block viewer)
//   - ReaderKeywordsTab   (keywords with expand + notes CRUD)
//   - ReaderAnnotationsTab (text annotations CRUD)
//   - VideoPlayer         (inline — only 3 LOC)
//
// Responsibilities:
//   1. React Query hooks (data fetching)
//   2. Mutations hook (state changes)
//   3. Content pagination + keyword-to-page map
//   4. Cross-page keyword navigation logic
//   5. Reading time tracking
//   6. Tab routing + wiring props to sub-components
// ============================================================
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Layers, Tag, Video as VideoIcon, StickyNote } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import { useSummaryReaderQueries } from '@/app/hooks/queries/useSummaryReaderQueries';
import { useSummaryReaderMutations } from '@/app/hooks/queries/useSummaryReaderMutations';
import { useKeywordDetailQueries } from '@/app/hooks/queries/useKeywordDetailQueries';
import { useReadingTimeTracker } from '@/app/hooks/useReadingTimeTracker';
import { useVideoListQuery } from '@/app/hooks/queries/useVideoPlayerQueries';
import {
  CONTENT_PAGE_SIZE,
  enrichHtmlWithImages,
  paginateHtml,
  paginateLines,
} from '@/app/lib/summary-content-helpers';
import { ReaderHeader } from '@/app/components/student/ReaderHeader';
import { ReaderChunksTab } from '@/app/components/student/ReaderChunksTab';
import { ReaderKeywordsTab } from '@/app/components/student/ReaderKeywordsTab';
import { ReaderAnnotationsTab } from '@/app/components/student/ReaderAnnotationsTab';
import { TabBadge } from '@/app/components/student/reader-atoms';

// ── Props ─────────────────────────────────────────────────

interface StudentSummaryReaderProps {
  summary: Summary;
  topicName: string;
  readingState: ReadingState | null;
  onBack: () => void;
  onReadingStateChanged: (rs: ReadingState) => void;
  /** Navigate to a keyword in another (or same) summary */
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function StudentSummaryReader({
  summary,
  topicName,
  readingState,
  onBack,
  onReadingStateChanged,
  onNavigateKeyword,
}: StudentSummaryReaderProps) {
  const [activeTab, setActiveTab] = useState('chunks');

  // ── Content pagination ────────────────────────────────
  const [contentPage, setContentPage] = useState(0);

  // ── React Query: 4 initial fetches ─────────────────────
  const {
    chunks, chunksLoading,
    keywords, keywordsLoading,
    textAnnotations, annotationsLoading,
    hasBlocks, blocksLoading,
    invalidateAnnotations,
  } = useSummaryReaderQueries(summary.id);

  // ── Keywords: React Query on-demand (cache per keywordId) ──
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const {
    subtopics, subtopicsLoading,
    kwNotes, kwNotesLoading,
    invalidateKwNotes,
  } = useKeywordDetailQueries(expandedKeyword);

  // ── Videos ──────────────────────────────────────────
  const { data: videos, isLoading: videosLoading } = useVideoListQuery(summary.id);
  const videosCount = videos?.length || 0;

  // ── Reliable reading time tracking ─────────────────────
  const { snapshotForExternalSave } = useReadingTimeTracker(
    summary.id,
    readingState?.time_spent_seconds ?? 0,
  );

  // ── Mutations ────────────────────────────────────────
  // Form state now lives LOCAL in tab components (optimistic reset).
  // Callbacks are no-ops — tabs reset their own state before calling handlers.
  const {
    handleMarkCompleted, handleUnmarkCompleted,
    handleCreateAnnotation, handleDeleteAnnotation,
    handleCreateKwNote, handleUpdateKwNote, handleDeleteKwNote,
    markingRead, savingAnnotation, savingKwNote,
    showXpToast,
  } = useSummaryReaderMutations({
    summaryId: summary.id,
    topicId: summary.topic_id,
    snapshotForExternalSave,
    onReadingStateChanged,
    invalidateAnnotations,
    invalidateKwNotes,
    onAnnotationCreated: () => {},  // Form reset is local in ReaderAnnotationsTab
    onKwNoteCreated: () => {},       // Form reset is local in ReaderKeywordsTab
    onKwNoteUpdated: () => {},       // Form reset is local in ReaderKeywordsTab
  });

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

  // Map each keyword ID to its first page index.
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

  // ── Cross-page keyword navigation ─────────────────────
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

  // ── Keyword expand toggle ───────────────────────────
  const toggleKeywordExpand = useCallback((keywordId: string) => {
    setExpandedKeyword(prev => prev === keywordId ? null : keywordId);
  }, []);

  // ── Render ─────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full overflow-y-auto bg-zinc-50"
    >
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* ── Reader Header ── */}
        <ReaderHeader
          summary={summary}
          topicName={topicName}
          readingState={readingState}
          onBack={onBack}
          onMarkCompleted={handleMarkCompleted}
          onUnmarkCompleted={handleUnmarkCompleted}
          markingRead={markingRead}
          showXpToast={showXpToast}
          isHtmlContent={isHtmlContent}
          htmlPages={htmlPages}
          textPages={textPages}
          safePage={safePage}
          totalPages={totalPages}
          onPageChange={setContentPage}
          onNavigateKeyword={handleNavigateKeywordWrapped}
          onSwitchTab={setActiveTab}
        />

        {/* ── Tabs ──
             NOTE (C4): Radix TabsContent unmounts inactive tabs (no forceMount).
             Local form state in tab components (annotation form, kw note input,
             edit mode) intentionally resets on tab switch — this is by-design
             clean-slate UX. If persistence across tabs is ever needed, either
             lift state here or add forceMount to the relevant TabsContent.  */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-white border border-zinc-200 rounded-xl p-1">
            <TabsTrigger value="chunks" className="gap-1.5 rounded-lg">
              <Layers className="w-3.5 h-3.5" />
              Contenido
              {!chunksLoading && <TabBadge count={chunks.length} active={activeTab === 'chunks'} />}
            </TabsTrigger>
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

          {/* ── CHUNKS TAB ── */}
          <TabsContent value="chunks">
            <ReaderChunksTab
              summaryId={summary.id}
              chunks={chunks}
              chunksLoading={chunksLoading}
              hasBlocks={hasBlocks}
              blocksLoading={blocksLoading}
              onNavigateKeyword={handleNavigateKeywordWrapped}
            />
          </TabsContent>

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

          {/* ── VIDEOS TAB (inline — only 3 LOC) ── */}
          <TabsContent value="videos">
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
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
    </motion.div>
  );
}