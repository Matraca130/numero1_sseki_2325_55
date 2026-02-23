import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle, components, colors } from '@/app/design-system';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  Star,
  Trophy,
  Plus,
  Pencil,
  LayoutGrid,
  Video,
  Zap,
  GraduationCap,
  FileText,
  Box,
  Target,
  RotateCcw,
  BarChart3,
  Brain,
  ArrowRight,
  Flame,
  Activity,
  GripVertical,
  Archive,
  Trash2,
  Check,
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
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { useStudyPlans } from '@/app/hooks/useStudyPlans';

// Method icons lookup
const METHOD_ICONS: Record<string, React.ReactNode> = {
  video: <Video size={14} />,
  flashcard: <Zap size={14} />,
  quiz: <GraduationCap size={14} />,
  resumo: <FileText size={14} />,
  '3d': <Box size={14} />,
};

const METHOD_LABELS: Record<string, string> = {
  video: 'Vídeo',
  flashcard: 'Flashcards',
  quiz: 'Quiz',
  resumo: 'Resumo',
  '3d': 'Atlas 3D',
};

const METHOD_COLORS: Record<string, string> = {
  video: 'bg-teal-100 text-teal-700 border-teal-200',
  flashcard: 'bg-amber-100 text-amber-700 border-amber-200',
  quiz: 'bg-purple-100 text-purple-700 border-purple-200',
  resumo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '3d': 'bg-orange-100 text-orange-700 border-orange-200',
};

// ─── Fallback data when no study plans exist ───
const SCHEDULE_EVENTS = [
  { date: new Date(2026, 1, 5), title: 'Anatomia: Membro Superior', type: 'study', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { date: new Date(2026, 1, 5), title: 'Revisão: Histologia', type: 'review', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { date: new Date(2026, 1, 7), title: 'Prova de Fisiologia', type: 'exam', color: 'bg-red-100 text-red-700 border-red-200' },
  { date: new Date(2026, 1, 10), title: 'Bioquímica: Metabolismo', type: 'study', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { date: new Date(2026, 1, 12), title: 'Seminário de Patologia', type: 'task', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { date: new Date(2026, 1, 15), title: 'Simulado Geral', type: 'exam', color: 'bg-red-100 text-red-700 border-red-200' },
];

const UPCOMING_EXAMS = [
  { id: 1, title: 'Prova de Fisiologia', date: '07 Fev', daysLeft: 0, priority: 'high' as const },
  { id: 2, title: 'Simulado Geral', date: '15 Fev', daysLeft: 8, priority: 'medium' as const },
  { id: 3, title: 'Anatomia Prática', date: '22 Fev', daysLeft: 15, priority: 'high' as const },
];

const COMPLETED_TASKS = [
  { id: 1, title: 'Resumo: Introdução à Anatomia', date: 'Ontem', score: '95%' },
  { id: 2, title: 'Flashcards: Ossos do Crânio', date: '05 Fev', score: '80%' },
  { id: 3, title: 'Quiz: Sistema Nervoso', date: '04 Fev', score: '100%' },
];

export function ScheduleView() {
  const { studyPlans } = useApp();
  const { plans: backendPlans, loading: plansLoading } = useStudyPlans();

  // Use backend plans if available, else fallback to AppContext local plans
  const effectivePlans = backendPlans.length > 0 ? backendPlans : studyPlans;

  if (effectivePlans.length > 0) {
    return <StudyPlanDashboard />;
  }
  if (plansLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-dashboard">
        <div className="text-gray-400 text-sm animate-pulse">Carregando planos...</div>
      </div>
    );
  }
  return <DefaultScheduleView />;
}

// ════════════════════════════════════════════════
//  Study Plan Dashboard (when plans exist)
// ════════════════════════════════════════════════
function StudyPlanDashboard() {
  const { studyPlans: localPlans, toggleTaskComplete: localToggle } = useApp();
  const {
    plans: backendPlans,
    toggleTaskComplete: backendToggle,
    reorderTasks,
    updatePlanStatus,
    deletePlan,
  } = useStudyPlans();
  const { navigateTo } = useStudentNav();

  // Prefer backend plans; fallback to local
  const studyPlans = backendPlans.length > 0 ? backendPlans : localPlans;
  const toggleTaskComplete = backendPlans.length > 0 ? backendToggle : localToggle;

  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 7));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 1, 7));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // ── Drag & drop state ──
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // ── Plan action menu state ──
  const [openMenuPlanId, setOpenMenuPlanId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPlanId(null);
      }
    };
    if (openMenuPlanId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuPlanId]);

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const prevDay = () => setSelectedDate(subDays(selectedDate, 1));

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

  // Determine if on track
  const isOnTrack = totalTasks > 0 && (completedTasks / totalTasks) >= 0 ; // always "on track" for demo since we start at 0%

  // ── Drag & drop handlers ──
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

    // Find both tasks to determine plan
    const draggedTask = tasksForDate.find(t => t.id === draggedTaskId);
    const targetTask = tasksForDate.find(t => t.id === targetTaskId);

    if (draggedTask && targetTask && draggedTask.planId === targetTask.planId) {
      // Get all tasks for this plan, reorder them
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

  // ── Plan action handlers ──
  const handlePlanAction = useCallback(async (planId: string, action: 'completed' | 'archived' | 'delete') => {
    setOpenMenuPlanId(null);
    if (action === 'delete') {
      await deletePlan(planId);
    } else {
      await updatePlanStatus(planId, action);
    }
  }, [deletePlan, updatePlanStatus]);

  return (
    <div className="h-full flex flex-col bg-surface-dashboard">
      {/* ── AXON Page Header ── */}
      <div className="shrink-0">
        <AxonPageHeader
          title="Cronograma"
          subtitle="Plano de Estudos Ativo"
          statsLeft={
            <p className="text-gray-500 text-sm">
              {completedTasks} de {totalTasks} tarefas concluídas &middot; {progressPercent}% completo
            </p>
          }
          statsRight={
            <div className="hidden md:flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500"><span className="text-emerald-600 font-semibold">{completedTasks}</span> concluídas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-500"><span className="text-amber-600 font-semibold">{tasksForDate.length}</span> para hoje</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-xs text-gray-500"><span className="text-teal-600 font-semibold">{studyPlans.length}</span> planos</span>
              </div>
            </div>
          }
          actionButton={
            <button
              onClick={() => navigateTo('organize-study')}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-full text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0"
            >
              <Plus size={15} /> Novo Plano
            </button>
          }
        />
      </div>

      {/* ── 3-Column Layout ── */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* ── Left Sidebar: Calendar & Plans ── */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
          {/* Plans header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700">
              <LayoutGrid size={16} />
              <span className="text-sm font-semibold">Lista de planos de estudo</span>
            </div>
            <span className="text-xs text-gray-500">ativos: {studyPlans.length}</span>
          </div>

          {/* Mini Calendar */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-bold text-gray-800 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'].map((d, i) => (
                <div key={i} className="text-[10px] font-bold text-gray-400 py-1">{d}</div>
              ))}
              {emptyDays.map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {daysInMonth.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const hasTasks = daysWithTasks.has(format(day, 'yyyy-MM-dd'));
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={clsx(
                      "w-7 h-7 flex items-center justify-center rounded-full text-xs relative transition-all",
                      isTodayDate && !isSelected && "bg-teal-100 text-teal-700 font-bold",
                      isSelected && "bg-teal-600 text-white font-bold",
                      !isSelected && !isTodayDate && "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {format(day, 'd')}
                    {hasTasks && !isSelected && (
                      <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-teal-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Pencil size={14} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Checklist prévia ao estudo</span>
            </div>
            <div className="space-y-2">
              {['Revisar anotações do dia anterior', 'Preparar material de estudo', 'Eliminar distrações', 'Definir metas claras'].map((item, i) => (
                <label key={i} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer group">
                  <input type="checkbox" className="rounded border-gray-300 text-teal-500 focus:ring-teal-500" />
                  <span className="group-hover:text-gray-800 transition-colors">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center: Study Tasks ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar: View mode + Date nav */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {(['day', 'week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    viewMode === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={prevDay} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-gray-800">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
              {isToday(selectedDate) && (
                <span className="w-2 h-2 bg-teal-500 rounded-full" />
              )}
              <button
                onClick={() => setSelectedDate(new Date(2026, 1, 7))}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 rounded-md hover:bg-teal-50"
              >
                Hoje
              </button>
              <button onClick={nextDay} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
                <ChevronRight size={18} />
              </button>
            </div>

            <button className="flex items-center gap-1 text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-2 rounded-lg hover:bg-teal-100 transition-colors">
              <Plus size={14} />
              Material personalizado
            </button>
          </div>

          {/* Tasks list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {tasksForDate.length > 0 ? (
              <>
                {Object.entries(tasksBySubject).map(([subject, tasks]) => (
                  <div key={subject} className="space-y-2">
                    {/* Subject category badge */}
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-2.5 h-2.5 rounded-sm", tasks[0]?.subjectColor || 'bg-teal-500')} />
                      <span className="text-sm font-semibold text-gray-600">{subject}</span>
                    </div>

                    {tasks.map((task) => {
                      const isExpanded = expandedTasks.has(task.id);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onDragOver={(e) => handleDragOver(e, task.id)}
                          onDrop={(e) => handleDrop(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={clsx(
                            "bg-white rounded-xl border transition-all",
                            task.completed ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 hover:shadow-sm",
                            draggedTaskId === task.id && "opacity-40 scale-[0.97]",
                            dragOverTaskId === task.id && draggedTaskId !== task.id && "border-teal-400 shadow-md ring-2 ring-teal-200/50"
                          )}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            {/* Drag handle */}
                            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none">
                              <GripVertical size={16} />
                            </div>

                            <button
                              onClick={() => toggleTaskComplete(task.planId, task.id)}
                              className={clsx(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                task.completed
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-gray-300 hover:border-teal-400"
                              )}
                            >
                              {task.completed && <CheckCircle2 size={12} className="text-white" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={clsx(
                                  "font-semibold transition-colors",
                                  task.completed ? "line-through text-gray-400" : "text-gray-800"
                                )}>
                                  {task.title}
                                </span>
                                <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1", METHOD_COLORS[task.method] || 'bg-gray-100 text-gray-600 border-gray-200')}>
                                  {METHOD_ICONS[task.method]}
                                  {METHOD_LABELS[task.method] || task.method}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={12} />
                                {task.estimatedMinutes} min
                              </span>
                              <button
                                onClick={() => toggleExpand(task.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                                <div className="px-4 pb-3 pt-1 border-t border-gray-100 text-sm text-gray-500 flex items-center gap-4">
                                  <span className="flex items-center gap-1">
                                    <BookOpen size={12} /> {task.subject}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} /> {task.estimatedMinutes} minutos estimados
                                  </span>
                                  <button
                                    onClick={() => {/* Navigate to study */}}
                                    className="ml-auto text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1 rounded-lg"
                                  >
                                    Iniciar Estudo
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

                {/* Summary table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
                  <div className="grid grid-cols-4 text-sm">
                    <div className="px-4 py-3 bg-teal-50 font-semibold text-teal-800 border-r border-teal-100 flex items-center gap-2">
                      <BookOpen size={14} />
                      Tarefas de estudo para hoje
                    </div>
                    <div className="px-4 py-3 bg-gray-50 font-medium text-gray-600 border-r border-gray-200 text-center">
                      Tempo est.
                    </div>
                    <div className="px-4 py-3 bg-gray-50 font-medium text-gray-600 border-r border-gray-200 text-center flex items-center justify-center gap-1">
                      <Clock size={14} className="text-teal-500" />
                      {todayHours > 0 ? `${todayHours} hrs ` : ''}{todayMins} mins
                    </div>
                    <div className="px-4 py-3 bg-gray-50 font-medium text-gray-600 text-center">
                      Progresso {todayProgress}%
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <CalendarIcon size={48} className="mb-4 text-gray-300" />
                <p className="font-medium">Nenhuma tarefa para este dia.</p>
                <p className="text-sm mt-1">Selecione outro dia no calendário ou crie um novo plano.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar: Progress & Actions ── */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
          {/* Action buttons */}
          <div className="p-4 border-b border-gray-100 space-y-2">
            <button
              onClick={() => navigateTo('organize-study')}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Agregar novo plano de estudo
            </button>
            <button className="w-full flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              <Pencil size={16} />
              Editar plano de estudo
            </button>
          </div>

          {/* Quick Nav: Review & Dashboards */}
          <div className="p-4 border-b border-gray-100 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Acesso rapido</p>
            <button
              onClick={() => navigateTo('review-session')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-100 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-100 hover:border-violet-200 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-200 transition-colors">
                <RotateCcw size={15} className="text-violet-600" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Sessao de Revisao</span>
                <span className="text-[10px] text-violet-500 font-normal">Repeticao espacada</span>
              </div>
              <ArrowRight size={14} className="text-violet-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigateTo('study-dashboards')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 hover:border-emerald-200 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                <BarChart3 size={15} className="text-emerald-600" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Dashboards de Estudo</span>
                <span className="text-[10px] text-emerald-500 font-normal">Desempenho e metricas</span>
              </div>
              <ArrowRight size={14} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigateTo('knowledge-heatmap')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 hover:border-orange-200 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                <Flame size={15} className="text-orange-600" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Knowledge Heatmap</span>
                <span className="text-[10px] text-orange-500 font-normal">Mapa de calor de retencao</span>
              </div>
              <ArrowRight size={14} className="text-orange-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigateTo('mastery-dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-xl text-sm font-semibold hover:bg-teal-500/20 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0 group-hover:bg-teal-500/30 transition-colors">
                <Activity size={15} className="text-teal-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Mastery Dashboard</span>
                <span className="text-[10px] text-teal-400/60 font-normal">Agenda diaria e tarefas</span>
              </div>
              <ArrowRight size={14} className="text-teal-400/50 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* General Progress */}
          <div className="p-6 border-b border-gray-100">
            <h4 className="font-bold text-gray-800 text-sm mb-4">Progresso geral</h4>

            {/* Gauge */}
            <div className="flex flex-col items-center mb-4">
              <svg viewBox="0 0 120 80" className="w-40">
                <path
                  d="M 10 70 A 50 50 0 0 1 110 70"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 70 A 50 50 0 0 1 110 70"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${progressPercent * 1.57} 157`}
                />
                <text x="60" y="55" textAnchor="middle" className="text-2xl font-bold" fill="#1e293b" fontSize="24">
                  {progressPercent}%
                </text>
                <text x="60" y="72" textAnchor="middle" fill="#94a3b8" fontSize="9">
                  do conteúdo coberto
                </text>
              </svg>
            </div>

            {/* Status badge */}
            <div className="flex justify-center">
              <span className={clsx(
                "px-3 py-1 rounded-full text-xs font-bold",
                isOnTrack
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {isOnTrack ? 'On track' : 'Atrasado'}
              </span>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">
              Vas al ritmo previsto y alcanzarás tu objetivo según lo programado.
            </p>
          </div>

          {/* Study Plan list */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h4 className="font-bold text-gray-800 text-sm mb-3">Planos ativos</h4>
            <div className="space-y-3">
              {studyPlans.map((plan) => {
                const planCompleted = plan.tasks.filter(t => t.completed).length;
                const planTotal = plan.tasks.length;
                const planProgress = planTotal > 0 ? Math.round((planCompleted / planTotal) * 100) : 0;
                const isMenuOpen = openMenuPlanId === plan.id;
                return (
                  <div key={plan.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800 text-sm">{plan.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500">{planProgress}%</span>
                        <button
                          onClick={() => setOpenMenuPlanId(isMenuOpen ? null : plan.id)}
                          className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Action dropdown */}
                    {isMenuOpen && (
                      <div ref={menuRef} className="absolute right-3 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 w-48">
                        <button
                          onClick={() => handlePlanAction(plan.id, 'completed')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <Check size={14} />
                          Marcar como completo
                        </button>
                        <button
                          onClick={() => handlePlanAction(plan.id, 'archived')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                        >
                          <Archive size={14} />
                          Arquivar plano
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => handlePlanAction(plan.id, 'delete')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                          Excluir plano
                        </button>
                      </div>
                    )}

                    <div className="flex gap-1 mb-2">
                      {plan.subjects.map(s => (
                        <span key={s.id} className={clsx("text-[10px] px-2 py-0.5 rounded-full text-white font-bold", s.color)}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${planProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
                      <span>{planCompleted}/{planTotal} tarefas</span>
                      <span>até {format(plan.completionDate, "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly report button */}
          <div className="p-4 border-t border-gray-100">
            <button className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              Ver Relatório Semanal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  Default Schedule View (no plans)
// ════════════════════════════════════════════════
function DefaultScheduleView() {
  const { navigateTo } = useStudentNav();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 7));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 1, 7));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    provas: false,
    concluido: false,
  });
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getEventsForDay = (date: Date) => {
    return SCHEDULE_EVENTS.filter(event => isSameDay(event.date, date));
  };

  const selectedEvents = getEventsForDay(selectedDate);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-light bg-surface-dashboard">
      {/* ── AXON Page Header ── */}
      <div>
        <AxonPageHeader
          title="Cronograma"
          subtitle="Organize sua rotina de estudos"
          statsLeft={
            <p className="text-gray-500 text-sm">
              {SCHEDULE_EVENTS.length} eventos agendados &middot; Fevereiro 2026
            </p>
          }
          actionButton={
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigateTo('organize-study')}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-full text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0"
              >
                <Plus size={15} /> Organizar Estudo
              </button>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <button
                  onClick={() => setViewMode('month')}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === 'month' ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  Mês
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === 'week' ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  Semana
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* ── 2-Column Layout ── */}
      <div className="flex w-full">
        {/* ── Main Calendar Area ── */}
        <div className="flex-1 flex flex-col min-w-0 p-8">
          {/* Calendar Controls */}
          <div className="bg-white rounded-t-2xl border border-gray-100 border-b-0 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 capitalize flex items-center gap-2" style={headingStyle}>
              <CalendarIcon size={20} className="text-teal-600" />
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
                Hoje
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white border border-gray-100 border-t-gray-200/60 rounded-b-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden min-h-[500px]">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr bg-gray-100 gap-px">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="bg-white/50" />
              ))}

              {daysInMonth.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const dayEvents = getEventsForDay(day);

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={clsx(
                      "bg-white p-2 min-h-[100px] cursor-pointer transition-colors relative hover:bg-gray-50",
                      isSelected && "bg-teal-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={clsx(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-all",
                        isTodayDate
                          ? "bg-teal-600 text-white shadow-md"
                          : isSelected
                            ? "bg-teal-500 text-white"
                            : "text-gray-700"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className={clsx(
                            "text-[10px] px-1.5 py-1 rounded border truncate font-medium",
                            event.color
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>

                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-teal-500 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-96 bg-[#2d3e50] border-l border-white/10 shadow-xl flex flex-col z-10 sticky top-0 self-start max-h-screen">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#263545]">
            <h3 className="font-semibold text-white text-lg" style={headingStyle}>Detalhes do Dia</h3>
            <span className="text-sm font-medium text-teal-300 bg-teal-500/20 px-3 py-1 rounded-full">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 space-y-8 bg-[#2d3e50]">

            {/* O que estudar esse dia */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-teal-400" />
                <h4 className="font-semibold text-white text-sm uppercase tracking-wide" style={headingStyle}>O que estudar hoje</h4>
              </div>

              {selectedEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedEvents.map((event, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
                      <div className={clsx("absolute left-0 top-0 bottom-0 w-1", event.type === 'exam' ? 'bg-red-400' : 'bg-teal-400')} />
                      <div className="flex justify-between items-start mb-2">
                        <span className={clsx(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          event.type === 'exam' ? 'bg-red-500/20 text-red-300' : 'bg-teal-500/20 text-teal-300'
                        )}>
                          {event.type === 'exam' ? 'Prova' : 'Estudo'}
                        </span>
                        <button className="text-white/30 hover:text-white/60">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                      <h5 className="font-semibold text-white mb-1">{event.title}</h5>
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> 2h 30m
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={12} /> Alta prioridade
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-white/15 rounded-2xl bg-white/5">
                  <p className="text-sm font-medium text-white/40">Nada planejado para este dia.</p>
                  <button className="mt-2 text-xs font-medium text-teal-400 hover:text-teal-300">
                    + Adicionar tarefa
                  </button>
                </div>
              )}
            </section>

            {/* Próximas Provas */}
            <section>
              <button
                onClick={() => toggleSection('provas')}
                className="flex items-center gap-2 mb-4 w-full group cursor-pointer"
              >
                <AlertCircle size={18} className="text-red-400" />
                <h4 className="font-semibold text-white text-sm uppercase tracking-wide flex-1 text-left" style={headingStyle}>Próximas Provas</h4>
                <span className="text-[10px] font-semibold text-red-300 bg-red-500/20 px-2 py-1 rounded-full mr-1">{UPCOMING_EXAMS.length}</span>
                <ChevronDown size={16} className={clsx("text-white/40 group-hover:text-white/60 transition-transform duration-200", expandedSections.provas && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSections.provas && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3">
                      {UPCOMING_EXAMS.map((exam) => (
                        <div key={exam.id} className="flex items-center justify-between p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                          <div>
                            <h5 className="font-semibold text-white text-sm">{exam.title}</h5>
                            <p className="text-xs text-red-300 font-medium">{exam.date} • {exam.daysLeft === 0 ? 'HOJE!' : `Faltam ${exam.daysLeft} dias`}</p>
                          </div>
                          {exam.priority === 'high' && (
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Alta Prioridade" />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* O que foi feito */}
            <section>
              <button
                onClick={() => toggleSection('concluido')}
                className="flex items-center gap-2 mb-4 w-full group cursor-pointer"
              >
                <CheckCircle2 size={18} className="text-teal-400" />
                <h4 className="font-semibold text-white text-sm uppercase tracking-wide flex-1 text-left" style={headingStyle}>Concluído Recentemente</h4>
                <span className="text-[10px] font-semibold text-teal-300 bg-teal-500/20 px-2 py-1 rounded-full mr-1">{COMPLETED_TASKS.length}</span>
                <ChevronDown size={16} className={clsx("text-white/40 group-hover:text-white/60 transition-transform duration-200", expandedSections.concluido && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSections.concluido && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 relative">
                      <div className="absolute left-3.5 top-2 bottom-4 w-px bg-white/15" />
                      {COMPLETED_TASKS.map((task) => (
                        <div key={task.id} className="relative pl-8 flex items-center justify-between group">
                          <div className="absolute left-2 w-3 h-3 rounded-full bg-teal-400 border-2 border-[#2d3e50] shadow-sm z-10" />
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{task.title}</h5>
                            <p className="text-[10px] text-white/40">{task.date}</p>
                          </div>
                          <span className="text-xs font-semibold text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded-full">
                            {task.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* ── Quick Nav: Review & Dashboards ── */}
          <div className="p-4 border-t border-white/10 space-y-2 bg-[#263545]">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Acesso rapido</p>
            <button
              onClick={() => navigateTo('review-session')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-xl text-sm font-semibold hover:bg-violet-500/20 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 group-hover:bg-violet-500/30 transition-colors">
                <RotateCcw size={15} className="text-violet-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Sessao de Revisao</span>
                <span className="text-[10px] text-violet-400/60 font-normal">Repeticao espacada</span>
              </div>
              <ArrowRight size={14} className="text-violet-400/50 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigateTo('study-dashboards')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-xl text-sm font-semibold hover:bg-teal-500/20 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0 group-hover:bg-teal-500/30 transition-colors">
                <BarChart3 size={15} className="text-teal-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Dashboards de Estudo</span>
                <span className="text-[10px] text-teal-400/60 font-normal">Desempenho e metricas</span>
              </div>
              <ArrowRight size={14} className="text-teal-400/50 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigateTo('knowledge-heatmap')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-xl text-sm font-semibold hover:bg-orange-500/20 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 group-hover:bg-orange-500/30 transition-colors">
                <Flame size={15} className="text-orange-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Knowledge Heatmap</span>
                <span className="text-[10px] text-orange-400/60 font-normal">Mapa de calor de retencao</span>
              </div>
              <ArrowRight size={14} className="text-orange-400/50 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigateTo('mastery-dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-xl text-sm font-semibold hover:bg-teal-500/20 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0 group-hover:bg-teal-500/30 transition-colors">
                <Activity size={15} className="text-teal-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="block">Mastery Dashboard</span>
                <span className="text-[10px] text-teal-400/60 font-normal">Agenda diaria e tarefas</span>
              </div>
              <ArrowRight size={14} className="text-teal-400/50 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}