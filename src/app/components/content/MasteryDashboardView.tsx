import React, { useState, useMemo } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { CATEGORY_STYLES } from '@/app/utils/categoryStyles';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Play,
  Brain,
  AlertTriangle,
  Clock,
  Plus,
  Layers,
  BookOpen,
  CalendarDays,
} from 'lucide-react';
import clsx from 'clsx';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { headingStyle, components, colors } from '@/app/design-system';
import { MobileDrawer } from '@/app/components/layout/MobileDrawer';

// Mock data
interface CalendarEvent {
  day: number;
  title: string;
  category: 'science' | 'arts' | 'core';
  time?: string;
  hasReview?: boolean;
}

const CALENDAR_EVENTS: CalendarEvent[] = [
  { day: 4, title: 'Fisiología II', category: 'science', time: '10:00 - 11:30' },
  { day: 6, title: 'Anatomía Patológica', category: 'arts', time: '14:00 - 15:30', hasReview: true },
  { day: 11, title: 'Fisiología II', category: 'science', time: '10:00 - 11:30' },
  { day: 11, title: 'Bioquímica', category: 'core', time: '17:00 - 18:00' },
  { day: 14, title: 'Fisiología II', category: 'science', time: '10:00 - 11:30' },
  { day: 18, title: 'Farmacología I', category: 'science', time: '09:00 - 10:30', hasReview: true },
  { day: 24, title: 'Fisiología II', category: 'science', time: '10:00 - 11:30' },
  { day: 25, title: 'Histología', category: 'arts', time: '14:00 - 15:30' },
  { day: 27, title: 'Grupo de Estudio', category: 'core', time: '18:00 - 20:00' },
];

const TODAY_TASKS = [
  { id: '1', type: 'review' as const, subject: 'Psicología Cognitiva', title: 'Mapeo Conceptual', retention: 25, urgency: 'urgent' as const },
  { id: '2', type: 'session' as const, subject: 'Fisiología II', title: 'Práctica de Integración', description: 'Completá los problemas 14-22 del Capítulo 4.', time: '14:00', isPrimary: true },
  { id: '3', type: 'session' as const, subject: 'Anatomía', title: 'Leer Capítulo 4', description: 'Foco en la sección de miembro superior.', time: '16:30', duration: '45m' },
  { id: '4', type: 'session' as const, subject: 'Bioquímica', title: 'Revisar Anotaciones', description: 'Revisión rápida antes de dormir.', time: '19:00' },
  { id: '5', type: 'session' as const, subject: 'General', title: 'Diario de Estudio', time: '20:30' },
];


const SUBJECT_BADGE_STYLES: Record<string, string> = {
  'Psicología Cognitiva': 'bg-red-50 text-red-600',
  'Fisiología II': 'bg-blue-50 text-blue-600',
  'Anatomía': 'bg-pink-50 text-pink-600',
  'Bioquímica': 'bg-emerald-50 text-emerald-600',
  'General': 'bg-gray-100 text-gray-500',
};

const SUBJECT_ACCENT_COLORS: Record<string, string> = {
  'Psicología Cognitiva': 'bg-red-500',
  'Fisiología II': 'bg-blue-500',
  'Anatomía': 'bg-pink-500',
  'Bioquímica': 'bg-emerald-500',
  'General': 'bg-gray-300',
};

// ── Daily Sidebar Content (extracted for reuse in drawer) ──
function DailySidebarContent({ navigateTo, displayTasks, remainingTasks, completionPct }: {
  navigateTo: (route: string) => void;
  displayTasks: typeof TODAY_TASKS;
  remainingTasks: number;
  completionPct: number;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-6 py-4 lg:py-6 border-b border-gray-200/50 flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-gray-800 text-base lg:text-xl" style={{ fontWeight: 700, fontFamily: "Georgia, serif" }}>Viernes, 14</h2>
          <p className="text-gray-400 text-sm mt-1">{remainingTasks} tareas restantes</p>
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path className="text-gray-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            <path className="text-teal-500 drop-shadow-md" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${completionPct}, 100`} strokeLinecap="round" strokeWidth="3" />
          </svg>
          <span className="absolute text-xs text-teal-600" style={{ fontWeight: 700 }}>{completionPct}%</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 lg:px-6 py-4 space-y-6">
        {displayTasks.filter(t => t.type === 'review').length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" /></span>
              <h3 className="text-xs uppercase tracking-wider text-gray-400" style={{ fontWeight: 700 }}>Revisiones Espaciadas</h3>
            </div>
            {displayTasks.filter(t => t.type === 'review').map(task => (
              <div key={task.id} className="bg-white rounded-xl p-3 lg:p-4 shadow-md ring-1 ring-red-500/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                <div className="flex justify-between items-start mb-2">
                  <span className={clsx("px-2 py-1 rounded-md text-xs uppercase tracking-wider", SUBJECT_BADGE_STYLES[task.subject] || 'bg-gray-100 text-gray-500')} style={{ fontWeight: 700 }}><Brain size={12} className="inline mr-1" />{task.subject}</span>
                  <span className="font-mono text-xs text-red-500 bg-red-50 px-2 py-1 rounded" style={{ fontWeight: 700 }}>Urgente</span>
                </div>
                <h3 className="text-gray-800 mb-1" style={{ fontWeight: 700 }}>{task.title}</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase"><span>Retención</span><span className="text-red-500">{task.retention}% (Crítico)</span></div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${task.retention}%` }} /></div>
                </div>
                <button onClick={() => navigateTo('review-session')} className="w-full h-11 rounded-full bg-[#2a8c7a] hover:bg-[#244e47] text-white text-sm tracking-wide shadow-lg transition-colors flex items-center justify-center gap-2 active:scale-95 min-h-[44px] font-semibold" style={{ fontWeight: 700 }}><PlayCircle size={16} /> Iniciar Revisión</button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2" style={{ fontWeight: 700 }}>Agenda de Hoy</h3>
          {displayTasks.filter(t => t.type === 'session').map((task, i) => {
            const opacity = i >= 2 ? (i >= 3 ? 'opacity-60 hover:opacity-100' : 'opacity-80 hover:opacity-100') : '';
            return (
              <div key={task.id} className={clsx("bg-white rounded-xl p-3 lg:p-4 shadow-sm border border-white hover:bg-white transition-colors relative overflow-hidden", task.isPrimary && "ring-1 ring-teal-500/20 shadow-md", opacity)}>
                <div className={clsx("absolute top-0 left-0 w-1 h-full", SUBJECT_ACCENT_COLORS[task.subject] || 'bg-gray-300')} />
                <div className="flex justify-between items-start mb-2">
                  <span className={clsx("px-2 py-1 rounded-md text-xs uppercase tracking-wider", SUBJECT_BADGE_STYLES[task.subject] || 'bg-gray-100 text-gray-500')} style={{ fontWeight: 700 }}>{task.subject}</span>
                  <span className="font-mono text-xs text-gray-400 bg-[#F0F2F5] px-2 py-1 rounded">{task.time}</span>
                </div>
                <h3 className={clsx("text-gray-800 mb-1", !task.isPrimary && 'text-base')} style={{ fontWeight: 700 }}>{task.title}</h3>
                {task.description && <p className="text-sm text-gray-400 mb-3">{task.description}</p>}
                {task.isPrimary && (<button onClick={() => navigateTo('study')} className="w-full h-11 rounded-full bg-[#2a8c7a] hover:bg-[#244e47] text-white text-sm tracking-wide shadow-md transition-colors flex items-center justify-center gap-2 active:scale-95 min-h-[44px] font-semibold" style={{ fontWeight: 700 }}><Play size={16} /> Iniciar Sesión</button>)}
                {task.duration && (<div className="flex gap-2 mt-1"><span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {task.duration}</span></div>)}
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-3 lg:p-4 border-t border-gray-200/50 bg-white shrink-0">
        <button className="w-full py-2.5 rounded-full border-2 border-dashed border-teal-500/30 text-teal-600 text-sm hover:bg-teal-50 hover:border-teal-500/50 transition-all flex items-center justify-center gap-2 min-h-[44px]" style={{ fontWeight: 700 }}><Plus size={16} /> Agregar Nueva Tarea</button>
      </div>
    </div>
  );
}

export function MasteryDashboardView() {
  const { navigateTo } = useStudentNav();
  const { bktStates, dailyActivity, stats, isConnected } = useStudentDataContext();
  const { tree } = useContentTree();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const topicLookup = useMemo(() => {
    const map = new Map<string, string>();
    if (!tree) return map;
    for (const course of tree.courses) for (const semester of course.semesters) for (const section of semester.sections) for (const topic of section.topics) map.set(topic.id, topic.name);
    return map;
  }, [tree]);

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const prevMonthDays = [26, 27, 28, 29, 30];
  const daysInMonth = 28;
  const today = 14;
  const completionPct = isConnected && bktStates.length > 0 ? Math.round(bktStates.reduce((s, b) => s + b.p_know, 0) / bktStates.length * 100) : 65;

  const activityMap = useMemo(() => {
    const map = new Map<number, { minutes: number; cards: number; sessions: number }>();
    if (isConnected && dailyActivity.length > 0) dailyActivity.forEach(d => { const date = new Date(d.date + 'T12:00:00'); if (date.getMonth() === 1 && date.getFullYear() === 2026) map.set(date.getDate(), { minutes: d.studyMinutes, cards: d.cardsReviewed, sessions: d.sessionsCount }); });
    return map;
  }, [isConnected, dailyActivity]);

  const displayTasks = useMemo(() => {
    if (!isConnected || bktStates.length === 0) return TODAY_TASKS;
    const urgentTopics = [...bktStates].filter(b => b.p_know < 0.5).sort((a, b) => a.p_know - b.p_know).slice(0, 3);
    const reviewTasks = urgentTopics.map((b, i) => ({ id: `review-${i}`, type: 'review' as const, subject: topicLookup.get(b.subtopic_id) || `Tema ${b.subtopic_id.slice(0, 6)}`, title: 'Revisión Espaciada', retention: Math.round(b.p_know * 100), urgency: 'urgent' as const }));
    return [...reviewTasks, ...TODAY_TASKS.filter(t => t.type === 'session')];
  }, [isConnected, bktStates, topicLookup]);

  const remainingTasks = displayTasks.filter(t => t.type === 'session').length;

  const getEventsForDay = (day: number) => {
    const actData = activityMap.get(day);
    const mockEvents = CALENDAR_EVENTS.filter(e => e.day === day);
    if (isConnected && actData && actData.minutes > 0 && mockEvents.length === 0) return [{ day, title: `${actData.sessions} sesión(es)`, category: 'core' as const, time: `${actData.minutes} min`, hasReview: actData.cards > 0 }];
    return mockEvents;
  };

  return (
    <div className="h-full flex flex-col bg-[#f5f6fa]">
      <div className="shrink-0">
        <AxonPageHeader
          title="Febrero 2026"
          subtitle="Panel de dominio del estudio"
          onBack={() => navigateTo('schedule')}
          statsLeft={<div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 border border-gray-200/60"><button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronLeft size={18} /></button><button className="px-2 lg:px-3 py-1 text-sm text-gray-700 min-h-[44px]">Hoy</button><button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronRight size={18} /></button></div>}
          statsRight={<div className="flex items-center gap-2"><button onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-lg border border-gray-200/60 text-gray-600 text-sm min-h-[44px]"><CalendarDays size={16} className="text-teal-500" /><span className="hidden sm:inline">Agenda</span></button><div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">{(['day', 'week', 'month'] as const).map(mode => (<button key={mode} onClick={() => setViewMode(mode)} className={clsx("px-3 lg:px-4 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap min-h-[44px]", viewMode === mode ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600 hover:bg-white/50")}>{mode === 'day' ? 'Día' : mode === 'week' ? 'Sem' : 'Mes'}</button>))}</div></div>}
        />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="grid grid-cols-7 border-b border-gray-200 px-4 lg:px-8 pb-2 pt-3 shrink-0">
            {daysOfWeek.map(day => (<div key={day} className="text-center text-[10px] lg:text-xs font-mono text-gray-400 uppercase tracking-wider">{day}</div>))}
          </div>
          <div className="flex-1 px-2 lg:px-8 pb-4 lg:pb-8 overflow-y-auto custom-scrollbar-light">
            <div className="grid grid-cols-7 h-full min-h-[400px] lg:min-h-[600px] border-l border-t border-gray-200 rounded-bl-xl rounded-br-xl bg-white">
              {prevMonthDays.map(d => (<div key={`prev-${d}`} className="border-r border-b border-gray-200 p-1 lg:p-2 min-h-[60px] lg:min-h-[120px] bg-[#F0F2F5]/30"><span className="text-gray-300 font-mono text-[10px] lg:text-sm">{d}</span></div>))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const events = getEventsForDay(day);
                const isCurrentDay = day === today;
                return (
                  <div key={day} className={clsx("border-r border-b border-gray-200 p-1 lg:p-2 min-h-[60px] lg:min-h-[120px] relative group transition-colors", isCurrentDay ? "bg-teal-500/5 ring-inset ring-2 ring-teal-500/20" : "hover:bg-white/40")}>
                    <span className={clsx("font-mono text-[10px] lg:text-sm", isCurrentDay ? "text-teal-600 font-bold" : "text-gray-500")}>{day}</span>
                    {isCurrentDay && <div className="absolute top-1 lg:top-2 right-1 lg:right-2 w-1.5 lg:w-2 h-1.5 lg:h-2 bg-teal-500 rounded-full" />}
                    <div className="mt-1 lg:mt-2 space-y-1 hidden lg:block">
                      {events.map((event, i) => (<div key={i} className={clsx("p-1.5 rounded-lg text-xs cursor-pointer hover:brightness-95 transition-all shadow-sm relative overflow-hidden", CATEGORY_STYLES[event.category])}><div className="mb-0.5 pr-4 truncate" style={{ fontWeight: 700 }}>{event.title}</div>{event.time && <div className="opacity-80 font-mono text-[10px]">{event.time}</div>}{event.hasReview && <div className="absolute top-1.5 right-1.5 text-blue-600 bg-white/40 rounded-full p-0.5"><Brain size={12} /></div>}</div>))}
                    </div>
                    {events.length > 0 && (<div className="lg:hidden flex gap-0.5 mt-1 justify-center">{events.slice(0, 3).map((event, i) => (<div key={i} className={clsx("w-1.5 h-1.5 rounded-full", event.category === 'science' ? 'bg-blue-500' : event.category === 'arts' ? 'bg-pink-500' : 'bg-emerald-500')} />))}</div>)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="hidden lg:flex w-[370px] h-full bg-white border-l border-zinc-200 flex-col relative shadow-xl overflow-hidden shrink-0">
          <DailySidebarContent navigateTo={navigateTo} displayTasks={displayTasks} remainingTasks={remainingTasks} completionPct={completionPct} />
        </aside>
        <MobileDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} width={340}>
          <DailySidebarContent navigateTo={navigateTo} displayTasks={displayTasks} remainingTasks={remainingTasks} completionPct={completionPct} />
        </MobileDrawer>
      </div>
    </div>
  );
}
