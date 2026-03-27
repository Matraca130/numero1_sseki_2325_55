// ============================================================
// Axon — Study Plan Dashboard (when plans exist) — RESPONSIVE
// Restyled to match Figma v4.5 Cronograma design.
//
// RESPONSIVE CHANGES (Phase 1C):
//   1. Mobile (<lg): Tab-based UI replacing 3-column layout
//   2. Desktop (lg+): 3-column layout unchanged
//   3. Center top bar: stacks on mobile, shorter date format
//   4. Summary table: grid-cols-2 on mobile → grid-cols-4 desktop
//   5. Drag handle: hidden on mobile
//   6. Touch targets: min-h-[44px] on all interactive elements
//
// FIGMA RESTYLE (v4.5):
//   - Task cards: rounded-[14px], gradient left accent bar, green bg on complete
//   - Completion circle: animated SVG ring + checkmark
//   - Method tags: styled pills per method
//   - Task numbering: 01, 02... labels
//   - Summary card: 4-col grid with donut progress
//   - Motion animations: stagger, layout, AnimatePresence
// ============================================================
import React, { useState, useCallback, useMemo } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  BookOpen,
  Plus,
  GripVertical,
  ListTodo,
  BarChart3,
} from 'lucide-react';
import clsx from 'clsx';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  addDays,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { getAxonToday } from '@/app/utils/constants';
import { METHOD_ICONS, METHOD_LABELS, METHOD_COLORS } from '@/app/utils/studyMethodStyles';

// ── Extracted modules ──
import { PlanCalendarSidebar } from '@/app/components/schedule/PlanCalendarSidebar';
import { PlanProgressSidebar } from '@/app/components/schedule/PlanProgressSidebar';
import { WeekView, MonthView } from '@/app/components/schedule/WeekMonthViews';
import type { TaskWithPlan } from '@/app/components/schedule/WeekMonthViews';
import { DailyRecommendationCard } from '@/app/components/schedule/DailyRecommendationCard';
import { WeeklyInsightCard } from '@/app/components/schedule/WeeklyInsightCard';
import type { StudentProfilePayload } from '@/app/services/aiService';
import { useTopicMasteryContext } from '@/app/context/TopicMasteryContext';
import { useStudyTimeEstimatesContext } from '@/app/context/StudyTimeEstimatesContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';

// ── Types ──
type MobileTab = 'tasks' | 'calendar' | 'progress';

export interface StudyPlanDashboardProps {
  studyPlans: import('@/app/context/AppContext').StudyPlan[];
  toggleTaskComplete: (planId: string, taskId: string) => Promise<void>;
  reorderTasks: (planId: string, orderedIds: string[]) => Promise<void>;
  updatePlanStatus: (planId: string, status: 'active' | 'completed' | 'archived') => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
}

// ── Method tag styles matching Figma ──
const METHOD_TAG_FIGMA: Record<string, { bg: string; border: string; text: string; iconStroke: string }> = {
  flashcard: {
    bg: '#f0fdf6',
    border: 'rgba(198,240,223,0.8)',
    text: '#6ba88e',
    iconStroke: '#6ba88e',
  },
  quiz: {
    bg: 'linear-gradient(90deg, rgb(254,248,224), rgb(254,243,198))',
    border: 'rgba(253,230,138,0.6)',
    text: '#b45309',
    iconStroke: '#b45309',
  },
  video: {
    bg: '#eff6ff',
    border: 'rgba(191,219,254,0.8)',
    text: '#3b82f6',
    iconStroke: '#3b82f6',
  },
  resumo: {
    bg: '#faf5ff',
    border: 'rgba(221,214,254,0.8)',
    text: '#7c3aed',
    iconStroke: '#7c3aed',
  },
  '3d': {
    bg: '#fff7ed',
    border: 'rgba(254,215,170,0.8)',
    text: '#c2410c',
    iconStroke: '#c2410c',
  },
};

// ── Animated Completion Circle ──
function CompletionCircle({ completed, onClick }: { completed: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      className="relative shrink-0 w-[28px] h-[28px] flex items-center justify-center rounded-full"
      aria-label={completed ? 'Marcar incompleto' : 'Marcar completo'}
    >
      <svg viewBox="0 0 22 22" width="22" height="22" fill="none">
        <motion.circle
          cx="11" cy="11" r="9.5"
          stroke={completed ? '#34D399' : '#DFE2E8'}
          strokeWidth="1.5"
          fill={completed ? '#34D399' : 'none'}
          initial={false}
          animate={{ stroke: completed ? '#34D399' : '#DFE2E8', fill: completed ? '#34D399' : 'none' }}
          transition={{ duration: 0.25 }}
        />
        <AnimatePresence>
          {completed && (
            <motion.path
              d="M7 11L10 14L15 8"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </svg>
    </motion.button>
  );
}

// ── Method Tag ──
function MethodTag({ method }: { method: string }) {
  const key = method?.toLowerCase?.() ?? '';
  const style = METHOD_TAG_FIGMA[key];
  const icon = METHOD_ICONS[key] || METHOD_ICONS[method];

  if (!style) {
    return (
      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0', METHOD_COLORS[method] || 'bg-gray-100 text-gray-600 border-gray-200')}>
        {icon}
        <span>{METHOD_LABELS[method] || method}</span>
      </span>
    );
  }

  const isGradient = style.bg.startsWith('linear');
  return (
    <span
      className="text-[10px] px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1.5 shrink-0 relative"
      style={{
        background: isGradient ? style.bg : style.bg,
        borderColor: style.border,
        color: style.text,
      }}
    >
      <span style={{ color: style.iconStroke, display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span>{METHOD_LABELS[method] || method}</span>
    </span>
  );
}

// ── Duration pill ──
function DurationPill({ minutes, completed }: { minutes: number; completed: boolean }) {
  return (
    <div className={clsx(
      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium',
      completed ? 'bg-[rgba(248,249,251,0.8)] opacity-60' : 'bg-[#f5f6f8]',
    )}>
      <Clock size={10} className={completed ? 'text-[#c0c6d0]' : 'text-[#9ba3b2]'} />
      <span className={clsx('font-medium', completed ? 'line-through text-[#c0c6d0]' : 'text-[#9ba3b2]')}>
        {minutes}m
      </span>
    </div>
  );
}

// ── Day Summary Card ──
function DaySummaryCard({ todayCompleted, todayTotal, todayMinutes, todayProgress }: {
  todayCompleted: number;
  todayTotal: number;
  todayMinutes: number;
  todayProgress: number;
}) {
  const h = Math.floor(todayMinutes / 60);
  const m = todayMinutes % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  const progressColor = todayProgress >= 80 ? '#34D399' : todayProgress >= 40 ? '#d97706' : '#f87171';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-[14px] border border-[#ebedf0] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.03)] overflow-hidden"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {/* Resumen */}
        <div
          className="px-5 py-4 flex items-center gap-3 col-span-2 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-[#eef0f3]"
          style={{ background: 'linear-gradient(90deg, rgb(230,245,241) 0%, rgb(237,248,245) 100%)' }}
        >
          <BookOpen size={13} className="text-[#1b3b36] shrink-0" />
          <div>
            <p className="font-semibold text-[13px] text-[#1b3b36] leading-[1.3]">Resumen del día</p>
            <p className="text-[10px] text-[#5a9485] leading-[1.3]">
              {todayCompleted > 0 ? 'Buen avance, continúa' : 'Empieza cuando estés listo'}
            </p>
          </div>
        </div>
        {/* Tiempo */}
        <div className="flex flex-col items-center justify-center px-4 py-4 border-r border-[#eef0f3]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9ba3b2]">Tiempo</span>
          <span className="font-bold text-[14px] text-[#3a4455] mt-0.5">{timeStr}</span>
        </div>
        {/* Tareas */}
        <div className="flex flex-col items-center justify-center px-4 py-4 border-r border-[#eef0f3]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9ba3b2]">Tareas</span>
          <span className="font-bold text-[14px] text-[#3a4455] mt-0.5">{todayCompleted}/{todayTotal}</span>
        </div>
        {/* Progress donut */}
        <div className="flex items-center justify-center px-4 py-3 gap-3">
          <div className="relative flex items-center justify-center" style={{ width: 34, height: 34 }}>
            <svg viewBox="0 0 34 34" width="34" height="34" className="-rotate-90">
              <circle cx="17" cy="17" r="14" stroke="#EEF0F3" strokeWidth="3" fill="none" />
              <circle
                cx="17" cy="17" r="14"
                stroke={progressColor}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(todayProgress / 100) * 87.96} 87.96`}
              />
            </svg>
          </div>
          <span className="font-bold text-[14px]" style={{ color: progressColor }}>{todayProgress}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export function StudyPlanDashboard({
  studyPlans,
  toggleTaskComplete,
  reorderTasks,
  updatePlanStatus,
  deletePlan,
}: StudyPlanDashboardProps) {
  const { navigateTo } = useStudentNav();
  const isMobile = useIsMobile();

  const [currentDate, setCurrentDate] = useState(getAxonToday());
  const [selectedDate, setSelectedDate] = useState<Date>(getAxonToday());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [mobileTab, setMobileTab] = useState<MobileTab>('tasks');
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  // Real data from contexts (replaces hardcoded mastery in studentProfile)
  const { topicMastery } = useTopicMasteryContext();
  const { summary: timeSummary } = useStudyTimeEstimatesContext();
  const studentDataCtx = useStudentDataContext();

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const nextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const prevDay = () => setSelectedDate(prev => subDays(prev, 1));

  const allTasks = studyPlans.flatMap(plan =>
    plan.tasks.map(task => ({ ...task, planId: plan.id }))
  );

  const tasksForDate = allTasks.filter(t => isSameDay(t.date, selectedDate));

  const daysWithTasks = new Set(
    allTasks.map(t => format(t.date, 'yyyy-MM-dd'))
  );

  const tasksBySubject: Record<string, typeof tasksForDate> = {};
  for (const task of tasksForDate) {
    if (!tasksBySubject[task.subject]) tasksBySubject[task.subject] = [];
    tasksBySubject[task.subject].push(task);
  }

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayTotalMinutes = tasksForDate.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const todayCompleted = tasksForDate.filter(t => t.completed).length;
  const todayProgress = tasksForDate.length > 0 ? Math.round((todayCompleted / tasksForDate.length) * 100) : 0;

  // ── Build student profile from real context data for AI cards ──
  const studentProfile = useMemo<StudentProfilePayload | null>(() => {
    if (studyPlans.length === 0) return null;

    // Use real mastery data from TopicMasteryContext
    const masteryRecord: StudentProfilePayload['topicMastery'] = {};
    topicMastery.forEach((info, topicId) => {
      masteryRecord[topicId] = {
        masteryPercent: info.masteryPercent,
        pKnow: info.pKnow,
        needsReview: info.needsReview,
        totalAttempts: info.totalAttempts,
        priorityScore: info.priorityScore,
      };
    });

    // Fallback: if no mastery data yet, build from plan tasks
    if (Object.keys(masteryRecord).length === 0) {
      for (const plan of studyPlans) {
        for (const task of plan.tasks) {
          const key = task.subject || task.title;
          if (!masteryRecord[key]) {
            masteryRecord[key] = {
              masteryPercent: task.completed ? 70 : 20,
              pKnow: null,
              needsReview: !task.completed,
              totalAttempts: task.completed ? 1 : 0,
              priorityScore: task.completed ? 0.3 : 0.8,
            };
          }
        }
      }
    }

    const methodsSet = new Set<string>();
    for (const plan of studyPlans) {
      for (const task of plan.tasks) {
        if (task.method) methodsSet.add(task.method);
      }
    }

    const ctxDailyActivity = studentDataCtx?.dailyActivity ?? [];
    const ctxStats = studentDataCtx?.stats ?? null;

    return {
      topicMastery: masteryRecord,
      sessionHistory: [],
      dailyActivity: ctxDailyActivity.map(d => ({
        date: d.date ?? '',
        studyMinutes: d.studyMinutes ?? 0,
        sessionsCount: d.sessionsCount ?? 0,
      })),
      stats: {
        totalStudyMinutes: ctxStats?.totalStudyMinutes ?? 0,
        totalSessions: ctxStats?.totalSessions ?? 0,
        currentStreak: ctxStats?.currentStreak ?? 0,
        avgMinutesPerSession: timeSummary.avgMinutesPerSession,
      },
      studyMethods: Array.from(methodsSet),
    };
  }, [studyPlans, topicMastery, studentDataCtx?.dailyActivity, studentDataCtx?.stats, timeSummary]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleToggleTask = async (planId: string, taskId: string) => {
    setTogglingTaskId(taskId);
    await toggleTaskComplete(planId, taskId);
    setTogglingTaskId(null);
  };

  // Drag & drop handlers
  const handleDragStart = useCallback((taskId: string) => {
    setDraggedTaskId(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (taskId !== draggedTaskId) {
      setDragOverTaskId(taskId);
    }
  }, [draggedTaskId]);

  const handleDrop = useCallback((e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }
    const draggedTask = tasksForDate.find(t => t.id === draggedTaskId);
    const targetTask = tasksForDate.find(t => t.id === targetTaskId);
    if (draggedTask && targetTask && draggedTask.planId === targetTask.planId) {
      const plan = studyPlans.find(p => p.id === draggedTask.planId);
      if (plan) {
        const planTaskIds = plan.tasks.map(t => t.id);
        const fromIdx = planTaskIds.indexOf(draggedTaskId);
        const toIdx = planTaskIds.indexOf(targetTaskId);
        if (fromIdx >= 0 && toIdx >= 0) {
          const newOrder = [...planTaskIds];
          newOrder.splice(fromIdx, 1);
          newOrder.splice(toIdx, 0, draggedTaskId);
          reorderTasks(draggedTask.planId, newOrder);
        }
      }
    }
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  }, [draggedTaskId, tasksForDate, studyPlans, reorderTasks]);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  }, []);

  const handlePlanAction = useCallback(async (planId: string, action: 'completed' | 'archived' | 'delete') => {
    if (action === 'delete') {
      await deletePlan(planId);
    } else {
      await updatePlanStatus(planId, action);
    }
  }, [deletePlan, updatePlanStatus]);

  // ── Shared sidebar props ──
  const calendarSidebarProps = {
    currentDate,
    selectedDate,
    daysInMonth,
    emptyDays,
    daysWithTasks,
    plansCount: studyPlans.length,
    onSelectDate: setSelectedDate,
    onPrevMonth: prevMonth,
    onNextMonth: nextMonth,
  };

  const progressSidebarProps = {
    studyPlans,
    progressPercent,
    completedTasks,
    totalTasks,
    onNavigateNewPlan: () => navigateTo('organize-study'),
    onNavigateEditPlan: (planId: string) => navigateTo('organize-study', { search: `edit=${planId}` }),
    onPlanAction: handlePlanAction,
  };

  // ── Task list with Figma-style cards ──
  const renderTasksPanel = () => {
    // Flatten tasksForDate for sequential numbering
    const flatTasks = Object.values(tasksBySubject).flat();

    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8f9fb]">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
          {/* View tabs */}
          <div className="flex items-center gap-0 bg-[#f3f4f7] p-1 rounded-[10px] self-start">
            {(['day', 'week', 'month'] as const).map((v) => (
              <motion.button
                key={v}
                onClick={() => setViewMode(v)}
                className={clsx(
                  'px-4 py-[7px] min-h-[31px] rounded-[8px] text-[11.5px] font-semibold transition-all tracking-[0.2px]',
                  viewMode === v
                    ? 'bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.06)] text-[#0f1724]'
                    : 'text-[#8b95a5] hover:text-[#4a5565]'
                )}
                whileTap={{ scale: 0.97 }}
              >
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </motion.button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <motion.button
              onClick={prevDay}
              whileTap={{ scale: 0.9 }}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg text-[#8b95a5]"
            >
              <ChevronLeft size={15} />
            </motion.button>

            <div className="flex items-center gap-1.5 px-2">
              <span className="font-semibold text-[#8b95a5] text-[12px] tracking-[0.2px]">
                {isMobile
                  ? format(selectedDate, "EEE", { locale: es })
                  : format(selectedDate, "EEEE", { locale: es })
                }
              </span>
              <span className="font-bold text-[#1a2332] text-[17px] leading-none">
                {format(selectedDate, 'd')}
              </span>
              <span className="text-[#9ba3b2] text-[12px] font-medium">
                {isMobile
                  ? format(selectedDate, "MMM", { locale: es })
                  : `de ${format(selectedDate, "MMMM", { locale: es })}`
                }
              </span>
              {isToday(selectedDate) && (
                <span className="w-2 h-2 bg-[#2a8c7a] rounded-full shrink-0" />
              )}
            </div>

            <button
              onClick={() => setSelectedDate(getAxonToday())}
              className="text-[11px] font-semibold text-[#2a8c7a] hover:text-[#1B3B36] px-2 py-1 min-h-[36px] rounded-md hover:bg-[#e6f5f1] transition-colors"
            >
              Hoy
            </button>

            <motion.button
              onClick={nextDay}
              whileTap={{ scale: 0.9 }}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg text-[#8b95a5]"
            >
              <ChevronRight size={15} />
            </motion.button>
          </div>

          <button className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-2 rounded-full hover:bg-[#ccebe3] transition-colors">
            <Plus size={13} />
            Material personalizado
          </button>
        </div>

        {/* Tasks scroll area */}
        {viewMode === 'day' ? (
        <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5">
          {tasksForDate.length > 0 ? (
            <>
              {/* AI Daily Recommendations */}
              <DailyRecommendationCard studentProfile={studentProfile} />

              {Object.entries(tasksBySubject).map(([subject, tasks]) => {
                const subjectStartIndex = flatTasks.findIndex(t => t.subject === subject);
                return (
                  <div key={subject} className="space-y-2">
                    {/* Subject header */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className={clsx('w-2 h-2 rounded-[3px]', tasks[0]?.subjectColor || 'bg-[#6b7385]')} />
                      <span className="text-[13px] font-semibold text-[#4a5565] tracking-[0.2px]">{subject}</span>
                      <span className="text-[10px] text-[#b0b8c4] font-medium">{tasks.filter(t => t.completed).length}/{tasks.length}</span>
                      <div
                        className="flex-1 h-px ml-1"
                        style={{ background: 'linear-gradient(90deg, rgb(232,234,237), rgba(0,0,0,0))' }}
                      />
                    </div>

                    {tasks.map((task, localIdx) => {
                      const globalIdx = subjectStartIndex + localIdx;
                      const isExpanded = expandedTasks.has(task.id);
                      const isToggling = togglingTaskId === task.id;

                      return (
                        <div key={task.id} className="relative flex items-start gap-1">
                          {/* Task number */}
                          <div className="absolute left-0 top-[22px] text-[10px] text-[#d1d5dc] font-medium w-7 text-right tabular-nums select-none">
                            {String(globalIdx + 1).padStart(2, '0')}
                          </div>

                          {/* Card */}
                          <motion.div
                            layout
                            draggable={!isMobile}
                            onDragStart={!isMobile ? () => handleDragStart(task.id) : undefined}
                            onDragOver={!isMobile ? (e) => handleDragOver(e, task.id) : undefined}
                            onDrop={!isMobile ? (e) => handleDrop(e, task.id) : undefined}
                            onDragEnd={!isMobile ? handleDragEnd : undefined}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: isToggling ? 0.5 : 1, y: 0 }}
                            transition={{ delay: globalIdx * 0.06, duration: 0.25 }}
                            className={clsx(
                              'ml-9 flex-1 rounded-[14px] border overflow-hidden relative transition-shadow',
                              task.completed
                                ? 'border-[#c6f0df] shadow-[0px_1px_3px_0px_rgba(52,211,153,0.05)]'
                                : 'border-[#ebedf0] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.02)] hover:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.05)]',
                              draggedTaskId === task.id && 'opacity-40 scale-[0.97]',
                              dragOverTaskId === task.id && draggedTaskId !== task.id && 'border-[#2a8c7a] ring-1 ring-[#2a8c7a]/20',
                              isToggling && 'pointer-events-none',
                            )}
                            style={task.completed ? {
                              background: 'linear-gradient(90deg, rgb(250,255,254) 0%, rgb(255,255,255) 100%)',
                            } : undefined}
                          >
                            {/* Left accent bar */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-[3px]"
                              style={{
                                background: task.completed
                                  ? 'linear-gradient(to bottom, rgb(52,211,153), rgb(42,140,122))'
                                  : 'linear-gradient(to bottom, rgb(229,231,235), rgb(223,226,232))',
                              }}
                            />

                            {/* Main row */}
                            <div className="pl-5 pr-4 py-[18px] flex items-center gap-3">
                              {/* Drag handle — desktop only */}
                              <div className="hidden lg:block cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 shrink-0 touch-none opacity-50">
                                <GripVertical size={14} />
                              </div>

                              {/* Completion circle */}
                              <CompletionCircle
                                completed={task.completed}
                                onClick={() => handleToggleTask(task.planId, task.id)}
                              />

                              {/* Title + method */}
                              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                <span className={clsx(
                                  'text-[14px] font-semibold leading-[1.4] transition-colors truncate',
                                  task.completed ? 'line-through text-[#b0b8c4]' : 'text-[#1a2332]',
                                )}>
                                  {task.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <MethodTag method={task.method} />
                                </div>
                              </div>

                              {/* Duration + expand */}
                              <div className="flex items-center gap-2 shrink-0">
                                <DurationPill minutes={task.estimatedMinutes} completed={task.completed} />
                                <motion.button
                                  onClick={() => toggleExpand(task.id)}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#9ba3b2] hover:text-[#4a5565] transition-colors rounded-lg hover:bg-gray-50"
                                >
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown size={15} />
                                  </motion.div>
                                </motion.button>
                              </div>
                            </div>

                            {/* Expanded detail */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-4 pt-1 border-t border-gray-100 text-sm text-gray-500 flex flex-wrap items-center gap-3">
                                    <span className="flex items-center gap-1 text-[12px]">
                                      <BookOpen size={12} /> {task.subject}
                                    </span>
                                    <span className="flex items-center gap-1 text-[12px]">
                                      <Clock size={12} /> {task.estimatedMinutes} min estimados
                                    </span>
                                    <button
                                      onClick={() => {/* Navigate to study */}}
                                      className="ml-auto text-[11px] font-bold text-[#2a8c7a] hover:text-[#1B3B36] bg-[#e6f5f1] px-3 py-1.5 min-h-[36px] rounded-full transition-colors hover:bg-[#ccebe3]"
                                    >
                                      Iniciar Estudio
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Agregar tarea — dashed button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="ml-9"
              >
                <button className="w-full flex items-center justify-center gap-2 py-4 rounded-[14px] border border-dashed border-[#e2e5ea] text-[#9ba3b2] hover:text-[#4a5565] hover:border-[#b0b8c4] transition-all text-[13px] font-medium hover:bg-white/60">
                  <Plus size={14} />
                  Agregar tarea
                </button>
              </motion.div>

              {/* Day summary card */}
              <div className="ml-9">
                <DaySummaryCard
                  todayCompleted={todayCompleted}
                  todayTotal={tasksForDate.length}
                  todayMinutes={todayTotalMinutes}
                  todayProgress={todayProgress}
                />
              </div>

              {/* AI Weekly Insight */}
              <WeeklyInsightCard studentProfile={studentProfile} />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 text-[#9ba3b2]"
            >
              <CalendarIcon size={40} className="mb-3 text-[#dfe2e8]" />
              <p className="font-semibold text-[#4a5565] text-[13px]">Ninguna tarea para este día</p>
              <p className="text-[12px] mt-1 text-center px-4 text-[#9ba3b2]">
                Selecciona otro día en el calendario o crea un nuevo plan.
              </p>
              <button
                onClick={() => navigateTo('organize-study')}
                className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-4 py-2 rounded-full hover:bg-[#ccebe3] transition-colors"
              >
                <Plus size={14} /> Crear plan
              </button>
            </motion.div>
          )}
        </div>
        ) : viewMode === 'week' ? (
          <WeekView
            allTasks={allTasks as TaskWithPlan[]}
            selectedDate={selectedDate}
            togglingTaskId={togglingTaskId}
            onToggleTask={handleToggleTask}
            onSelectDay={(day) => { setSelectedDate(day); setViewMode('day'); }}
            onNavigateNewPlan={() => navigateTo('organize-study')}
          />
        ) : (
          <MonthView
            allTasks={allTasks as TaskWithPlan[]}
            selectedDate={selectedDate}
            currentDate={currentDate}
            daysInMonth={daysInMonth}
            emptyDays={emptyDays}
            togglingTaskId={togglingTaskId}
            onToggleTask={handleToggleTask}
            onSelectDay={setSelectedDate}
            onNavigateNewPlan={() => navigateTo('organize-study')}
          />
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-dashboard">
      {/* AXON Page Header */}
      <div className="shrink-0">
        <AxonPageHeader
          title="Cronograma"
          subtitle="Plan de Estudios Activo"
          statsLeft={
            <p className="text-gray-500 text-sm">
              <span className="font-semibold text-[#1a2332]">{completedTasks}</span> de <span className="font-semibold text-[#1a2332]">{totalTasks}</span>
              &nbsp;<span className="text-[#34D399] font-semibold">{progressPercent}%</span> completo
            </p>
          }
          statsRight={
            <div className="hidden md:flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-500"><span className="text-emerald-600 font-semibold">{completedTasks}</span> completadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-gray-500"><span className="text-amber-600 font-semibold">{tasksForDate.length}</span> para hoy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2a8c7a]" />
                <span className="text-xs text-gray-500"><span className="text-[#2a8c7a] font-semibold">{studyPlans.length}</span> planes</span>
              </div>
            </div>
          }
          actionButton={
            <button
              onClick={() => navigateTo('organize-study')}
              className="flex items-center gap-2 px-4 lg:px-6 py-2.5 min-h-[44px] bg-[#1B3B36] hover:bg-[#244e47] rounded-full text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0"
            >
              <Plus size={15} /> <span className="hidden sm:inline">Nuevo Plan</span><span className="sm:hidden">Nuevo</span>
            </button>
          }
        />
      </div>

      {/* ── Mobile Tab Bar ── */}
      {isMobile && (
        <div className="shrink-0 bg-white border-b border-gray-200 flex">
          {([
            { key: 'tasks' as MobileTab, label: 'Tareas', icon: <ListTodo size={16} />, count: tasksForDate.length },
            { key: 'calendar' as MobileTab, label: 'Calendario', icon: <CalendarIcon size={16} />, count: undefined },
            { key: 'progress' as MobileTab, label: 'Progreso', icon: <BarChart3 size={16} />, count: undefined },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMobileTab(tab.key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 min-h-[48px] text-sm font-semibold transition-all border-b-2',
                mobileTab === tab.key
                  ? 'text-[#1B3B36] border-[#2a8c7a] bg-[#e6f5f1]/30'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] font-bold bg-[#2a8c7a] text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Content Area ── */}
      {isMobile ? (
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileTab === 'tasks' && (
              <motion.div key="tasks" className="h-full" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
                {renderTasksPanel()}
              </motion.div>
            )}
            {mobileTab === 'calendar' && (
              <motion.div key="calendar" className="h-full overflow-y-auto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
                <PlanCalendarSidebar {...calendarSidebarProps} embedded />
              </motion.div>
            )}
            {mobileTab === 'progress' && (
              <motion.div key="progress" className="h-full overflow-y-auto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
                <PlanProgressSidebar {...progressSidebarProps} embedded />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Desktop: 3-column layout */
        <div className="flex flex-1 w-full overflow-hidden">
          <PlanCalendarSidebar {...calendarSidebarProps} />
          {renderTasksPanel()}
          <PlanProgressSidebar {...progressSidebarProps} />
        </div>
      )}
    </div>
  );
}
