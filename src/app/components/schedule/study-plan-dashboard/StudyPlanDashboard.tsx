/**
 * StudyPlanDashboard — Main component.
 * State management, task rendering, drag-and-drop, AI profile building.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown,
  Clock, BookOpen, Plus, GripVertical, AlertTriangle, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { gradients } from '@/app/design-system';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, addDays, subDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAxonToday } from '@/app/utils/constants';
import { WeekView, MonthView } from '@/app/components/schedule/WeekMonthViews';
import type { TaskWithPlan } from '@/app/components/schedule/WeekMonthViews';
import { DailyRecommendationCard } from '@/app/components/schedule/DailyRecommendationCard';
import { WeeklyInsightCard } from '@/app/components/schedule/WeeklyInsightCard';
import type { StudentProfilePayload } from '@/app/services/aiService';
import { useTopicMasteryContext } from '@/app/context/TopicMasteryContext';
import { useStudyTimeEstimatesContext } from '@/app/context/StudyTimeEstimatesContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { CompletionCircle, MethodTag, DurationPill } from './CompletionIndicators';
import { DaySummaryCard } from './DaySummaryCard';
import { DashboardLayout } from './DashboardLayout';

type MobileTab = 'tasks' | 'calendar' | 'progress';

export interface StudyPlanDashboardProps {
  studyPlans: import('@/app/context/AppContext').StudyPlan[];
  toggleTaskComplete: (planId: string, taskId: string) => Promise<void>;
  reorderTasks: (planId: string, orderedIds: string[]) => Promise<void>;
  updatePlanStatus: (planId: string, status: 'active' | 'completed' | 'archived') => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  /** Optional refresh callback to re-fetch plans (used for manual reschedule) */
  refresh?: () => Promise<void>;
}

export function StudyPlanDashboard({ studyPlans, toggleTaskComplete, reorderTasks, updatePlanStatus, deletePlan, refresh }: StudyPlanDashboardProps) {
  const { navigateTo } = useStudentNav();
  const isMobile = useIsMobile();
  const { selectTopic } = useContentTree();

  const [currentDate, setCurrentDate] = useState(getAxonToday());
  const [selectedDate, setSelectedDate] = useState<Date>(getAxonToday());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [mobileTab, setMobileTab] = useState<MobileTab>('tasks');
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const { topicMastery } = useTopicMasteryContext();
  const { summary: timeSummary } = useStudyTimeEstimatesContext();
  const studentDataCtx = useStudentDataContext();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const nextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const prevDay = () => setSelectedDate(prev => subDays(prev, 1));

  const allTasks = studyPlans.flatMap(plan => plan.tasks.map(task => ({ ...task, planId: plan.id })));
  const tasksForDate = allTasks.filter(t => isSameDay(t.date, selectedDate));
  const daysWithTasks = new Set(allTasks.map(t => format(t.date, 'yyyy-MM-dd')));

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

  // M-4: Overdue tasks — tasks with date before today that are not completed
  const todayIso = useMemo(() => startOfDay(getAxonToday()).toISOString(), []);
  const overdueTasks = useMemo(
    () => {
      const todayStart = new Date(todayIso);
      return allTasks.filter(t => !t.completed && isBefore(startOfDay(t.date), todayStart));
    },
    [allTasks, todayIso],
  );

  // M-5: Reschedule state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleReschedule = useCallback(async () => {
    if (!refresh) return;
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const studentProfile = useMemo<StudentProfilePayload | null>(() => {
    if (studyPlans.length === 0) return null;
    const masteryRecord: StudentProfilePayload['topicMastery'] = {};
    topicMastery.forEach((info, topicId) => {
      masteryRecord[topicId] = { masteryPercent: info.masteryPercent, pKnow: info.pKnow, needsReview: info.needsReview, totalAttempts: info.totalAttempts, priorityScore: info.priorityScore };
    });
    if (Object.keys(masteryRecord).length === 0) {
      for (const plan of studyPlans) for (const task of plan.tasks) {
        const key = task.subject || task.title;
        if (!masteryRecord[key]) masteryRecord[key] = { masteryPercent: task.completed ? 70 : 20, pKnow: null, needsReview: !task.completed, totalAttempts: task.completed ? 1 : 0, priorityScore: task.completed ? 0.3 : 0.8 };
      }
    }
    const methodsSet = new Set<string>();
    for (const plan of studyPlans) for (const task of plan.tasks) if (task.method) methodsSet.add(task.method);
    const ctxDailyActivity = studentDataCtx?.dailyActivity ?? [];
    const ctxStats = studentDataCtx?.stats ?? null;
    return {
      topicMastery: masteryRecord, sessionHistory: [],
      dailyActivity: ctxDailyActivity.map(d => ({ date: d.date ?? '', studyMinutes: d.studyMinutes ?? 0, sessionsCount: d.sessionsCount ?? 0 })),
      stats: { totalStudyMinutes: ctxStats?.totalStudyMinutes ?? 0, totalSessions: ctxStats?.totalSessions ?? 0, currentStreak: ctxStats?.currentStreak ?? 0, avgMinutesPerSession: timeSummary.avgMinutesPerSession },
      studyMethods: Array.from(methodsSet),
    };
  }, [studyPlans, topicMastery, studentDataCtx?.dailyActivity, studentDataCtx?.stats, timeSummary]);

  const toggleExpand = (taskId: string) => { setExpandedTasks(prev => { const next = new Set(prev); if (next.has(taskId)) next.delete(taskId); else next.add(taskId); return next; }); };
  const handleToggleTask = async (planId: string, taskId: string) => {
    setTogglingTaskId(taskId);
    try {
      await toggleTaskComplete(planId, taskId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Dashboard] toggleTask failed:', err);
    } finally {
      setTogglingTaskId(null);
    }
  };
  const handleDragStart = useCallback((taskId: string) => { setDraggedTaskId(taskId); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, taskId: string) => { e.preventDefault(); if (taskId !== draggedTaskId) setDragOverTaskId(taskId); }, [draggedTaskId]);
  const handleDrop = useCallback((e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) { setDraggedTaskId(null); setDragOverTaskId(null); return; }
    const draggedTask = tasksForDate.find(t => t.id === draggedTaskId);
    const targetTask = tasksForDate.find(t => t.id === targetTaskId);
    if (draggedTask && targetTask && draggedTask.planId === targetTask.planId) {
      const plan = studyPlans.find(p => p.id === draggedTask.planId);
      if (plan) { const ids = plan.tasks.map(t => t.id); const from = ids.indexOf(draggedTaskId); const to = ids.indexOf(targetTaskId); if (from >= 0 && to >= 0) { const newOrder = [...ids]; newOrder.splice(from, 1); newOrder.splice(to, 0, draggedTaskId); reorderTasks(draggedTask.planId, newOrder); } }
    }
    setDraggedTaskId(null); setDragOverTaskId(null);
  }, [draggedTaskId, tasksForDate, studyPlans, reorderTasks]);
  const handleDragEnd = useCallback(() => { setDraggedTaskId(null); setDragOverTaskId(null); }, []);
  const handlePlanAction = useCallback(async (planId: string, action: 'completed' | 'archived' | 'delete') => { if (action === 'delete') await deletePlan(planId); else await updatePlanStatus(planId, action); }, [deletePlan, updatePlanStatus]);

  const calendarSidebarProps = { currentDate, selectedDate, daysInMonth, emptyDays, daysWithTasks, plansCount: studyPlans.length, onSelectDate: setSelectedDate, onPrevMonth: prevMonth, onNextMonth: nextMonth };
  const progressSidebarProps = { studyPlans, progressPercent, completedTasks, totalTasks, onNavigateNewPlan: () => navigateTo('organize-study'), onNavigateEditPlan: (planId: string) => navigateTo('organize-study', { search: `edit=${planId}` }), onPlanAction: handlePlanAction };

  const renderTasksPanel = () => {
    const flatTasks = Object.values(tasksBySubject).flat();
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8f9fb]">
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
          <div className="flex items-center gap-0 bg-[#f3f4f7] p-1 rounded-[10px] self-start">
            {(['day', 'week', 'month'] as const).map((v) => (
              <motion.button key={v} onClick={() => setViewMode(v)} className={clsx('px-4 py-[7px] min-h-[31px] rounded-[8px] text-[11.5px] font-semibold transition-all tracking-[0.2px]', viewMode === v ? 'bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.06)] text-[#0f1724]' : 'text-[#8b95a5] hover:text-[#4a5565]')} whileTap={{ scale: 0.97 }}>
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </motion.button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <motion.button onClick={prevDay} whileTap={{ scale: 0.9 }} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg text-[#8b95a5]"><ChevronLeft size={15} /></motion.button>
            <div className="flex items-center gap-1.5 px-2">
              <span className="font-semibold text-[#8b95a5] text-[12px] tracking-[0.2px]">{isMobile ? format(selectedDate, "EEE", { locale: es }) : format(selectedDate, "EEEE", { locale: es })}</span>
              <span className="font-bold text-[#1a2332] text-[17px] leading-none">{format(selectedDate, 'd')}</span>
              <span className="text-[#9ba3b2] text-[12px] font-medium">{isMobile ? format(selectedDate, "MMM", { locale: es }) : `de ${format(selectedDate, "MMMM", { locale: es })}`}</span>
              {isToday(selectedDate) && <span className="w-2 h-2 bg-[#2a8c7a] rounded-full shrink-0" />}
            </div>
            <button onClick={() => setSelectedDate(getAxonToday())} className="text-[11px] font-semibold text-[#2a8c7a] hover:text-[#1B3B36] px-2 py-1 min-h-[36px] rounded-md hover:bg-[#e6f5f1] transition-colors">Hoy</button>
            <motion.button onClick={nextDay} whileTap={{ scale: 0.9 }} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg text-[#8b95a5]"><ChevronRight size={15} /></motion.button>
          </div>
          <button className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-2 rounded-full hover:bg-[#ccebe3] transition-colors"><Plus size={13} />Material personalizado</button>
        </div>

        {viewMode === 'day' ? (
          <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5">
            {tasksForDate.length > 0 ? (
              <>
                {/* M-4: Overdue tasks alert banner */}
                {overdueTasks.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800">
                        {overdueTasks.length} {overdueTasks.length === 1 ? 'tarea pendiente' : 'tareas pendientes'} atrasadas
                      </p>
                      <p className="text-xs text-amber-600">Completalas o reprograma tu plan</p>
                    </div>
                    {/* M-5: Manual reschedule button */}
                    {refresh && (
                      <button
                        onClick={handleReschedule}
                        disabled={isRefreshing}
                        className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-full hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                      >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        Reprogramar plan
                      </button>
                    )}
                  </div>
                )}
                <DailyRecommendationCard studentProfile={studentProfile} />
                {Object.entries(tasksBySubject).map(([subject, tasks]) => {
                  const subjectStartIndex = flatTasks.findIndex(t => t.subject === subject);
                  return (
                    <div key={subject} className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={clsx('w-2 h-2 rounded-[3px]', tasks[0]?.subjectColor || 'bg-[#6b7385]')} />
                        <span className="text-[13px] font-semibold text-[#4a5565] tracking-[0.2px]">{subject}</span>
                        <span className="text-[10px] text-[#b0b8c4] font-medium">{tasks.filter(t => t.completed).length}/{tasks.length}</span>
                        <div className="flex-1 h-px ml-1" style={{ background: gradients.subjectDivider.css }} />
                      </div>
                      {tasks.map((task, localIdx) => {
                        const globalIdx = subjectStartIndex + localIdx;
                        const isExpanded = expandedTasks.has(task.id);
                        const isToggling = togglingTaskId === task.id;
                        return (
                          <div key={task.id} className="relative flex items-start gap-1">
                            <div className="absolute left-0 top-[22px] text-[10px] text-[#d1d5dc] font-medium w-7 text-right tabular-nums select-none">{String(globalIdx + 1).padStart(2, '0')}</div>
                            <motion.div layout draggable={!isMobile} onDragStart={!isMobile ? () => handleDragStart(task.id) : undefined} onDragOver={!isMobile ? (e) => handleDragOver(e, task.id) : undefined} onDrop={!isMobile ? (e) => handleDrop(e, task.id) : undefined} onDragEnd={!isMobile ? handleDragEnd : undefined}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: isToggling ? 0.5 : 1, y: 0 }} transition={{ delay: globalIdx * 0.06, duration: 0.25 }}
                              className={clsx('ml-9 flex-1 rounded-[14px] border overflow-hidden relative transition-shadow', task.completed ? 'border-[#c6f0df] shadow-[0px_1px_3px_0px_rgba(52,211,153,0.05)]' : 'border-[#ebedf0] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.02)] hover:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.05)]', draggedTaskId === task.id && 'opacity-40 scale-[0.97]', dragOverTaskId === task.id && draggedTaskId !== task.id && 'border-[#2a8c7a] ring-1 ring-[#2a8c7a]/20', isToggling && 'pointer-events-none')}
                              style={task.completed ? { background: gradients.dashboardCompletedRow.css } : undefined}>
                              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: task.completed ? gradients.dashboardBarActive.css : gradients.dashboardBarInactive.css }} />
                              <div className="pl-5 pr-4 py-[18px] flex items-center gap-3">
                                <div className="hidden lg:block cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 shrink-0 touch-none opacity-50"><GripVertical size={14} /></div>
                                <CompletionCircle completed={task.completed} onClick={() => handleToggleTask(task.planId, task.id)} />
                                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                  <span className={clsx('text-[14px] font-semibold leading-[1.4] transition-colors truncate', task.completed ? 'line-through text-[#b0b8c4]' : 'text-[#1a2332]')}>{task.title}</span>
                                  <div className="flex items-center gap-2"><MethodTag method={task.method} /></div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <DurationPill minutes={task.estimatedMinutes} completed={task.completed} />
                                  <motion.button onClick={() => toggleExpand(task.id)} whileTap={{ scale: 0.9 }} className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#9ba3b2] hover:text-[#4a5565] transition-colors rounded-lg hover:bg-gray-50">
                                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={15} /></motion.div>
                                  </motion.button>
                                </div>
                              </div>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                    <div className="px-5 pb-4 pt-1 border-t border-gray-100 text-sm text-gray-500 flex flex-wrap items-center gap-3">
                                      <span className="flex items-center gap-1 text-[12px]"><BookOpen size={12} /> {task.subject}</span>
                                      <span className="flex items-center gap-1 text-[12px]"><Clock size={12} /> {task.estimatedMinutes} min estimados</span>
                                      <button onClick={() => { if (task.topicId) { selectTopic(task.topicId); } navigateTo('study'); }} className="ml-auto text-[11px] font-bold text-[#2a8c7a] hover:text-[#1B3B36] bg-[#e6f5f1] px-3 py-1.5 min-h-[36px] rounded-full transition-colors hover:bg-[#ccebe3]">Iniciar Estudio</button>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="ml-9">
                  <button className="w-full flex items-center justify-center gap-2 py-4 rounded-[14px] border border-dashed border-[#e2e5ea] text-[#9ba3b2] hover:text-[#4a5565] hover:border-[#b0b8c4] transition-all text-[13px] font-medium hover:bg-white/60"><Plus size={14} />Agregar tarea</button>
                </motion.div>
                <div className="ml-9"><DaySummaryCard todayCompleted={todayCompleted} todayTotal={tasksForDate.length} todayMinutes={todayTotalMinutes} todayProgress={todayProgress} /></div>
                <WeeklyInsightCard studentProfile={studentProfile} />
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-64 text-[#9ba3b2]">
                <CalendarIcon size={40} className="mb-3 text-[#dfe2e8]" />
                <p className="font-semibold text-[#4a5565] text-[13px]">Ninguna tarea para este día</p>
                <p className="text-[12px] mt-1 text-center px-4 text-[#9ba3b2]">Selecciona otro día en el calendario o crea un nuevo plan.</p>
                <button onClick={() => navigateTo('organize-study')} className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-4 py-2 rounded-full hover:bg-[#ccebe3] transition-colors"><Plus size={14} /> Crear plan</button>
              </motion.div>
            )}
          </div>
        ) : viewMode === 'week' ? (
          <WeekView allTasks={allTasks as TaskWithPlan[]} selectedDate={selectedDate} togglingTaskId={togglingTaskId} onToggleTask={handleToggleTask} onSelectDay={(day) => { setSelectedDate(day); setViewMode('day'); }} onNavigateNewPlan={() => navigateTo('organize-study')} />
        ) : (
          <MonthView allTasks={allTasks as TaskWithPlan[]} selectedDate={selectedDate} currentDate={currentDate} daysInMonth={daysInMonth} emptyDays={emptyDays} togglingTaskId={togglingTaskId} onToggleTask={handleToggleTask} onSelectDay={setSelectedDate} onNavigateNewPlan={() => navigateTo('organize-study')} />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout
      isMobile={isMobile} mobileTab={mobileTab} onMobileTabChange={setMobileTab}
      completedTasks={completedTasks} totalTasks={totalTasks} progressPercent={progressPercent}
      tasksForDateCount={tasksForDate.length} plansCount={studyPlans.length}
      onNavigateNewPlan={() => navigateTo('organize-study')}
      calendarSidebarProps={calendarSidebarProps} progressSidebarProps={progressSidebarProps}
      renderTasksPanel={renderTasksPanel}
    />
  );
}
