// ============================================================
// Axon — Professor: Quiz Bulk Operations Hook (M-1 Extraction)
//
// Extracted from QuizQuestionsEditor.tsx to reduce file size
// and make bulk ops reusable across editor views.
//
// Manages:
//   - Multi-selection state (selectedIds)
//   - Select all / Deselect all
//   - Bulk delete / Bulk restore (via API)
//   - Local reorder (move up / move down)
//   - Ordered questions list (applies localOrder over filtered)
//
// Architecture: stateless params → internal state → return API
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import { logger } from '@/app/lib/logger';

// ── Return type ──────────────────────────────────────────

export interface UseQuizBulkOpsReturn {
  selectedIds: Set<string>;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleToggleSelect: (id: string) => void;
  handleBulkDelete: (ids: string[]) => Promise<void>;
  handleBulkRestore: (ids: string[]) => Promise<void>;
  /** filteredQuestions with localOrder applied */
  orderedQuestions: QuizQuestion[];
  handleMoveUp: () => void;
  handleMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

// ── Hook ─────────────────────────────────────────────────

export function useQuizBulkOps(
  filteredQuestions: QuizQuestion[],
  loadQuestions: () => Promise<void>,
): UseQuizBulkOpsReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  // ── Selection ──────────────────────────────────────────

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
  }, [filteredQuestions]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Bulk API operations ────────────────────────────────

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      try { await quizApi.deleteQuizQuestion(id); } catch (err) { logger.warn('[useQuizBulkOps] bulk delete failed for', id, err); }
    }
    setSelectedIds(new Set());
    await loadQuestions();
  }, [loadQuestions]);

  const handleBulkRestore = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      try { await quizApi.restoreQuizQuestion(id); } catch (err) { logger.warn('[useQuizBulkOps] bulk restore failed for', id, err); }
    }
    setSelectedIds(new Set());
    await loadQuestions();
  }, [loadQuestions]);

  // ── Local reorder ──────────────────────────────────────

  const orderedQuestions = useMemo(() => {
    if (!localOrder) return filteredQuestions;
    const map = new Map(filteredQuestions.map(q => [q.id, q]));
    return localOrder.map(id => map.get(id)).filter((q): q is QuizQuestion => !!q);
  }, [filteredQuestions, localOrder]);

  const handleMoveUp = useCallback(() => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0];
    const order = localOrder || filteredQuestions.map(q => q.id);
    const idx = order.indexOf(id);
    if (idx <= 0) return;
    const newOrder = [...order];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setLocalOrder(newOrder);
  }, [selectedIds, localOrder, filteredQuestions]);

  const handleMoveDown = useCallback(() => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0];
    const order = localOrder || filteredQuestions.map(q => q.id);
    const idx = order.indexOf(id);
    if (idx < 0 || idx >= order.length - 1) return;
    const newOrder = [...order];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setLocalOrder(newOrder);
  }, [selectedIds, localOrder, filteredQuestions]);

  const canMoveUp = useMemo(() => {
    if (selectedIds.size !== 1) return false;
    const id = Array.from(selectedIds)[0];
    const order = localOrder || filteredQuestions.map(q => q.id);
    return order.indexOf(id) > 0;
  }, [selectedIds, localOrder, filteredQuestions]);

  const canMoveDown = useMemo(() => {
    if (selectedIds.size !== 1) return false;
    const id = Array.from(selectedIds)[0];
    const order = localOrder || filteredQuestions.map(q => q.id);
    const idx = order.indexOf(id);
    return idx >= 0 && idx < order.length - 1;
  }, [selectedIds, localOrder, filteredQuestions]);

  return {
    selectedIds,
    handleSelectAll,
    handleDeselectAll,
    handleToggleSelect,
    handleBulkDelete,
    handleBulkRestore,
    orderedQuestions,
    handleMoveUp,
    handleMoveDown,
    canMoveUp,
    canMoveDown,
  };
}