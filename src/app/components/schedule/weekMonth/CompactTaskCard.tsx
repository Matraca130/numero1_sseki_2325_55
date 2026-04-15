// ============================================================
// Compact task row used by both Week and Month views.
// Supports drag start, drop, toggle, and optional "go to day".
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronRight, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { gradients } from '@/app/design-system';
import type { TaskWithPlan } from './types';
import { CompactMethodPill } from './CompactMethodPill';

// ── Compact completion circle ─────────────────────────────────
function SmallCircle({ completed, onClick }: { completed: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      className="shrink-0 w-[44px] h-[44px] flex items-center justify-center"
    >
      <svg viewBox="0 0 18 18" width="18" height="18" fill="none">
        <motion.circle
          cx="9" cy="9" r="7.5"
          stroke={completed ? '#34D399' : '#DFE2E8'}
          strokeWidth="1.5"
          fill={completed ? '#34D399' : 'none'}
          animate={{ stroke: completed ? '#34D399' : '#DFE2E8', fill: completed ? '#34D399' : 'none' }}
          transition={{ duration: 0.2 }}
        />
        <AnimatePresence>
          {completed && (
            <motion.path
              d="M5.5 9L8 11.5L12.5 6.5"
              stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>
      </svg>
    </motion.button>
  );
}

export function CompactTaskCard({
  task,
  index,
  isToggling,
  onToggle,
  onGoToDay,
  draggable: isDraggable,
  onDragStart,
  isDragging,
}: {
  task: TaskWithPlan;
  index: number;
  isToggling: boolean;
  onToggle: (planId: string, taskId: string) => void;
  onGoToDay?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.35 : isToggling ? 0.5 : 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      draggable={isDraggable}
      onDragStart={onDragStart}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-[10px] border relative overflow-hidden',
        task.completed
          ? `border-[#c6f0df] ${gradients.scheduleCompletedRow.tw}`
          : 'border-[#ebedf0] bg-white hover:border-[#d0d4db] hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
        isToggling && 'pointer-events-none',
        isDraggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'scale-[0.97]',
      )}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-l-[10px]"
        style={{
          background: task.completed
            ? gradients.scheduleBarActive.css
            : gradients.scheduleBarInactive.css,
        }}
      />

      {/* Drag grip — only when draggable */}
      {isDraggable && (
        <div className="shrink-0 text-gray-300 hover:text-gray-400 ml-1 touch-none">
          <GripVertical size={12} />
        </div>
      )}

      <SmallCircle
        completed={task.completed}
        onClick={() => onToggle(task.planId, task.id)}
      />

      {/* Title */}
      <span className={clsx(
        'flex-1 min-w-0 text-[12px] font-medium truncate',
        task.completed ? 'line-through text-[#b0b8c4]' : 'text-[#1a2332]',
      )}>
        {task.title}
      </span>

      {/* Meta */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CompactMethodPill method={task.method} />
        <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-[#9ba3b2] font-medium">
          <Clock size={9} />
          {task.estimatedMinutes}m
        </span>
        {onGoToDay && (
          <button
            onClick={onGoToDay}
            className="p-1 rounded-md hover:bg-gray-100 text-[#c0c6d0] hover:text-[#4a5565] transition-colors"
            title="Ver en dia"
          >
            <ChevronRight size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
