// ============================================================
// WeekView: 7-day vertical strip with compact task cards,
// per-day progress, week summary stats, and drag-drop between days.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { format, isToday, isSameDay, addDays, startOfWeek } from 'date-fns';
import { CalendarDays, Plus } from 'lucide-react';
import type { TaskWithPlan } from './types';
import { WeekSummaryBar } from './WeekSummaryBar';
import { WeekDayRow } from './WeekDayRow';
import { useWeekDragDrop } from './useWeekDragDrop';

export interface WeekViewProps {
  allTasks: TaskWithPlan[];
  selectedDate: Date;
  togglingTaskId: string | null;
  onToggleTask: (planId: string, taskId: string) => void;
  onSelectDay: (date: Date) => void;  // switches to day view
  onNavigateNewPlan: () => void;
  /** Called when a task is dragged from one day to another. */
  onMoveTaskToDay?: (taskId: string, planId: string, newDate: string) => Promise<void>;
}

export function WeekView({
  allTasks,
  selectedDate,
  togglingTaskId,
  onToggleTask,
  onSelectDay,
  onNavigateNewPlan,
  onMoveTaskToDay,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const {
    draggedTaskId,
    dragOverDay,
    effectiveTasks,
    handleTaskDragStart,
    handleDayDragOver,
    handleDayDragLeave,
    handleDayDrop,
  } = useWeekDragDrop({ allTasks, onMoveTaskToDay });

  const weekTasks = effectiveTasks.filter(t => {
    const taskDate = format(t.date, 'yyyy-MM-dd');
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    return taskDate >= start && taskDate <= end;
  });

  const weekCompleted = weekTasks.filter(t => t.completed).length;
  const weekMinutes = weekTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return (
    <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-3">
      <WeekSummaryBar
        total={weekTasks.length}
        completed={weekCompleted}
        minutes={weekMinutes}
      />

      {weekDays.map((day, i) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayTasks = effectiveTasks.filter(t => isSameDay(t.date, day));
        return (
          <WeekDayRow
            key={day.toString()}
            day={day}
            tasks={dayTasks}
            isSelected={isSameDay(day, selectedDate)}
            isCurrentDay={isToday(day)}
            index={i}
            togglingTaskId={togglingTaskId}
            onToggleTask={onToggleTask}
            onSelectDay={onSelectDay}
            isDragOver={dragOverDay === dayStr}
            draggedTaskId={draggedTaskId}
            onDragOver={handleDayDragOver(dayStr)}
            onDragLeave={handleDayDragLeave}
            onDrop={handleDayDrop(dayStr)}
            onTaskDragStart={handleTaskDragStart}
          />
        );
      })}

      {weekTasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-12 text-[#9ba3b2] gap-3"
        >
          <CalendarDays size={36} className="text-[#dfe2e8]" />
          <p className="text-[13px] font-semibold text-[#4a5565]">Sin tareas esta semana</p>
          <button
            onClick={onNavigateNewPlan}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-4 py-2 rounded-full hover:bg-[#ccebe3] transition-colors"
          >
            <Plus size={13} /> Crear plan
          </button>
        </motion.div>
      )}
    </div>
  );
}
