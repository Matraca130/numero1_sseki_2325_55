/**
 * SummaryDetailView — Main component.
 * Full-page editor with keyword/video sheets.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Video as VideoIcon } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/app/components/ui/sheet';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/hooks/queries/queryKeys';
import { PROFESSOR_CONTENT_STALE } from '@/app/hooks/queries/staleTimes';
import {
  useCreateKeywordMutation,
  useUpdateKeywordMutation,
  useDeleteKeywordMutation,
  useRestoreKeywordMutation,
} from '@/app/hooks/queries/useKeywordsManagerQueries';
import {
  useCreateSubtopicMutation,
  useDeleteSubtopicMutation,
} from '@/app/hooks/queries/useSubtopicMutations';
import * as api from '@/app/services/summariesApi';
import type { Summary, SummaryKeyword, SummaryBlock, Subtopic } from '@/app/services/summariesApi';
import { VideosManager } from '@/app/components/professor/VideosManager';
import { TipTapEditor } from '@/app/components/tiptap/TipTapEditor';
import {
  useQuickKeywordCreator,
  QuickKeywordFormPortal,
} from '@/app/components/professor/QuickKeywordCreator';
import { KeywordClickPopover } from '@/app/components/professor/KeywordClickPopover';
import { extractItems } from '@/app/lib/api-helpers';
import BlockEditor from '@/app/components/professor/block-editor/BlockEditor';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { KeywordManager } from './KeywordManager';

interface SummaryDetailViewProps {
  summary: Summary;
  topicName: string;
  onBack: () => void;
  onSummaryUpdated: () => void;
}

export function SummaryDetailView({
  summary, topicName, onBack, onSummaryUpdated,
}: SummaryDetailViewProps) {
  const [editorMode, setEditorMode] = useState<'blocks' | 'tiptap' | null>(null);
  const [showKeywords, setShowKeywords] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const [videosCount, setVideosCount] = useState(0);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState('');

  // Keywords query
  const { data: allKeywords = [], isLoading: keywordsLoading } = useQuery({
    queryKey: queryKeys.summaryKeywords(summary.id),
    queryFn: async () => extractItems<SummaryKeyword>(await api.getKeywords(summary.id)),
    staleTime: PROFESSOR_CONTENT_STALE,
  });

  const createMutation = useCreateKeywordMutation(summary.id);
  const updateMutation = useUpdateKeywordMutation(summary.id);
  const deleteMutation = useDeleteKeywordMutation(summary.id);
  const restoreMutation = useRestoreKeywordMutation(summary.id);

  const activeKeywords = useMemo(() => allKeywords.filter(k => k.is_active), [allKeywords]);
  const activeKeywordNames = useMemo(() => activeKeywords.map(k => k.name), [activeKeywords]);

  // Subtopics
  const { data: currentSubtopics = [], isLoading: subtopicsLoading } = useQuery({
    queryKey: queryKeys.kwSubtopics(expandedKeyword!),
    queryFn: async () => extractItems<Subtopic>(await api.getSubtopics(expandedKeyword!))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    enabled: !!expandedKeyword,
    staleTime: PROFESSOR_CONTENT_STALE,
  });

  const createSubtopicMutation = useCreateSubtopicMutation(summary.id);
  const deleteSubtopicMutation = useDeleteSubtopicMutation(summary.id);

  // Blocks detection
  const { data: hasBlocks = false } = useQuery({
    queryKey: queryKeys.summaryBlocks(summary.id),
    queryFn: async () => extractItems<SummaryBlock>(await api.getSummaryBlocks(summary.id))
      .filter(b => b.is_active !== false).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    staleTime: PROFESSOR_CONTENT_STALE,
    select: (blocks) => blocks.length > 0,
  });

  const resolvedMode = editorMode ?? (hasBlocks ? 'blocks' : 'tiptap');
  const quickKw = useQuickKeywordCreator();

  // Keyword click popover
  const [clickedKeyword, setClickedKeyword] = useState<SummaryKeyword | null>(null);
  const [clickedKeywordEl, setClickedKeywordEl] = useState<HTMLElement | null>(null);

  const handleKeywordClick = useCallback((kwName: string, anchorEl: HTMLElement) => {
    const kw = allKeywords.find(k => k.name.toLowerCase() === kwName.toLowerCase() && k.is_active);
    if (!kw) return;
    setClickedKeyword(kw);
    setClickedKeywordEl(anchorEl);
  }, [allKeywords]);

  const handlePopoverEdit = useCallback((kw: SummaryKeyword) => {
    setShowKeywords(true);
  }, []);

  const handleStatusChange = useCallback(async (newStatus: 'draft' | 'published') => {
    try {
      await api.updateSummary(summary.id, { status: newStatus });
      toast.success(newStatus === 'published' ? 'Publicado' : 'Cambiado a borrador');
      onSummaryUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado');
    }
  }, [summary.id, onSummaryUpdated]);

  const handleDeleteKeyword = () => {
    if (!deletingKeywordId) return;
    deleteMutation.mutate(deletingKeywordId, { onSuccess: () => setDeletingKeywordId(null) });
  };

  const handleCreateSubtopic = (keywordId: string) => {
    if (!newSubtopicName.trim()) return;
    createSubtopicMutation.mutate(
      { keyword_id: keywordId, name: newSubtopicName.trim() },
      { onSuccess: () => setNewSubtopicName('') },
    );
  };

  const toggleKeywordExpand = (keywordId: string) => {
    setExpandedKeyword(prev => prev === keywordId ? null : keywordId);
    setNewSubtopicName('');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Editor mode toggle */}
      {resolvedMode === 'tiptap' && (
        <div className="shrink-0 px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-teal-100 text-teal-700 border border-teal-200">
              {hasBlocks ? 'Vista enriquecida disponible' : 'Editor de bloques'}
            </span>
            <button onClick={() => setEditorMode('blocks')} className="text-[10px] text-teal-600 hover:text-teal-800 underline">
              Cambiar a editor de bloques
            </button>
          </div>
        </div>
      )}

      {resolvedMode === 'blocks' ? (
        <ErrorBoundary fallback={
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-gray-500 font-medium">Error al cargar el editor de bloques</p>
            <button onClick={onBack} className="mt-3 text-xs text-teal-500 hover:underline">Volver</button>
          </div>
        }>
          <BlockEditor
            summaryId={summary.id} onBack={onBack} onStatusChange={handleStatusChange}
            onKeywordsClick={() => setShowKeywords(true)} onVideosClick={() => setShowVideos(true)}
            keywordsCount={activeKeywords.length} videosCount={videosCount}
            summaryTitle={summary.title || 'Sin titulo'} summaryStatus={summary.status}
          />
        </ErrorBoundary>
      ) : (
        <TipTapEditor
          summaryId={summary.id} contentMarkdown={summary.content_markdown}
          summaryTitle={summary.title || 'Sin titulo'} summaryStatus={summary.status}
          onBack={onBack} onStatusChange={handleStatusChange}
          onKeywordsClick={() => setShowKeywords(true)} onVideosClick={() => setShowVideos(true)}
          keywordsCount={activeKeywords.length} videosCount={videosCount}
          onCreateKeywordFromSelection={quickKw.triggerFromEditor}
          keywordNames={activeKeywordNames} onKeywordClick={handleKeywordClick}
        />
      )}

      <QuickKeywordFormPortal state={quickKw.state} summaryId={summary.id} onClose={quickKw.close} existingKeywordNames={activeKeywordNames} />

      {clickedKeyword && clickedKeywordEl && (
        <KeywordClickPopover
          keyword={clickedKeyword} allKeywords={activeKeywords} anchorEl={clickedKeywordEl}
          onClose={() => { setClickedKeyword(null); setClickedKeywordEl(null); }}
          onEdit={handlePopoverEdit}
        />
      )}

      <KeywordManager
        open={showKeywords} onOpenChange={setShowKeywords}
        allKeywords={allKeywords} activeKeywords={activeKeywords} keywordsLoading={keywordsLoading}
        createMutation={createMutation} updateMutation={updateMutation}
        deleteMutation={deleteMutation} restoreMutation={restoreMutation}
        expandedKeyword={expandedKeyword} onToggleKeywordExpand={toggleKeywordExpand}
        currentSubtopics={currentSubtopics} subtopicsLoading={subtopicsLoading}
        newSubtopicName={newSubtopicName} onNewSubtopicNameChange={setNewSubtopicName}
        onCreateSubtopic={handleCreateSubtopic}
        onDeleteSubtopic={(stId, kwId) => deleteSubtopicMutation.mutate({ subtopicId: stId, keywordId: kwId })}
        createSubtopicPending={createSubtopicMutation.isPending}
        onSetDeletingKeywordId={setDeletingKeywordId}
      />

      <Sheet open={showVideos} onOpenChange={setShowVideos}>
        <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <VideoIcon size={16} className="text-blue-500" />
              Videos
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <VideosManager summaryId={summary.id} onVideosChanged={(count: number) => setVideosCount(count)} />
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deletingKeywordId}
        onOpenChange={(open) => { if (!open) setDeletingKeywordId(null); }}
        title="Eliminar keyword"
        description="La keyword sera marcada como eliminada (soft-delete). Podras restaurarla despues."
        confirmLabel="Eliminar" variant="destructive"
        loading={deleteMutation.isPending} onConfirm={handleDeleteKeyword}
      />
    </div>
  );
}
