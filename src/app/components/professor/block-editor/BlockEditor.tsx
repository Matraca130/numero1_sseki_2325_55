// ============================================================
// Axon — BlockEditor (Professor: block-based summary editor)
//
// Main orchestrator for the professor's block editor:
//   - Fetches blocks via useSummaryBlocksQuery
//   - CRUD via useBlockEditorMutations
//   - Drag-and-drop reorder (HTML5 native)
//   - Auto-save with 2s debounce per block
//   - Preview toggle (reuses student ViewerBlock)
//   - Publish action
// ============================================================
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import { useUndoRedo } from '@/app/hooks/useUndoRedo';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { Button } from '@/app/components/ui/button';
import { useSummaryBlocksQuery } from '@/app/hooks/queries/useSummaryBlocksQuery';
import {
  useCreateBlockMutation,
  useUpdateBlockMutation,
  useDeleteBlockMutation,
  useReorderBlocksMutation,
} from '@/app/hooks/queries/useBlockEditorMutations';
import type { SummaryBlock, EduBlockType } from '@/app/services/summariesApi';
import { apiCall } from '@/app/lib/api';
import { ViewerBlock } from '@/app/components/student/ViewerBlock';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import BlockEditorToolbar from './BlockEditorToolbar';
import AddBlockButton from './AddBlockButton';
import BlockCard from './BlockCard';
import BlockFormRouter from './BlockFormRouter';
import BlockTypeSelector from './BlockTypeSelector';

// ── Props ─────────────────────────────────────────────────

interface BlockEditorProps {
  summaryId: string;
  onBack: () => void;
  onStatusChange?: (status: string) => void;
  onKeywordsClick?: () => void;
  onVideosClick?: () => void;
  keywordsCount?: number;
  videosCount?: number;
  summaryTitle?: string;
  summaryStatus?: string;
}

// ── Default content for each block type ────────────────────

const DEFAULT_CONTENT: Record<EduBlockType, Record<string, unknown>> = {
  prose: { title: '', content: '' },
  key_point: { title: '', content: '', importance: 'high' },
  stages: { title: '', items: [{ stage: 1, title: '', content: '' }] },
  comparison: { title: '', headers: ['', ''], rows: [['', '']], highlight_column: null },
  list_detail: { title: '', intro: '', items: [{ icon: 'Info', label: '', detail: '' }] },
  grid: { title: '', columns: 2, items: [{ icon: 'Info', label: '', detail: '' }] },
  two_column: { columns: [{ title: '', items: [{ label: '', detail: '' }] }, { title: '', items: [{ label: '', detail: '' }] }] },
  callout: { variant: 'tip', title: '', content: '' },
  image_reference: { description: '', caption: '', image_url: '' },
  section_divider: { label: '' },
};

// ── Component ─────────────────────────────────────────────

const BlockEditor = React.memo(function BlockEditor({
  summaryId,
  onBack,
  onStatusChange,
  onKeywordsClick,
  onVideosClick,
  keywordsCount = 0,
  videosCount = 0,
  summaryTitle,
  summaryStatus = 'draft',
}: BlockEditorProps) {
  // ── Data fetching ─────────────────────────────────────────
  const { data: blocks = [], isLoading } = useSummaryBlocksQuery(summaryId);

  // ── Undo/Redo for block snapshots ──────────────────────
  const {
    state: undoState,
    set: pushSnapshot,
    undo: undoSnapshot,
    redo: redoSnapshot,
    canUndo,
    canRedo,
    reset: resetSnapshot,
  } = useUndoRedo<Record<string, Record<string, unknown>> | null>(null);

  // Local overrides applied when undo/redo restores a snapshot
  const [localBlockOverrides, setLocalBlockOverrides] = useState<Record<string, Record<string, unknown>>>({});

  // ── Mutations ────────────────────────────────────────────
  const createMutation = useCreateBlockMutation(summaryId);
  const updateMutation = useUpdateBlockMutation(summaryId);
  const deleteMutation = useDeleteBlockMutation(summaryId);
  const reorderMutation = useReorderBlocksMutation(summaryId);

  // ── Local state ──────────────────────────────────────────
  const [isPreview, setIsPreview] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showTopSelector, setShowTopSelector] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  // ── Ref for current blocks (avoids unstable deps in callbacks) ──
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // ── Apply undo/redo state back to blocks ──────────────
  useEffect(() => {
    if (undoState === null) return;
    const overrides: Record<string, Record<string, unknown>> = {};
    blocks.forEach((block) => {
      const restored = undoState[block.id];
      if (restored) {
        overrides[block.id] = restored;
      }
    });
    // Cancel all pending debounce timers to prevent stale overwrites
    Object.keys(overrides).forEach(id => {
      if (debounceTimers.current[id]) {
        clearTimeout(debounceTimers.current[id]);
        delete debounceTimers.current[id];
      }
      delete pendingContent.current[id];
    });
    setLocalBlockOverrides(overrides);
    // Persist each changed block to server
    blocks.forEach((block) => {
      const restored = undoState[block.id];
      if (restored && JSON.stringify(block.content) !== JSON.stringify(restored)) {
        updateMutation.mutate({ blockId: block.id, data: { content: restored } });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoState]);

  // Clear local overrides when server data refreshes (after mutation settles)
  useEffect(() => {
    if (Object.keys(localBlockOverrides).length === 0) return;
    // Check if all overrides are now reflected in server data
    const allSettled = Object.entries(localBlockOverrides).every(([id, content]) => {
      const block = blocks.find((b) => b.id === id);
      return block && JSON.stringify(block.content) === JSON.stringify(content);
    });
    if (allSettled) setLocalBlockOverrides({});
  }, [blocks, localBlockOverrides]);

  // ── Debounce state for handleFieldChange ─────────────────
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingContent = useRef<Record<string, Record<string, unknown>>>({});

  // ── Clear local state when summaryId changes ─────────────
  useEffect(() => {
    setEditingBlockId(null);
    setIsPreview(false);
    setDeletingBlockId(null);
    resetSnapshot(null);
  }, [summaryId, resetSnapshot]);

  // ── Keyboard shortcuts for undo/redo ──────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoSnapshot();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redoSnapshot();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoSnapshot, redoSnapshot]);

  // ── Drag state ───────────────────────────────────────────
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Merge server blocks with local undo overrides ──────
  const mergedBlocks = useMemo(() => {
    if (Object.keys(localBlockOverrides).length === 0) return blocks;
    return blocks.map((b) =>
      localBlockOverrides[b.id] ? { ...b, content: { ...b.content, ...localBlockOverrides[b.id] } } : b,
    );
  }, [blocks, localBlockOverrides]);

  // ── Sorted blocks (use server order, apply local drag preview) ──
  const sortedBlocks = useMemo(() => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) return mergedBlocks;
    const arr = [...mergedBlocks];
    const [moved] = arr.splice(dragIndex, 1);
    arr.splice(dragOverIndex, 0, moved);
    return arr;
  }, [mergedBlocks, dragIndex, dragOverIndex]);

  // ── Handlers ─────────────────────────────────────────────

  const handleInsert = useCallback((type: EduBlockType, afterIndex: number) => {
    const currentBlocks = blocksRef.current;
    const newOrderIndex = afterIndex < 0 ? 0 : (currentBlocks[afterIndex]?.order_index ?? 0) + 1;
    createMutation.mutate({
      summary_id: summaryId,
      type,
      content: DEFAULT_CONTENT[type] || {},
      order_index: newOrderIndex,
    }, {
      onSuccess: (newBlock: SummaryBlock) => {
        setEditingBlockId(newBlock.id);
        setIsPreview(false);
      },
    });
  }, [summaryId, createMutation]);

  const handleToggleEdit = useCallback((blockId: string) => {
    setEditingBlockId((prev) => (prev === blockId ? null : blockId));
  }, []);

  const handleFieldChange = useCallback((blockId: string, field: string, value: unknown) => {
    // Push undo snapshot before first edit on this block (debounced to avoid spam)
    if (!pendingContent.current[blockId]) {
      pushSnapshot(Object.fromEntries(blocksRef.current.map((b) => [b.id, { ...b.content }])));
    }

    // Immediate local override for responsive UI
    setLocalBlockOverrides((prev) => ({
      ...prev,
      [blockId]: { ...(prev[blockId] ?? {}), [field]: value },
    }));
    pendingContent.current[blockId] = {
      ...(pendingContent.current[blockId] ?? {}),
      [field]: value,
    };

    // Debounce 2s — merge with full block content before saving
    if (debounceTimers.current[blockId]) {
      clearTimeout(debounceTimers.current[blockId]);
    }
    debounceTimers.current[blockId] = setTimeout(() => {
      const partial = pendingContent.current[blockId];
      if (partial) {
        const block = blocksRef.current.find((b) => b.id === blockId);
        const content = { ...(block?.content ?? {}), ...partial };
        updateMutation.mutate({ blockId, data: { content } }, {
          onSuccess: () => {
            delete pendingContent.current[blockId];
          },
        });
      }
    }, 2000);
  }, [updateMutation, pushSnapshot]);

  // ── Flush all pending saves immediately (async — await before publish) ─
  const flushPending = useCallback(async () => {
    // Clear all debounce timers
    for (const timer of Object.values(debounceTimers.current)) {
      clearTimeout(timer);
    }
    debounceTimers.current = {};

    // Save all pending content immediately (merge with full block content)
    const promises: Promise<unknown>[] = [];
    for (const [blockId, partial] of Object.entries(pendingContent.current)) {
      const block = blocksRef.current.find((b) => b.id === blockId);
      const content = { ...(block?.content ?? {}), ...partial };
      promises.push(
        new Promise((resolve, reject) => {
          updateMutation.mutate({ blockId, data: { content } }, {
            onSuccess: resolve,
            onError: reject,
          });
        }),
      );
    }
    if (promises.length > 0) await Promise.all(promises);
    pendingContent.current = {};
    setLocalBlockOverrides({});
  }, [updateMutation]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingBlockId) return;
    // Clear any pending debounced save for this block
    if (debounceTimers.current[deletingBlockId]) {
      clearTimeout(debounceTimers.current[deletingBlockId]);
      delete debounceTimers.current[deletingBlockId];
    }
    delete pendingContent.current[deletingBlockId];
    setLocalBlockOverrides((prev) => {
      if (!prev[deletingBlockId]) return prev;
      const next = { ...prev };
      delete next[deletingBlockId];
      return next;
    });
    if (editingBlockId === deletingBlockId) setEditingBlockId(null);
    deleteMutation.mutate(deletingBlockId, {
      onSuccess: () => setDeletingBlockId(null),
    });
  }, [deletingBlockId, editingBlockId, deleteMutation]);

  const handleDuplicate = useCallback((block: SummaryBlock) => {
    createMutation.mutate({
      summary_id: summaryId,
      type: block.type,
      content: { ...block.content },
      order_index: (block.order_index ?? 0) + 1,
    }, {
      onSuccess: (newBlock: SummaryBlock) => {
        setEditingBlockId(newBlock.id);
      },
    });
  }, [summaryId, createMutation]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const currentBlocks = blocksRef.current;
    const arr = [...currentBlocks];
    const [moved] = arr.splice(index, 1);
    arr.splice(index - 1, 0, moved);
    const items = arr.map((b, i) => ({ id: b.id, order_index: i }));
    reorderMutation.mutate(items);
  }, [reorderMutation]);

  const handleMoveDown = useCallback((index: number) => {
    const currentBlocks = blocksRef.current;
    if (index >= currentBlocks.length - 1) return;
    const arr = [...currentBlocks];
    const [moved] = arr.splice(index, 1);
    arr.splice(index + 1, 0, moved);
    const items = arr.map((b, i) => ({ id: b.id, order_index: i }));
    reorderMutation.mutate(items);
  }, [reorderMutation]);

  // ── Drag-and-drop handlers ───────────────────────────────

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // Build new order
      const arr = [...blocksRef.current];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(dragOverIndex, 0, moved);
      const items = arr.map((b, i) => ({ id: b.id, order_index: i }));
      reorderMutation.mutate(items);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, reorderMutation]);

  // ── Publish ──────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      await flushPending();
      await apiCall(`/summaries/${summaryId}/publish`, { method: 'POST' });
      toast.success('Resumen publicado');
      onStatusChange?.('published');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al publicar';
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  }, [summaryId, flushPending, onStatusChange]);

  // ── Render ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        <p className="text-sm text-gray-400">Cargando bloques...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        {summaryTitle && (
          <h2 className="truncate text-sm text-gray-700" style={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>
            {summaryTitle}
          </h2>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {summaryStatus === 'published' ? 'Publicado' : summaryStatus === 'draft' ? 'Borrador' : summaryStatus}
        </span>
      </div>

      {/* Toolbar */}
      <BlockEditorToolbar
        onAddBlock={() => setShowTopSelector(true)}
        isPreview={isPreview}
        onTogglePreview={async () => { if (!isPreview) await flushPending(); setIsPreview(prev => !prev); }}
        onPublish={handlePublish}
        status={summaryStatus}
        blockCount={blocks.length}
        onKeywordsClick={onKeywordsClick}
        onVideosClick={onVideosClick}
        keywordsCount={keywordsCount}
        videosCount={videosCount}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoSnapshot}
        onRedo={redoSnapshot}
      />

      {/* Block type selector (from toolbar "Agregar bloque") */}
      {showTopSelector && (
        <div className="relative shrink-0 flex justify-center border-b border-gray-100 bg-gray-50 py-3">
          <BlockTypeSelector
            onSelect={(type) => {
              handleInsert(type, -1);
              setShowTopSelector(false);
            }}
            onClose={() => setShowTopSelector(false)}
          />
        </div>
      )}

      {/* Status bar: auto-save feedback + publishing */}
      {(publishing || updateMutation.isPending) && (
        <div className={`flex items-center gap-2 border-b px-4 py-1.5 ${publishing ? 'border-amber-200 bg-amber-50' : 'border-violet-100 bg-violet-50'}`}>
          <Loader2 className={`h-3 w-3 animate-spin ${publishing ? 'text-amber-600' : 'text-violet-500'}`} />
          <span className={`text-xs ${publishing ? 'text-amber-700' : 'text-violet-600'}`}>
            {publishing ? 'Publicando...' : 'Guardando...'}
          </span>
        </div>
      )}
      {!publishing && !updateMutation.isPending && updateMutation.isSuccess && (
        <div className="flex items-center gap-1.5 border-b border-emerald-100 bg-emerald-50 px-4 py-1">
          <Check className="h-3 w-3 text-emerald-500" />
          <span className="text-xs text-emerald-600">Guardado</span>
        </div>
      )}

      {/* Blocks list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-1">
          {/* Top add-block button */}
          {!isPreview && (
            <AddBlockButton afterIndex={-1} onInsert={handleInsert} />
          )}

          {sortedBlocks.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 border border-violet-100">
                <span className="text-2xl text-violet-300">+</span>
              </div>
              <p className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Sin bloques aún</p>
              <p className="mt-1 text-xs text-gray-400">
                Haz click en "Agregar bloque" para empezar a construir el resumen
              </p>
            </div>
          )}

          {sortedBlocks.map((block, index) => (
            <React.Fragment key={block.id}>
              <div
                draggable={!isPreview}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={dragIndex === index ? 'opacity-50' : ''}
              >
                {isPreview ? (
                  // Preview mode — use student renderer
                  <div className="py-2">
                    <ErrorBoundary fallback={<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-500">Error al renderizar bloque</div>}>
                      <ViewerBlock block={block} isMobile={false} />
                    </ErrorBoundary>
                  </div>
                ) : (
                  // Edit mode — use BlockCard with form/preview toggle
                  <BlockCard
                    block={block}
                    isEditing={editingBlockId === block.id}
                    onToggleEdit={() => setEditingBlockId(prev => prev === block.id ? null : block.id)}
                    onDelete={() => setDeletingBlockId(block.id)}
                    onDuplicate={() => handleDuplicate(block)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    isFirst={index === 0}
                    isLast={index === sortedBlocks.length - 1}
                  >
                    {editingBlockId === block.id ? (
                      <BlockFormRouter
                        block={block}
                        onChange={(field, value) => handleFieldChange(block.id, field, value)}
                      />
                    ) : (
                      <ErrorBoundary fallback={<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-500">Error al renderizar bloque</div>}>
                        <ViewerBlock block={block} isMobile={false} />
                      </ErrorBoundary>
                    )}
                  </BlockCard>
                )}
              </div>

              {/* Add block between */}
              {!isPreview && (
                <AddBlockButton afterIndex={index} onInsert={handleInsert} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deletingBlockId}
        onOpenChange={(open) => { if (!open) setDeletingBlockId(null); }}
        title="Eliminar bloque"
        description="¿Seguro que deseas eliminar este bloque? Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
});

export default BlockEditor;
