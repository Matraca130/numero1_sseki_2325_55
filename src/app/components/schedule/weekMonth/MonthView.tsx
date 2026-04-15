// ============================================================
// MonthView: full-width calendar grid + tasks for selected day +
// month-level stats card.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { format, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { TaskWithPlan } from './types';
import { DAY_HEADERS } from './types';
import { CompactTaskCard } from './CompactTaskCard';
import { MonthStatsBanner } from './MonthStatsBanner';

export interface MonthViewProps {
  allTasks: TaskWithPlan[];
  selectedDate: Date;
  currentDate: Date;
  daysInMonth: Date[];
  emptyDays: null[];
  togglingTaskId: string | null;
  onToggleTask: (planId: string, taskId: string) => void;
  onSelectDay: (date: Date) => void;
  onNavigateNewPlan: () => void;
}

export function MonthView({
  allTasks,
  selectedDate,
  currentDate,
  daysInMonth,
  emptyDays,
  togglingTaskId,
  onToggleTask,
  onSelectDay,
  onNavigateNewPlan,
}: MonthViewProps) {
  const monthStart = format(currentDate, 'yyyy-MM');

  const monthTasks = allTasks.filter(t => format(t.date, 'yyyy-MM') === monthStart);
  const monthCompleted = monthTasks.filter(t => t.completed).length;
  const monthMinutes = monthTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const tasksForSelected = allTasks.filter(t => isSameDay(t.date, selectedDate));
  const selectedCompleted = tasksForSelected.filter(t => t.completed).length;

  return (
    <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-4">
      {/* Month stats */}
      <MonthStatsBanner
        total={monthTasks.length}
        completed={monthCompleted}
        minutes={monthMinutes}
      />

      {/* Full-width calendar grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[14px] border border-[#ebedf0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4"
      >
        {/* Day headers */}
        <div className="grid grid-cols-7 text-center mb-2">
          {DAY_HEADERS.map(d => (
            <div key={d} className="text-[10px] font-bold text-[#9ba3b2] py-1 tracking-[0.25px]">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => <div key={`e-${i}`} />)}
          {daysInMonth.map((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayTasks = allTasks.filter(t => format(t.date, 'yyyy-MM-dd') === dayStr);
            const dayCompleted = dayTasks.filter(t => t.completed).length;
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDay = isToday(day);
            const hasTasks = dayTasks.length > 0;
            const allDone = hasTasks && dayCompleted === dayTasks.length;

            return (
              <motion.button
                key={i}
                onClick={() => onSelectDay(day)}
                whileTap={{ scale: 0.9 }}
                className={clsx(
                  'relative flex flex-col items-center justify-start py-1.5 px-1 rounded-[8px] min-h-[52px] transition-all',
                  isSelected
                    ? 'bg-[#1a2332] text-white shadow-md'
                    : isTodayDay
                      ? 'bg-[#2a8c7a]/10 text-[#2a8c7a]'
                      : 'hover:bg-[#f3f4f7] text-[#4a5268]',
                )}
              >
                {/* Date number */}
                <span className={clsx(
                  'text-[12px] font-bold leading-none',
                  isSelected ? 'text-white' : isTodayDay ? 'text-[#2a8c7a]' : 'text-[#4a5268]',
                )}>
                  {format(day, 'd')}
                </span>

                {/* Task indicators */}
                {hasTasks && (
                  <div className="mt-1.5 flex flex-col items-center gap-0.5 w-full px-1">
                    {/* Small progress bar */}
                    <div className={clsx(
                      'w-full rounded-full h-[3px] overflow-hidden',
                      isSelected ? 'bg-white/20' : 'bg-[#eef0f3]',
                    )}>
                      <motion.div
                        className="h-[3px] rounded-full"
                        style={{
                          background: isSelected
                            ? 'white'
                            : allDone
                              ? '#34D399'
                              : '#2a8c7a',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((dayCompleted / dayTasks.length) * 100)}%` }}
                        transition={{ duration: 0.4, delay: i * 0.01 }}
                      />
                    </div>
                    {/* Task count */}
                    <span className={clsx(
                      'text-[9px] font-semibold leading-none mt-0.5',
                      isSelected
                        ? 'text-white/70'
                        : allDone
                          ? 'text-[#34D399]'
                          : 'text-[#9ba3b2]',
                    )}>
                      {dayCompleted}/{dayTasks.length}
                    </span>
                  </div>
                )}

                {/* Today dot */}
                {isTodayDay && !isSelected && (
                  <div className="absolute top-1 right-1 w-[4px] h-[4px] rounded-full bg-[#2a8c7a]" />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Tasks for selected day */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        {/* Selected day header */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#1a2332] shrink-0" />
            <span className="text-[13px] font-semibold text-[#4a5565] capitalize truncate">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </span>
            {isToday(selectedDate) && (
              <span className="text-[9px] font-bold bg-[#2a8c7a] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Hoy
              </span>
            )}
          </div>
          {tasksForSelected.length > 0 && (
            <span className="text-[11px] text-[#9ba3b2]">
              {selectedCompleted}/{tasksForSelected.length} completadas
            </span>
          )}
        </div>

        {tasksForSelected.length > 0 ? (
          tasksForSelected.map((task, i) => (
            <CompactTaskCard
              key={task.id}
              task={task}
              index={i}
              isToggling={togglingTaskId === task.id}
              onToggle={onToggleTask}
            />
          ))
        ) : (
          <div className="flex flex-col items-center py-8 gap-3 bg-white rounded-[12px] border border-[#ebedf0]">
            <CalendarDays size={28} className="text-[#dfe2e8]" />
            <p className="text-[12px] text-[#9ba3b2]">Sin tareas para este día</p>
            <button
              onClick={onNavigateNewPlan}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-1.5 rounded-full hover:bg-[#ccebe3] transition-colors"
            >
              <Plus size={12} /> Crear plan
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
