// ============================================================
// Axon — SummaryView (shared: professor + student reader)
//
// Entry point: /professor/summary/:topicId or /student/summary/:topicId
//
// 1. Fetches summaries for the topicId from URL params
// 2. Shows summary list (if multiple) or auto-selects (if one)
// 3. Professor: SummaryHeader + ChunkRenderer + KeywordsManager + VideosManager
// 4. Student: delegates to StudentSummaryReader (full HTML + images + keywords)
//    + cross-summary keyword navigation (3 cases: same, same-topic, cross-topic)
//
// Data layer: React Query hooks from useSummaryViewQueries.
//
// Routes used (all FLAT):
//   GET /summaries?topic_id=xxx
//   GET /summaries/:id          (cross-topic nav: resolve target topic)
//   GET /chunks?summary_id=xxx  (professor only)
//   GET /reading-states?summary_id=xxx (student, via StudentSummaryReader)
// ============================================================
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  FileText, ChevronRight, RefreshCw, ArrowLeft,
  BookOpen, AlertCircle, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { SummaryHeader } from '@/app/components/summary/SummaryHeader';
import { ChunkRenderer } from '@/app/components/summary/ChunkRenderer';
import { KeywordsManager } from '@/app/components/professor/KeywordsManager';
import { VideosManager } from '@/app/components/professor/VideosManager';
import { QuickKeywordCreator } from '@/app/components/professor/QuickKeywordCreator';
import { StudentSummaryReader } from '@/app/components/content/StudentSummaryReader';
import * as summariesApi from '@/app/services/summariesApi';
import { queryKeys } from '@/app/hooks/queries/queryKeys';
import {
  useTopicSummariesQuery,
  useSummaryChunksQuery,
  useReadingStateQuery,
} from '@/app/hooks/queries/useSummaryViewQueries';
import { useSummaryBlocksQuery } from '@/app/hooks/queries/useSummaryBlocksQuery';
import { SummaryViewer } from '@/app/components/student/SummaryViewer';
import {
  scrollFlashAndAutoOpen,
  NOOP_HANDLE,
  type AutoClickHandle,
} from '@/app/lib/keyword-scroll-helpers';

// ── Breadcrumb resolution from content tree ───────────────
function resolveBreadcrumb(tree: any, topicId: string): {
  courseName?: string;
  sectionName?: string;
  topicName: string;
} {
  if (!tree) return { topicName: 'Tema' };
  const courses = tree.courses || (Array.isArray(tree) ? tree : []);
  for (const c of courses) {
    for (const sem of (c.semesters || [])) {
      for (const sec of (sem.sections || [])) {
        for (const t of (sec.topics || [])) {
          if (t.id === topicId) {
            return {
              courseName: c.name,
              sectionName: sec.name,
              topicName: t.name,
            };
          }
        }
      }
    }
  }
  return { topicName: 'Tema' };
}

export function SummaryView() {
  const { topicId } = useParams<{ topicId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeMembership } = useAuth();
  const { tree } = useContentTree();

  const isProfessor = activeMembership?.role === 'professor'
    || activeMembership?.role === 'owner'
    || activeMembership?.role === 'admin';

  // ── Local UI state ──────────────────────────────────────
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(
    () => searchParams.get('summaryId'),
  );

  // Professor-only ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // FIX-E2/E4: Track pending auto-click for cancellation.
  const autoClickRef = useRef<AutoClickHandle>(NOOP_HANDLE);

  // FIX-E4: Cancel any pending auto-click on unmount.
  useEffect(() => {
    return () => autoClickRef.current.cancel();
  }, []);

  // Breadcrumb
  const breadcrumb = resolveBreadcrumb(tree, topicId || '');

  // ── Data (React Query) ─────────────────────────────────
  const summariesQuery = useTopicSummariesQuery(topicId);
  const summaries = useMemo(
    () => (summariesQuery.data ?? []).filter(s => isProfessor || s.status === 'published'),
    [summariesQuery.data, isProfessor],
  );
  const loading = summariesQuery.isLoading;
  const error = summariesQuery.error?.message ?? null;

  // Chunks only needed for professor path (student uses StudentSummaryReader)
  const chunksQuery = useSummaryChunksQuery(selectedSummaryId);
  const chunks = chunksQuery.data ?? [];
  const chunksLoading = chunksQuery.isLoading && !!selectedSummaryId;

  // Reading state: student-only, passed to StudentSummaryReader
  const readingStateQuery = useReadingStateQuery(selectedSummaryId, !isProfessor);
  const readingState = readingStateQuery.data ?? null;

  // Edu blocks: student-only, determines block-based vs HTML monolithic rendering
  const blocksQuery = useSummaryBlocksQuery(selectedSummaryId || '');
  const blocksLoading = !isProfessor && blocksQuery.isLoading && !!selectedSummaryId;
  const hasEduBlocks = !isProfessor && (blocksQuery.data ?? []).length > 0;

  const selectedSummary = summaries.find(s => s.id === selectedSummaryId) || null;

  // ── Auto-select from query param or single-item ────────
  useEffect(() => {
    if (summariesQuery.isLoading || !summariesQuery.data) return;
    const qsSummaryId = searchParams.get('summaryId');
    if (qsSummaryId && summaries.some(s => s.id === qsSummaryId)) {
      setSelectedSummaryId(qsSummaryId);
    } else if (summaries.length === 1) {
      setSelectedSummaryId(summaries[0].id);
    } else if (selectedSummaryId && !summaries.some(s => s.id === selectedSummaryId)) {
      setSelectedSummaryId(null);
    }
  }, [summaries, searchParams]);

  // ── Back handler ───────────────────────────────────────
  const handleBack = () => {
    if (selectedSummaryId && summaries.length > 1) {
      setSelectedSummaryId(null);
    } else {
      navigate(-1);
    }
  };

  // ── Cross-summary keyword navigation (student only) ─────
  // Called from KeywordPopup via StudentSummaryReader → KeywordHighlighterInline
  // → InlineKeywordPopover → KeywordPopup when clicking a connection.
  //
  // 3 cases (mirrors useKeywordNavigation logic used by StudentSummariesView):
  //   A: same summary      → scroll to keyword highlight + flash
  //   B: same topic         → switch selectedSummaryId (instant)
  //   C: cross-topic        → navigate to /student/summary/:newTopicId?summaryId=xxx
  const handleNavigateKeyword = useCallback(
    async (keywordId: string, targetSummaryId: string) => {
      // ── Case A: same summary — scroll to keyword in DOM ──
      if (selectedSummaryId === targetSummaryId) {
        // FIX-E2: Cancel any previous auto-click before starting a new one.
        autoClickRef.current.cancel();

        requestAnimationFrame(() => {
          const kwSpan = document.querySelector(
            `[data-keyword-id="${keywordId}"]`,
          ) as HTMLElement | null;
          if (kwSpan) {
            // FIX-E2/E3/E4: Delegate scroll + flash + auto-open to shared helper.
            autoClickRef.current = scrollFlashAndAutoOpen(keywordId, kwSpan);
            toast.info('Keyword encontrada en este resumen');
          } else {
            toast.info('Keyword conectada — mismo resumen');
          }
        });
        return;
      }

      // ── Case B: different summary in same topic ──
      if (summaries.some(s => s.id === targetSummaryId)) {
        setSelectedSummaryId(targetSummaryId);
        toast.info('Navegando al resumen conectado...');
        return;
      }

      // ── Case C: cross-topic — resolve target topic via API ──
      try {
        const targetSummary = await summariesApi.getSummary(targetSummaryId);
        if (!targetSummary) {
          toast.error('No se encontró el resumen destino');
          return;
        }
        if (targetSummary.topic_id && targetSummary.topic_id !== topicId) {
          // URL navigation → SummaryView re-mounts with new topicId,
          // auto-selects summaryId from query param (useState initializer + useEffect).
          navigate(
            `/student/summary/${targetSummary.topic_id}?summaryId=${targetSummaryId}`,
          );
          toast.info(
            `Cambiando de tópico para ir a "${targetSummary.title || 'resumen'}"...`,
          );
        } else {
          // Same topic but not in published list — try anyway
          setSelectedSummaryId(targetSummaryId);
        }
      } catch (err: any) {
        console.error('[SummaryView] Cross-topic navigate error:', err);
        toast.error('No se pudo navegar al resumen');
      }
    },
    [selectedSummaryId, summaries, topicId, navigate],
  );

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  // ── Error state ─────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={() => summariesQuery.refetch()}>
          <RefreshCw size={14} className="mr-1" /> Reintentar
        </Button>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Layers size={40} className="text-gray-300" />
        <p className="text-sm text-gray-500">
          {isProfessor ? 'No hay resúmenes en este tema. Crea uno para empezar.' : 'No hay resúmenes disponibles.'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} className="mr-1" /> Volver
        </Button>
      </div>
    );
  }

  // ── Summary list (multi-summary topic, none selected) ───
  if (!selectedSummaryId) {
    return (
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
          {breadcrumb.courseName && (
            <>
              <span>{breadcrumb.courseName}</span>
              <ChevronRight size={12} />
            </>
          )}
          {breadcrumb.sectionName && (
            <>
              <span>{breadcrumb.sectionName}</span>
              <ChevronRight size={12} />
            </>
          )}
          <span className="text-gray-600">{breadcrumb.topicName}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-800 flex items-center gap-2">
            <BookOpen size={18} className="text-violet-500" />
            Resúmenes
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="mr-1" /> Volver
          </Button>
        </div>

        <div className="grid gap-3">
          {summaries.map((summary) => (
            <motion.button
              key={summary.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedSummaryId(summary.id)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-violet-50">
                    <FileText size={16} className="text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">{summary.title || 'Sin título'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {summary.status === 'published' ? 'Publicado' : summary.status === 'draft' ? 'Borrador' : 'Rechazado'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 mt-1" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ── Single summary selected ─────────────────────────────

  // ── Student path ────────────────────────────────────────
  // If edu blocks exist → SummaryViewer (block-based enriched view)
  // Otherwise → StudentSummaryReader (HTML monolithic fallback)
  if (!isProfessor && selectedSummary && blocksLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-3 mt-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!isProfessor && selectedSummary) {
    if (hasEduBlocks) {
      return (
        <div className="flex flex-col h-full">
          {/* Header with back + breadcrumb */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft size={14} className="mr-1" /> Voltar
              </Button>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                {breadcrumb.courseName && (
                  <>
                    <span>{breadcrumb.courseName}</span>
                    <ChevronRight size={10} />
                  </>
                )}
                <span className="text-gray-600">{breadcrumb.topicName}</span>
              </div>
            </div>
            <h1
              className="text-teal-900 dark:text-[#3cc9a8]"
              style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)', fontFamily: 'Georgia, serif', fontWeight: 700 }}
            >
              {selectedSummary.title || 'Resumo'}
            </h1>
          </div>
          {/* Block-based content */}
          <div className="flex-1 overflow-y-auto">
            <SummaryViewer summaryId={selectedSummary.id} />
          </div>
        </div>
      );
    }

    return (
      <StudentSummaryReader
        summary={selectedSummary}
        topicName={breadcrumb.topicName}
        readingState={readingState}
        onBack={handleBack}
        onReadingStateChanged={(rs) => {
          queryClient.setQueryData(
            queryKeys.readingState(selectedSummary.id),
            rs,
          );
          queryClient.invalidateQueries({
            queryKey: queryKeys.topicProgress(selectedSummary.topic_id),
          });
        }}
        onNavigateKeyword={handleNavigateKeyword}
      />
    );
  }

  // ── Professor path ──────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {selectedSummary && (
        <div className="px-6 pt-6">
          <SummaryHeader
            summary={selectedSummary}
            breadcrumb={breadcrumb}
            onBack={handleBack}
          />
        </div>
      )}

      {/* Content area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {selectedSummaryId && (
          <QuickKeywordCreator summaryId={selectedSummaryId}>
            <ChunkRenderer chunks={chunks} loading={chunksLoading} />
          </QuickKeywordCreator>
        )}

        {/* Professor: keywords + videos managers */}
        {selectedSummaryId && (
          <div className="px-6 pb-6 space-y-6">
            <KeywordsManager summaryId={selectedSummaryId} />
            <VideosManager summaryId={selectedSummaryId} />
          </div>
        )}
      </div>
    </div>
  );
}