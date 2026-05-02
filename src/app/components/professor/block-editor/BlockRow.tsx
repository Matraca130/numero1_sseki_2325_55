// ============================================================
// Axon — BlockRow (memoized per-block render in BlockEditor)
//
// Extracted from BlockEditor.tsx so that typing in one block
// (which mutates localBlockOverrides for that block only) does
// NOT re-render every other block. Without this wrapper, the
// parent passes inline lambdas + JSX children whose identity
// changes every render — React.memo on BlockCard alone never
// short-circuits because the children prop is always a fresh
// element.
//
// All forwarded handlers must be useCallback'd in the parent.
// Inline closures wrapping `block` / `block.id` / `index` are
// created INSIDE this memoized component (harmless — they live
// past the memo boundary and only re-create when this row
// itself re-renders, which only happens on prop changes).
// ============================================================

import React from 'react';
import type { SummaryBlock, EduBlockType } from '@/app/services/summariesApi';
import BlockCard from './BlockCard';
import BlockFormRouter from './BlockFormRouter';
import { ViewerBlock } from '@/app/components/student/ViewerBlock';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import AddBlockButton from './AddBlockButton';

interface BlockRowProps {
  block: SummaryBlock;
  index: number;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  isPreview: boolean;
  isDragging: boolean;
  // Stable refs from useCallback in BlockEditor
  onToggleEdit: (blockId: string) => void;
  onRequestDelete: (blockId: string) => void;
  onDuplicate: (block: SummaryBlock) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onFieldChange: (blockId: string, field: string, value: unknown) => void;
  onInsert: (type: EduBlockType, afterIndex: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

export const BlockRow = React.memo(function BlockRow({
  block,
  index,
  isEditing,
  isFirst,
  isLast,
  isPreview,
  isDragging,
  onToggleEdit,
  onRequestDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onFieldChange,
  onInsert,
  onDragStart,
  onDragOver,
  onDragEnd,
}: BlockRowProps) {
  const errorFallback = (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-500">
      Error al renderizar bloque
    </div>
  );

  return (
    <>
      <div
        draggable={!isPreview}
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDragEnd={onDragEnd}
        className={isDragging ? 'opacity-50' : ''}
      >
        {isPreview ? (
          <div className="py-2">
            <ErrorBoundary fallback={errorFallback}>
              <ViewerBlock block={block} isMobile={false} />
            </ErrorBoundary>
          </div>
        ) : (
          <BlockCard
            block={block}
            isEditing={isEditing}
            onToggleEdit={() => onToggleEdit(block.id)}
            onDelete={() => onRequestDelete(block.id)}
            onDuplicate={() => onDuplicate(block)}
            onMoveUp={() => onMoveUp(index)}
            onMoveDown={() => onMoveDown(index)}
            isFirst={isFirst}
            isLast={isLast}
          >
            {isEditing ? (
              <BlockFormRouter
                block={block}
                onChange={(field, value) => onFieldChange(block.id, field, value)}
              />
            ) : (
              <ErrorBoundary fallback={errorFallback}>
                <ViewerBlock block={block} isMobile={false} />
              </ErrorBoundary>
            )}
          </BlockCard>
        )}
      </div>

      {!isPreview && <AddBlockButton afterIndex={index} onInsert={onInsert} />}
    </>
  );
});
