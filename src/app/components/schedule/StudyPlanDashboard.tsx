// ============================================================
// Axon — Study Plan Dashboard (when plans exist) — RESPONSIVE
//
// RESPONSIVE CHANGES (Phase 1C):
//   1. Mobile (<lg): Tab-based UI replacing 3-column layout
//      - Tabs: "Tareas" | "Calendario" | "Progreso"
//      - Sidebars render embedded (full-width) inside tab panels
//   2. Desktop (lg+): 3-column layout unchanged
//   3. Center top bar: stacks on mobile, shorter date format
//   4. Summary table: grid-cols-2 on mobile → grid-cols-4 desktop
//   5. Drag handle: hidden on mobile (touch DnD is unreliable)
//   6. Task expand detail: flex-wrap on mobile
//   7. Touch targets: min-h-[44px] on all interactive elements
// ============================================================
import React, { useState, useCallback } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
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

// ── Types ──
type MobileTab = 'tasks' | 'calendar' | 'progress';

export interface StudyPlanDashboardProps {
  studyPlans: import('@/app/context/AppContext').StudyPlan[];
  toggleTaskComplete: (planId: string, taskId: string) => Promise<void>;
  reorderTasks: (planId: string, orderedIds: string[]) => Promise<void>;
  updatePlanStatus: (planId: string, status: 'active' | 'completed' | 'archived') => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
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

  // Get all tasks for selected date across all plans
  const allTasks = studyPlans.flatMap(plan =>
    plan.tasks.map(task => ({ ...task, planId: plan.id }))
  );

  const tasksForDate = allTasks.filter(t => isSameDay(t.date, selectedDate));

  // Get days with tasks for calendar dots
  const daysWithTasks = new Set(
    allTasks.map(t => format(t.date, 'yyyy-MM-dd'))
  );

  // Group tasks by subject for the center panel
  const tasksBySubject: Record<string, typeof tasksForDate> = {};
  for (const task of tasksForDate) {
    if (!tasksBySubject[task.subject]) tasksBySubject[task.subject] = [];
    tasksBySubject[task.subject].push(task);
  }

  // Calculate progress
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Total estimated time for today
  const todayTotalMinutes = tasksForDate.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const todayHours = Math.floor(todayTotalMinutes / 60);
  const todayMins = todayTotalMinutes % 60;

  // Today's progress
  const todayCompleted = tasksForDate.filter(t => t.completed).length;
  const todayProgress = tasksForDate.length > 0 ? Math.round((todayCompleted / tasksForDate.length) * 100) : 0;

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
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

  // Plan action handler (for right sidebar)
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

  // ── Center panel (tasks) — shared between desktop & mobile ──
  const renderTasksPanel = () => (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Top bar: View mode + Date nav — responsive */}
      <div className="bg-white border-b border-gray-200 px-3 lg:px-6 py-2.5 lg:py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start">
          {(['day', 'week', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={clsx(
                "px-3 py-1.5 min-h-[36px] rounded-md text-xs font-semibold transition-all",
                viewMode === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <button onClick={prevDay} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-gray-800 text-sm lg:text-base truncate">
            {isMobile
              ? format(selectedDate, "EEE d MMM", { locale: es })
              : format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
            }
          </span>
          {isToday(selectedDate) && (
            <span className="w-2 h-2 bg-[#2a8c7a] rounded-full shrink-0" />
          )}
          <button
            onClick={() => setSelectedDate(getAxonToday())}
            className="text-xs font-semibold text-[#2a8c7a] hover:text-[#1B3B36] px-2 py-1 min-h-[36px] rounded-md hover:bg-[#e6f5f1]"
          >
            Hoy
          </button>
          <button onClick={nextDay} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>

        <button className="hidden lg:flex items-center gap-1 text-xs font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-2 rounded-lg hover:bg-[#ccebe3] transition-colors">
          <Plus size={14} />
          Material personalizado
        </button>
      </div>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {tasksForDate.length > 0 ? (
          <>
            {Object.entries(tasksBySubject).map(([subject, tasks]) => (
              <div key={subject} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={clsx("w-2.5 h-2.5 rounded-sm", tasks[0]?.subjectColor || 'bg-[#2a8c7a]')} />
                  <span className="text-sm font-semibold text-gray-600">{subject}</span>
                </div>

                {tasks.map((task) => {
                  const isExpanded = expandedTasks.has(task.id);
                  return (
                    <div
                      key={task.id}
                      draggable={!isMobile}
                      onDragStart={!isMobile ? () => handleDragStart(task.id) : undefined}
                      onDragOver={!isMobile ? (e) => handleDragOver(e, task.id) : undefined}
                      onDrop={!isMobile ? (e) => handleDrop(e, task.id) : undefined}
                      onDragEnd={!isMobile ? handleDragEnd : undefined}
                      className={clsx(
                        "bg-white rounded-xl border transition-all",
                        task.completed ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 hover:shadow-sm",
                        draggedTaskId === task.id && "opacity-40 scale-[0.97]",
                        dragOverTaskId === task.id && draggedTaskId !== task.id && "border-[#2a8c7a] shadow-md ring-2 ring-[#2a8c7a]/20"
                      )}
                    >
                      <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-3">
                        {/* Drag handle — desktop only */}
                        <div className="hidden lg:block cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none">
                          <GripVertical size={16} />
                        </div>

                        <button
                          onClick={() => toggleTaskComplete(task.planId, task.id)}
                          className={clsx(
                            "w-6 h-6 lg:w-5 lg:h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            task.completed
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-300 hover:border-[#2a8c7a]"
                          )}
                        >
                          {task.completed && <CheckCircle2 size={12} className="text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                            <span className={clsx(
                              "font-semibold transition-colors truncate",
                              task.completed ? "line-through text-gray-400" : "text-gray-800"
                            )}>
                              {task.title}
                            </span>
                            <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0", METHOD_COLORS[task.method] || 'bg-gray-100 text-gray-600 border-gray-200')}>
                              {METHOD_ICONS[task.method]}
                              <span className="hidden sm:inline">{METHOD_LABELS[task.method] || task.method}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={12} />
                            {task.estimatedMinutes}m
                          </span>
                          <button
                            onClick={() => toggleExpand(task.id)}
                            className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <ChevronDown size={16} className={clsx("transition-transform", isExpanded && "rotate-180")} />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 lg:px-4 pb-3 pt-1 border-t border-gray-100 text-sm text-gray-500 flex flex-wrap items-center gap-3 lg:gap-4">
                              <span className="flex items-center gap-1">
                                <BookOpen size={12} /> {task.subject}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {task.estimatedMinutes} min
                              </span>
                              <button
                                onClick={() => {/* Navigate to study */}}
                                className="ml-auto text-xs font-bold text-[#2a8c7a] hover:text-[#1B3B36] bg-[#e6f5f1] px-3 py-1.5 min-h-[36px] rounded-lg"
                              >
                                Iniciar Estudio
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Summary table — responsive */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 text-sm">
                <div className="px-3 lg:px-4 py-3 bg-[#e6f5f1] font-semibold text-[#1B3B36] border-r border-[#ccebe3] flex items-center gap-2 col-span-2 lg:col-span-1">
                  <BookOpen size={14} />
                  <span className="truncate">Tareas para hoy</span>
                </div>
                <div className="px-3 lg:px-4 py-3 bg-gray-50 font-medium text-gray-600 border-r border-gray-200 text-center">
                  Tiempo est.
                </div>
                <div className="px-3 lg:px-4 py-3 bg-gray-50 font-medium text-gray-600 border-r border-gray-200 text-center flex items-center justify-center gap-1">
                  <Clock size={14} className="text-[#2a8c7a]" />
                  {todayHours > 0 ? `${todayHours}h ` : ''}{todayMins}m
                </div>
                <div className="px-3 lg:px-4 py-3 bg-gray-50 font-medium text-gray-600 text-center">
                  {todayProgress}%
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <CalendarIcon size={48} className="mb-4 text-gray-300" />
            <p className="font-medium">Ninguna tarea para este dia.</p>
            <p className="text-sm mt-1 text-center px-4">Selecciona otro dia en el calendario o crea un nuevo plan.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-surface-dashboard">
      {/* AXON Page Header */}
      <div className="shrink-0">
        <AxonPageHeader
          title="Cronograma"
          subtitle="Plan de Estudios Activo"
          statsLeft={
            <p className="text-gray-500 text-sm">
              {completedTasks} de {totalTasks} tareas completadas &middot; {progressPercent}% completo
            </p>
          }
          statsRight={
            <div className="hidden md:flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500"><span className="text-emerald-600 font-semibold">{completedTasks}</span> completadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
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
                "flex-1 flex items-center justify-center gap-2 py-3 min-h-[48px] text-sm font-semibold transition-all border-b-2",
                mobileTab === tab.key
                  ? "text-[#1B3B36] border-[#2a8c7a] bg-[#e6f5f1]/30"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
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
        /* Mobile: Tab panels */
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'tasks' && renderTasksPanel()}
          {mobileTab === 'calendar' && (
            <div className="h-full overflow-y-auto">
              <PlanCalendarSidebar {...calendarSidebarProps} embedded />
            </div>
          )}
          {mobileTab === 'progress' && (
            <div className="h-full overflow-y-auto">
              <PlanProgressSidebar {...progressSidebarProps} embedded />
            </div>
          )}
        </div>
      ) : (
        /* Desktop: 3-column layout */
        <div className="flex flex-1 w-full overflow-hidden">
          {/* Left Sidebar */}
          <PlanCalendarSidebar {...calendarSidebarProps} />

          {/* Center: Study Tasks */}
          {renderTasksPanel()}

          {/* Right Sidebar */}
          <PlanProgressSidebar {...progressSidebarProps} />
        </div>
      )}
    </div>
  );
}