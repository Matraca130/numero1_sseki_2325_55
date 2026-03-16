// ============================================================
// Axon — Week & Month View Components for StudyPlanDashboard
//
// WeekView: 7-day vertical strip with compact task cards,
//   per-day progress, week summary stats.
// MonthView: Full-width calendar grid + tasks for selected day +
//   month-level stats card.
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isSameDay, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Clock,
  CalendarDays,
  CheckCircle2,
  Timer,
  TrendingUp,
  Plus,
  ChevronRight,
  Video,
  Zap,
  GraduationCap,
  FileText,
  Box,
} from 'lucide-react';
import clsx from 'clsx';
import type { StudyPlanTask } from '@/app/types/study-plan';

// ── Shared type ───────────────────────────────────────────────
export type TaskWithPlan = StudyPlanTask & { planId: string };

// ── Method icons at compact size ─────────────────────────────
const COMPACT_METHOD_ICONS: Record<string, React.ReactNode> = {
  video:     <Video size={9} />,
  flashcard: <Zap size={9} />,
  quiz:      <GraduationCap size={9} />,
  resumo:    <FileText size={9} />,
  '3d':      <Box size={9} />,
};

const METHOD_LABELS: Record<string, string> = {
  video: 'Video', flashcard: 'Flashcards', quiz: 'Quiz', resumo: 'Resumen', '3d': 'Atlas 3D',
};

const METHOD_PILL: Record<string, { bg: string; text: string; border: string }> = {
  flashcard: { bg: '#f0fdf6', text: '#6ba88e', border: 'rgba(198,240,223,0.8)' },
  quiz:      { bg: '#fefce8', text: '#b45309', border: 'rgba(253,230,138,0.6)' },
  video:     { bg: '#eff6ff', text: '#3b82f6', border: 'rgba(191,219,254,0.8)' },
  resumo:    { bg: '#faf5ff', text: '#7c3aed', border: 'rgba(221,214,254,0.8)' },
  '3d':      { bg: '#fff7ed', text: '#c2410c', border: 'rgba(254,215,170,0.8)' },
};

function CompactMethodPill({ method }: { method: string }) {
  const key = method?.toLowerCase?.() ?? '';
  const style = METHOD_PILL[key];
  const icon = COMPACT_METHOD_ICONS[key];
  if (!style) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0 bg-gray-100 text-gray-600 border-gray-200">
        {icon}
        <span>{METHOD_LABELS[key] || method}</span>
      </span>
    );
  }
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0"
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
    >
      <span style={{ color: style.text, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span>{METHOD_LABELS[key] || method}</span>
    </span>
  );
}

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

// ── Compact task card (used in week & month views) ────────────
function CompactTaskCard({
  task,
  index,
  isToggling,
  onToggle,
  onGoToDay,
}: {
  task: TaskWithPlan;
  index: number;
  isToggling: boolean;
  onToggle: (planId: string, taskId: string) => void;
  onGoToDay?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isToggling ? 0.5 : 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-[10px] border relative overflow-hidden',
        task.completed
          ? 'border-[#c6f0df] bg-gradient-to-r from-[#f6fffb] to-white'
          : 'border-[#ebedf0] bg-white hover:border-[#d0d4db] hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
        isToggling && 'pointer-events-none',
      )}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-l-[10px]"
        style={{
          background: task.completed
            ? 'linear-gradient(to bottom, #34D399, #2a8c7a)'
            : 'linear-gradient(to bottom, #e5e7eb, #dfe2e8)',
        }}
      />

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
            title="Ver en día"
          >
            <ChevronRight size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEEK VIEW
// ─────────────────────────────────────────────────────────────

interface WeekViewProps {
  allTasks: TaskWithPlan[];
  selectedDate: Date;
  togglingTaskId: string | null;
  onToggleTask: (planId: string, taskId: string) => void;
  onSelectDay: (date: Date) => void;  // switches to day view
  onNavigateNewPlan: () => void;
}

function WeekSummaryBar({
  total, completed, minutes,
}: { total: number; completed: number; minutes: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const color = pct >= 80 ? '#34D399' : pct >= 40 ? '#d97706' : '#f87171';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[12px] border border-[#ebedf0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4 flex items-center gap-4"
    >
      <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 divide-x divide-[#eef0f3]">
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-[#8b95a5]"><CheckCircle2 size={11} /><span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">Hechas</span></div>
          <span className="font-bold text-[13px] text-[#3a4455]">{completed}<span className="text-[10px] font-normal text-[#9ba3b2]">/{total}</span></span>
        </div>
        <div className="flex flex-col items-center gap-0.5 pl-2 sm:pl-3">
          <div className="flex items-center gap-1 text-[#8b95a5]"><Timer size={11} /><span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">Tiempo</span></div>
          <span className="font-bold text-[13px] text-[#3a4455]">{timeStr}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 pl-2 sm:pl-3">
          <div className="flex items-center gap-1 text-[#8b95a5]"><TrendingUp size={11} /><span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">Avance</span></div>
          <span className="font-bold text-[13px]" style={{ color }}>{pct}%</span>
        </div>
      </div>
      {/* Mini ring — hidden on very small screens */}
      <div className="shrink-0 relative hidden sm:block" style={{ width: 36, height: 36 }}>
        <svg viewBox="0 0 36 36" width="36" height="36" className="-rotate-90">
          <circle cx="18" cy="18" r="14" stroke="#EEF0F3" strokeWidth="3" fill="none" />
          <motion.circle
            cx="18" cy="18" r="14"
            stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"
            initial={{ strokeDasharray: '0 87.96' }}
            animate={{ strokeDasharray: `${(pct / 100) * 87.96} 87.96` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#3a4455]">
          {pct}%
        </span>
      </div>
    </motion.div>
  );
}

function WeekDayRow({
  day,
  tasks,
  isSelected,
  isCurrentDay,
  index,
  togglingTaskId,
  onToggleTask,
  onSelectDay,
}: {
  day: Date;
  tasks: TaskWithPlan[];
  isSelected: boolean;
  isCurrentDay: boolean;
  index: number;
  togglingTaskId: string | null;
  onToggleTask: (planId: string, taskId: string) => void;
  onSelectDay: (date: Date) => void;
}) {
  const completed = tasks.filter(t => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const progressColor = pct >= 80 ? '#34D399' : pct >= 40 ? '#d97706' : '#f87171';
  const [expanded, setExpanded] = React.useState(isCurrentDay || isSelected);

  // Expand when the day becomes selected
  React.useEffect(() => {
    if (isSelected || isCurrentDay) setExpanded(true);
  }, [isSelected, isCurrentDay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={clsx(
        'rounded-[12px] border overflow-hidden transition-shadow',
        isCurrentDay
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
          isCurrentDay
            ? 'bg-gradient-to-r from-[#e6f5f1] to-[#f0f9f7]'
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
            <span className="text-[11px] text-[#b0b8c4] font-medium">Sin tareas programadas</span>
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
          title="Ver en vista de día"
        >
          Ver día
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
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function WeekView({
  allTasks,
  selectedDate,
  togglingTaskId,
  onToggleTask,
  onSelectDay,
  onNavigateNewPlan,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekTasks = allTasks.filter(t => {
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
        const dayTasks = allTasks.filter(t => isSameDay(t.date, day));
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
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-4 py-2 rounded-lg hover:bg-[#ccebe3] transition-colors"
          >
            <Plus size={13} /> Crear plan
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────────────────────────────

const DAY_HEADERS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

interface MonthViewProps {
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

function MonthStatsBanner({
  total, completed, minutes,
}: { total: number; completed: number; minutes: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const color = pct >= 80 ? '#34D399' : pct >= 40 ? '#d97706' : '#f87171';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3"
    >
      {[
        { icon: <CheckCircle2 size={12} />, label: 'Tareas', value: `${completed}/${total}`, color: '#2a8c7a' },
        { icon: <Timer size={12} />, label: 'Tiempo total', value: timeStr, color: '#3a4455' },
        { icon: <TrendingUp size={12} />, label: 'Progreso', value: `${pct}%`, color },
      ].map((stat, i) => (
        <div
          key={i}
          className="bg-white rounded-[10px] border border-[#ebedf0] px-3 py-3 flex flex-col items-center gap-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-1.5 text-[#8b95a5]">
            {stat.icon}
            <span className="text-[10px] font-semibold uppercase tracking-wider">{stat.label}</span>
          </div>
          <span className="font-bold text-[14px]" style={{ color: stat.color }}>{stat.value}</span>
        </div>
      ))}
    </motion.div>
  );
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
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-1.5 rounded-lg hover:bg-[#ccebe3] transition-colors"
            >
              <Plus size={12} /> Crear plan
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
