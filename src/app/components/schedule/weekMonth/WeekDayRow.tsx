// ============================================================
// One day row inside the week view: header + collapsible task list.
// Handles drag-over visuals and auto-expand on drag/select.
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { gradients } from '@/app/design-system';
import type { TaskWithPlan } from './types';
import { CompactTaskCard } from './CompactTaskCard';

export function WeekDayRow({
  day,
  tasks,
  isSelected,
  isCurrentDay,
  index,
  togglingTaskId,
  onToggleTask,
  onSelectDay,
  isDragOver,
  draggedTaskId,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskDragStart,
}: {
  day: Date;
  tasks: TaskWithPlan[];
  isSelected: boolean;
  isCurrentDay: boolean;
  index: number;
  togglingTaskId: string | null;
  onToggleTask: (planId: string, taskId: string) => void;
  onSelectDay: (date: Date) => void;
  isDragOver: boolean;
  draggedTaskId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onTaskDragStart: (e: React.DragEvent, task: TaskWithPlan, dayStr: string) => void;
}) {
  const completed = tasks.filter(t => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const progressColor = pct >= 80 ? '#34D399' : pct >= 40 ? '#d97706' : '#f87171';
  const [expanded, setExpanded] = React.useState(isCurrentDay || isSelected);
  const dayStr = format(day, 'yyyy-MM-dd');

  // Expand when the day becomes selected
  React.useEffect(() => {
    if (isSelected || isCurrentDay) setExpanded(true);
  }, [isSelected, isCurrentDay]);

  // Auto-expand when dragging over a collapsed day
  React.useEffect(() => {
    if (isDragOver && !expanded) setExpanded(true);
  }, [isDragOver, expanded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={clsx(
        'rounded-[12px] border overflow-hidden transition-all',
        isDragOver
          ? 'border-teal-400 ring-2 ring-teal-400/40 bg-teal-50/30 shadow-[0_0_12px_rgba(20,184,166,0.12)]'
          : isCurrentDay
            ? 'border-[#2a8c7a]/30 shadow-[0_0_0_1px_rgba(42,140,122,0.12),0_2px_8px_rgba(42,140,122,0.05)]'
            : isSelected
              ? 'border-[#1a2332]/20 shadow-[0_1px_6px_rgba(0,0,0,0.05)]'
              : 'border-[#ebedf0] hover:border-[#d5d9e0]',
      )}
    >
      {/* Day header — clickable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          isDragOver
            ? 'bg-gradient-to-r from-teal-50 to-teal-50/50'
            : isCurrentDay
              ? gradients.currentDayHeader.tw
              : isSelected
                ? 'bg-[#f8f9fb]'
                : 'bg-white hover:bg-[#fafafa]',
        )}
      >
        {/* Day label */}
        <div className="shrink-0 w-12 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9ba3b2]">
            {format(day, 'EEE', { locale: es })}
          </div>
          <div className={clsx(
            'text-[16px] font-bold leading-none mt-0.5',
            isCurrentDay ? 'text-[#2a8c7a]' : 'text-[#1a2332]',
          )}>
            {format(day, 'd')}
          </div>
          {isCurrentDay && (
            <div className="text-[8px] font-bold uppercase text-[#2a8c7a] mt-0.5 tracking-wider">Hoy</div>
          )}
        </div>

        {/* Task count + progress bar */}
        <div className="flex-1 min-w-0">
          {tasks.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#4a5565]">
                  {completed}/{tasks.length} tareas
                </span>
                <span className="text-[10px] font-bold" style={{ color: progressColor }}>{pct}%</span>
              </div>
              <div className="w-full bg-[#eef0f3] rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-1.5 rounded-full"
                  style={{ background: progressColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                />
              </div>
            </>
          ) : (
            <span className={clsx(
              'text-[11px] font-medium',
              isDragOver ? 'text-teal-500' : 'text-[#b0b8c4]',
            )}>
              {isDragOver ? 'Soltar aqui para mover' : 'Sin tareas programadas'}
            </span>
          )}
        </div>

        {/* Jump to day button */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
          className={clsx(
            'shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors min-h-[32px]',
            isCurrentDay
              ? 'text-[#2a8c7a] bg-[#ccebe3] hover:bg-[#b5e0d5]'
              : 'text-[#8b95a5] bg-[#f3f4f7] hover:bg-[#e8eaed] hover:text-[#4a5565]',
          )}
          title="Ver en vista de dia"
        >
          Ver dia
        </button>

        {/* Expand chevron */}
        {tasks.length > 0 && (
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.18 }}
            className="shrink-0 text-[#9ba3b2]"
          >
            <ChevronRight size={14} />
          </motion.div>
        )}
      </button>

      {/* Task list */}
      <AnimatePresence initial={false}>
        {expanded && tasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-[#f0f2f5]">
              {tasks.map((task, i) => (
                <CompactTaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  isToggling={togglingTaskId === task.id}
                  onToggle={onToggleTask}
                  draggable
                  isDragging={draggedTaskId === task.id}
                  onDragStart={(e) => onTaskDragStart(e, task, dayStr)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
