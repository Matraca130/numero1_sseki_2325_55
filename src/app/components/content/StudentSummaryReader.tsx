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
  ArrowLeft, ChevronRight, Layers, Tag, Video as VideoIcon,
  CheckCircle2, Clock, Loader2,
  StickyNote, BookOpen,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import { SummaryViewer } from '@/app/components/student/SummaryViewer';
import { useSummaryReaderQueries } from '@/app/hooks/queries/useSummaryReaderQueries';
import { useKeywordDetailQueries } from '@/app/hooks/queries/useKeywordDetailQueries';
import { useSummaryReaderMutations } from '@/app/hooks/queries/useSummaryReaderMutations';
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

// ── Extracted helpers (Phase B.1) ─────────────────────────
import {
  CONTENT_PAGE_SIZE,
  enrichHtmlWithImages,
  paginateHtml,
  paginateLines,
  renderPlainLine,
} from '@/app/lib/summary-content-helpers';

// ── Extracted atoms (Phase B.2) ───────────────────────────
import { ListSkeleton, TabBadge } from '@/app/components/student/reader-atoms';

// ── Extracted tab components (Phase B.4-B.5) ──────────────
import { ReaderAnnotationsTab } from '@/app/components/student/ReaderAnnotationsTab';
import { ReaderKeywordsTab } from '@/app/components/student/ReaderKeywordsTab';

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
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full overflow-y-auto bg-zinc-50"
    >
      {/* XP Toast */}
      <XpToast amount={15} show={showXpToast} />

      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* ── Breadcrumb + back ── */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={onBack}
            className={`flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors ${focusRing} rounded-lg px-2 py-1`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontWeight: 500 }}>Resumenes</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-sm text-zinc-400">{topicName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-sm text-zinc-700 truncate max-w-[200px]" style={{ fontWeight: 600 }}>
            {summary.title || 'Sin titulo'}
          </span>
        </div>

        {/* ── Summary header card ── */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 shadow-sm mb-6 overflow-hidden">
          {/* Accent bar */}
          <div className={`h-1 ${isCompleted ? 'bg-emerald-500' : 'bg-teal-500'}`} />

          {/* Title bar */}
          <div className="px-6 sm:px-8 py-6 border-b border-zinc-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                  isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-teal-50 border-teal-200'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-teal-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-zinc-900 text-lg tracking-tight" style={{ fontWeight: 700 }}>
                    {summary.title || 'Sin titulo'}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700 border border-emerald-200" style={{ fontWeight: 600 }}>
                        <CheckCircle2 className="w-3 h-3" /> Completado
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-400">
                      {new Date(summary.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {readingState?.time_spent_seconds != null && readingState.time_spent_seconds > 0 && (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.round(readingState.time_spent_seconds / 60)} min de lectura
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mark as read/unread */}
              <motion.button
                onClick={isCompleted ? handleUnmarkCompleted : handleMarkCompleted}
                disabled={markingRead}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shrink-0 transition-all cursor-pointer ${focusRing} ${
                  isCompleted
                    ? 'bg-white border-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/25'
                }`}
                style={{ fontWeight: 600 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {markingRead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompleted ? (
                  <><CheckCircle2 className="w-4 h-4" /> Marcar no leido</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Marcar como leido</>
                )}
              </motion.button>
            </div>
          </div>

          {/* ── Paginated content preview ── */}
          {summary.content_markdown && (
              <div className="px-6 sm:px-8 py-6">
                <div className="min-h-[180px]">
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
                          <div className={proseClasses} dangerouslySetInnerHTML={{ __html: htmlPages[safePage] || '' }} />
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
                </div>

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

        {/* ── Tabs ── */}
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

          {/* ── CHUNKS TAB (inline — Phase B+ candidate) ── */}
          <TabsContent value="chunks">
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Contenido del resumen</h3>
                {!blocksLoading && hasBlocks && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-violet-50 text-violet-600 border border-violet-200" style={{ fontWeight: 600 }}>
                    Vista enriquecida
                  </span>
                )}
              </div>
              <div className="p-6">
                {!blocksLoading && hasBlocks ? (
                  <SummaryViewer summaryId={summary.id} />
                ) : chunksLoading ? (
                  <ListSkeleton />
                ) : chunks.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs text-zinc-400">Este resumen aun no tiene contenido</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chunks.map((chunk, idx) => (
                      <motion.div
                        key={chunk.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                      >
                        {/<[a-z][\s\S]*>/i.test(chunk.content) ? (
                          <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                            <div className={proseClasses} dangerouslySetInnerHTML={{ __html: enrichHtmlWithImages(chunk.content) }} />
                          </KeywordHighlighterInline>
                        ) : (
                          <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                            <div className="axon-prose max-w-none">
                              {chunk.content.split('\n').map((line, i) => renderPlainLine(line, i))}
                            </div>
                          </KeywordHighlighterInline>
                        )}
                        {idx < chunks.length - 1 && <div className="border-b border-zinc-100 mt-4" />}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── KEYWORDS TAB (Phase B.5 — delegated) ── */}
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
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <VideoPlayer summaryId={summary.id} />
            </div>
          </TabsContent>

          {/* ── ANNOTATIONS TAB (Phase B.4 — delegated) ── */}
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
