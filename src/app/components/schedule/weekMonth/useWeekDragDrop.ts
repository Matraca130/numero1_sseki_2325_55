// ============================================================
// Drag-and-drop state for reordering tasks across days in the
// week view. Manages optimistic moves + revert on failure.
// ============================================================
import React, { useCallback, useState } from 'react';
import { format } from 'date-fns';
import type { TaskWithPlan } from './types';

interface UseWeekDragDropArgs {
  allTasks: TaskWithPlan[];
  onMoveTaskToDay?: (taskId: string, planId: string, newDate: string) => Promise<void>;
}

interface UseWeekDragDropResult {
  draggedTaskId: string | null;
  dragOverDay: string | null;
  /** Task list with optimistic moves applied (use instead of allTasks for rendering). */
  effectiveTasks: TaskWithPlan[];
  handleTaskDragStart: (e: React.DragEvent, task: TaskWithPlan, fromDate: string) => void;
  /** Curried: pass the target dayStr. Returns a DragEvent handler. */
  handleDayDragOver: (dayStr: string) => (e: React.DragEvent) => void;
  handleDayDragLeave: (e: React.DragEvent) => void;
  /** Curried: pass the target date. Returns an async DragEvent handler. */
  handleDayDrop: (targetDate: string) => (e: React.DragEvent) => Promise<void>;
}

export function useWeekDragDrop({
  allTasks,
  onMoveTaskToDay,
}: UseWeekDragDropArgs): UseWeekDragDropResult {
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  // Optimistic moves: taskId -> new date string (yyyy-MM-dd)
  const [optimisticMoves, setOptimisticMoves] = useState<Map<string, string>>(new Map());

  const handleTaskDragStart = useCallback((e: React.DragEvent, task: TaskWithPlan, fromDate: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      taskId: task.id,
      planId: task.planId,
      fromDate,
    }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  }, []);

  const handleDayDragOver = useCallback((dayStr: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayStr);
  }, []);

  const handleDayDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the container (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && (e.currentTarget as HTMLElement).contains(relatedTarget)) return;
    setDragOverDay(null);
  }, []);

  const handleDayDrop = useCallback((targetDate: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDay(null);
    setDraggedTaskId(null);

    let data: { taskId: string; planId: string; fromDate: string };
    try {
      data = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }

    if (data.fromDate === targetDate) return;

    // Optimistic update
    setOptimisticMoves(prev => {
      const next = new Map(prev);
      next.set(data.taskId, targetDate);
      return next;
    });

    if (onMoveTaskToDay) {
      try {
        await onMoveTaskToDay(data.taskId, data.planId, targetDate);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[WeekView] Move task failed, reverting:', err);
        }
        // Revert optimistic move on failure
        setOptimisticMoves(prev => {
          const next = new Map(prev);
          next.delete(data.taskId);
          return next;
        });
      }
    }
  }, [onMoveTaskToDay]);

  // Clear drag state on drag end (e.g. escape key or drop outside)
  React.useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedTaskId(null);
      setDragOverDay(null);
    };
    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => document.removeEventListener('dragend', handleGlobalDragEnd);
  }, []);

  // Apply optimistic moves to task list
  const effectiveTasks = React.useMemo(() => {
    if (optimisticMoves.size === 0) return allTasks;
    return allTasks.map(t => {
      const newDateStr = optimisticMoves.get(t.id);
      if (!newDateStr) return t;
      // Parse yyyy-MM-dd into a Date at midnight local time
      const [y, m, d] = newDateStr.split('-').map(Number);
      return { ...t, date: new Date(y, m - 1, d) };
    });
  }, [allTasks, optimisticMoves]);

  return {
    draggedTaskId,
    dragOverDay,
    effectiveTasks,
    handleTaskDragStart,
    handleDayDragOver,
    handleDayDragLeave,
    handleDayDrop,
  };
}

// Re-export format so WeekView can build dayStr consistently.
export { format };
