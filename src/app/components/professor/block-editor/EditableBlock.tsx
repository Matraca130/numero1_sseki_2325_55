// ============================================================
// Axon — EditableBlock (Performance isolation wrapper)
//
// Wraps a single block in the editor, managing LOCAL content
// state so that typing only re-renders THIS block — not the
// entire block list. Debounces saves to the server at 2s.
//
// Uses ID-based callbacks so that the parent can pass stable
// refs (via useCallback) instead of inline arrow functions.
// ============================================================
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { SummaryBlock } from '@/app/services/summariesApi';
import { ViewerBlock } from '@/app/components/student/ViewerBlock';
import BlockCard from './BlockCard';
import BlockFormRouter from './BlockFormRouter';

interface EditableBlockProps {
  block: SummaryBlock;
  index: number;
  isEditing: boolean;
  isPreview: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggleEdit: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (block: SummaryBlock) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSave: (blockId: string, content: Record<string, unknown>) => void;
  onFlushRef: React.MutableRefObject<Map<string, () => void>>;
}

const EditableBlock = React.memo(function EditableBlock({
  block,
  index,
  isEditing,
  isPreview,
  isFirst,
  isLast,
  onToggleEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onSave,
  onFlushRef,
}: EditableBlockProps) {
  // ── Local content state (only updates THIS component) ────
  const [localContent, setLocalContent] = useState<Record<string, unknown>>(
    () => block.content || {},
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);

  // ── Sync from server when block.content changes externally ─
  // (e.g. after mutation settles / React Query refetch)
  const serverContentRef = useRef(block.content);
  useEffect(() => {
    if (block.content !== serverContentRef.current) {
      serverContentRef.current = block.content;
      if (!pendingRef.current) {
        setLocalContent(block.content || {});
      }
    }
  }, [block.content]);

  // ── Register flush handler so parent can flush before publish ─
  useEffect(() => {
    const flushFn = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (pendingRef.current) {
        onSave(block.id, pendingRef.current);
        pendingRef.current = null;
      }
    };
    onFlushRef.current.set(block.id, flushFn);
    return () => {
      onFlushRef.current.delete(block.id);
      flushFn();
    };
  }, [block.id, onSave, onFlushRef]);

  // ── Handle field change (local state + debounced save) ────
  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      setLocalContent((prev) => {
        const next = { ...prev, [field]: value };
        pendingRef.current = next;
        return next;
      });

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        if (pendingRef.current) {
          onSave(block.id, pendingRef.current);
          pendingRef.current = null;
        }
      }, 2000);
    },
    [block.id, onSave],
  );

  // ── Stable callback wrappers (bind block.id / index once) ──
  const handleToggleEdit = useCallback(() => onToggleEdit(block.id), [block.id, onToggleEdit]);
  const handleDelete = useCallback(() => onDelete(block.id), [block.id, onDelete]);
  const handleDuplicate = useCallback(() => onDuplicate(block), [block, onDuplicate]);
  const handleMoveUp = useCallback(() => onMoveUp(index), [index, onMoveUp]);
  const handleMoveDown = useCallback(() => onMoveDown(index), [index, onMoveDown]);

  // ── Build merged block for rendering ──────────────────────
  const mergedBlock = useMemo(
    () => ({ ...block, content: localContent }),
    [block, localContent],
  );

  // ── Render ────────────────────────────────────────────────
  if (isPreview) {
    return (
      <div className="py-2">
        <ViewerBlock block={mergedBlock} isMobile={false} />
      </div>
    );
  }

  return (
    <BlockCard
      block={mergedBlock}
      isEditing={isEditing}
      onToggleEdit={handleToggleEdit}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      isFirst={isFirst}
      isLast={isLast}
    >
      {isEditing ? (
        <BlockFormRouter block={mergedBlock} onChange={handleFieldChange} />
      ) : (
        <ViewerBlock block={mergedBlock} isMobile={false} />
      )}
    </BlockCard>
  );
});

EditableBlock.displayName = 'EditableBlock';
export default EditableBlock;
