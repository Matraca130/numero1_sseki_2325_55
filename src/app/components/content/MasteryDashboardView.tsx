import React, { useState, useMemo } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
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
} from 'lucide-react';
import clsx from 'clsx';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { headingStyle, components, colors } from '@/app/design-system';

// Mock data
interface CalendarEvent {
  day: number;
  title: string;
  category: 'science' | 'arts' | 'core';
  time?: string;
  hasReview?: boolean;
}

const CALENDAR_EVENTS: CalendarEvent[] = [
  { day: 4, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 6, title: 'Anatomia Patológica', category: 'arts', time: '14:00 - 15:30', hasReview: true },
  { day: 11, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 11, title: 'Bioquímica', category: 'core', time: '17:00 - 18:00' },
  { day: 14, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 18, title: 'Farmacologia I', category: 'science', time: '09:00 - 10:30', hasReview: true },
  { day: 24, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 25, title: 'Histologia', category: 'arts', time: '14:00 - 15:30' },
  { day: 27, title: 'Grupo de Estudo', category: 'core', time: '18:00 - 20:00' },
];

const TODAY_TASKS = [
  {
    id: '1',
    type: 'review' as const,
    subject: 'Psicologia Cognitiva',
    title: 'Mapeamento Conceitual',
    retention: 25,
    urgency: 'urgent' as const,
  },
  {
    id: '2',
    type: 'session' as const,
    subject: 'Fisiologia II',
    title: 'Prática de Integração',
    description: 'Complete os problemas 14-22 do Capítulo 4.',
    time: '14:00',
    isPrimary: true,
  },
  {
    id: '3',
    type: 'session' as const,
    subject: 'Anatomia',
    title: 'Ler Capítulo 4',
    description: 'Foco na seção de membro superior.',
    time: '16:30',
    duration: '45m',
  },
  {
    id: '4',
    type: 'session' as const,
    subject: 'Bioquímica',
    title: 'Revisar Anotações',
    description: 'Revisão rápida antes de dormir.',
    time: '19:00',
  },
  {
    id: '5',
    type: 'session' as const,
    subject: 'Geral',
    title: 'Diário de Estudo',
    time: '20:30',
  },
];

const CATEGORY_STYLES = {
  science: 'bg-blue-500/15 border-l-4 border-l-blue-500 text-blue-900',
  arts: 'bg-pink-500/15 border-l-4 border-l-pink-500 text-pink-900',
  core: 'bg-emerald-500/15 border-l-4 border-l-emerald-500 text-emerald-900',
};

const SUBJECT_BADGE_STYLES: Record<string, string> = {
  'Psicologia Cognitiva': 'bg-red-50 text-red-600',
  'Fisiologia II': 'bg-blue-50 text-blue-600',
  'Anatomia': 'bg-pink-50 text-pink-600',
  'Bioquímica': 'bg-emerald-50 text-emerald-600',
  'Geral': 'bg-gray-100 text-gray-500',
};

const SUBJECT_ACCENT_COLORS: Record<string, string> = {
  'Psicologia Cognitiva': 'bg-gradient-to-b from-red-500 to-orange-500',
  'Fisiologia II': 'bg-gradient-to-r from-blue-400 to-blue-600',
  'Anatomia': 'bg-gradient-to-r from-pink-400 to-pink-600',
  'Bioquímica': 'bg-gradient-to-r from-emerald-400 to-emerald-600',
  'Geral': 'bg-gray-300',
};

export function MasteryDashboardView() {
  const { navigateTo } = useStudentNav();
  const { courseProgress, stats, sessions, isConnected } = useStudentDataContext();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const prevMonthDays = [26, 27, 28, 29, 30];
  const daysInMonth = 28;
  const today = 14;
  const completionPct = isConnected && courseProgress.length > 0
    ? Math.round(courseProgress.reduce((s, c) => s + c.masteryPercent, 0) / courseProgress.length)
    : 65;

  // Build today's tasks from real data
  const realTasks = isConnected && courseProgress.length > 0
    ? (() => {
        const tasks: typeof TODAY_TASKS = [];
        // Find topics with flashcards due (reviews)
        courseProgress.forEach(cp => {
          (cp.topicProgress || []).forEach(tp => {
            if (tp.flashcardsDue > 0 && tp.masteryPercent < 50) {
              tasks.push({
                id: `review-${tp.topicId}`,
                type: 'review',
                subject: cp.courseName,
                title: tp.topicTitle,
                retention: tp.masteryPercent,
                urgency: tp.masteryPercent < 40 ? 'urgent' : 'normal' as any,
              });
            }
          });
        });
        // Add study sessions
        const sessionTypes = [
          { subject: 'Anatomia', title: 'Revisão de Flashcards', time: '14:00', isPrimary: true, description: 'Revisar cards pendentes do Membro Superior.' },
          { subject: 'Histologia', title: 'Leitura do Capítulo', time: '16:30', duration: '45m', description: 'Tecido Conjuntivo - seção 2.' },
          { subject: 'Geral', title: 'Diário de Estudo', time: '20:30' },
        ];
        sessionTypes.forEach((s, i) => {
          tasks.push({ id: `session-${i}`, type: 'session', ...s } as any);
        });
        return tasks;
      })()
    : TODAY_TASKS;

  const displayTasks = realTasks.length > 0 ? realTasks : TODAY_TASKS;
  const remainingTasks = displayTasks.filter(t => t.type === 'session').length;

  const getEventsForDay = (day: number) => CALENDAR_EVENTS.filter(e => e.day === day);

  return (
    <div className="h-full flex flex-col bg-[#f5f6fa]">
      {/* Header */}
      <div className="shrink-0">
        <AxonPageHeader
          title="Fevereiro 2026"
          subtitle="Painel de domínio do estudo"
          onBack={() => navigateTo('schedule')}
          statsLeft={
            <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 border border-gray-200/60">
              <button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400">
                <ChevronLeft size={18} />
              </button>
              <button className="px-3 py-1 text-sm text-gray-700">Hoje</button>
              <button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400">
                <ChevronRight size={18} />
              </button>
            </div>
          }
          statsRight={
            <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
              {(['day', 'week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-sm transition-all",
                    viewMode === mode
                      ? "bg-white shadow-sm text-violet-600"
                      : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                  )}
                >
                  {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          }
        />
      </div>

      {/* Content: Calendar + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 px-8 pb-2 pt-3 shrink-0">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-xs font-mono text-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex-1 px-8 pb-8 overflow-y-auto custom-scrollbar-light">
            <div className="grid grid-cols-7 h-full min-h-[600px] border-l border-t border-gray-200 rounded-bl-xl rounded-br-xl bg-white/30 backdrop-blur-sm">
              {/* Previous month days */}
              {prevMonthDays.map(d => (
                <div key={`prev-${d}`} className="border-r border-b border-gray-200 p-2 min-h-[120px] bg-gray-50/30">
                  <span className="text-gray-300 font-mono text-sm">{d}</span>
                </div>
              ))}

              {/* Current month */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const events = getEventsForDay(day);
                const isCurrentDay = day === today;

                return (
                  <div
                    key={day}
                    className={clsx(
                      "border-r border-b border-gray-200 p-2 min-h-[120px] relative group transition-colors",
                      isCurrentDay
                        ? "bg-violet-500/5 ring-inset ring-2 ring-violet-500/20"
                        : "hover:bg-white/40"
                    )}
                  >
                    <span className={clsx(
                      "font-mono text-sm",
                      isCurrentDay ? "text-violet-600 font-bold" : "text-gray-500"
                    )}>
                      {day}
                    </span>

                    {isCurrentDay && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-violet-500 rounded-full" />
                    )}

                    <div className="mt-2 space-y-1">
                      {events.map((event, i) => (
                        <div
                          key={i}
                          className={clsx(
                            "p-1.5 rounded-lg text-xs cursor-pointer hover:brightness-95 transition-all shadow-sm relative overflow-hidden",
                            CATEGORY_STYLES[event.category]
                          )}
                        >
                          <div className="font-bold mb-0.5 pr-4 truncate">{event.title}</div>
                          {event.time && (
                            <div className="opacity-80 font-mono text-[10px]">{event.time}</div>
                          )}
                          {event.hasReview && (
                            <div className="absolute top-1.5 right-1.5 text-blue-600 bg-white/40 rounded-full p-0.5">
                              <Brain size={12} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Sidebar */}
        <aside className="w-[370px] h-full bg-white/65 backdrop-blur-xl border-l border-white/60 flex flex-col relative shadow-xl overflow-hidden shrink-0">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200/50 flex items-start justify-between shrink-0">
            <div>
              <h2 className="font-bold text-gray-800 text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sexta-feira, 14</h2>
              <p className="text-gray-400 text-sm mt-1">{remainingTasks} tarefas restantes</p>
            </div>
            {/* Progress ring */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="text-violet-500 drop-shadow-md" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${completionPct}, 100`} strokeLinecap="round" strokeWidth="3" />
              </svg>
              <span className="absolute text-xs font-bold text-violet-600">{completionPct}%</span>
            </div>
          </div>

          {/* Tasks list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar-light px-6 py-4 space-y-6">
            {/* Spaced Reviews */}
            {displayTasks.filter(t => t.type === 'review').length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Revisões Espaçadas</h3>
                </div>

                {displayTasks.filter(t => t.type === 'review').map(task => (
                  <div key={task.id} className="bg-white rounded-xl p-4 shadow-md ring-1 ring-red-500/30 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-500" />
                    <div className="flex justify-between items-start mb-2">
                      <span className={clsx("px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider", SUBJECT_BADGE_STYLES[task.subject] || 'bg-gray-100 text-gray-500')}>
                        <Brain size={12} className="inline mr-1" />
                        {task.subject}
                      </span>
                      <span className="font-mono text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Urgente</span>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">{task.title}</h3>
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase">
                        <span>Retenção</span>
                        <span className="text-red-500">{task.retention}% (Crítico)</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full" style={{ width: `${task.retention}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() => navigateTo('review-session')}
                      className="w-full h-10 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm tracking-wide shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <PlayCircle size={16} className="animate-pulse" /> Iniciar Revisão
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Today's Schedule */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Agenda de Hoje</h3>
              {displayTasks.filter(t => t.type === 'session').map((task, i) => {
                const opacity = i === 0 ? '' : i === 1 ? '' : i === 2 ? 'opacity-80 hover:opacity-100' : 'opacity-60 hover:opacity-100';
                return (
                  <div
                    key={task.id}
                    className={clsx(
                      "bg-white rounded-xl p-4 shadow-sm border border-white hover:bg-white transition-colors relative overflow-hidden",
                      task.isPrimary && "ring-1 ring-violet-500/20 shadow-md",
                      opacity
                    )}
                  >
                    <div className={clsx("absolute top-0 left-0 w-1 h-full", SUBJECT_ACCENT_COLORS[task.subject] || 'bg-gray-300')} />
                    <div className="flex justify-between items-start mb-2">
                      <span className={clsx("px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider", SUBJECT_BADGE_STYLES[task.subject] || 'bg-gray-100 text-gray-500')}>
                        {task.subject}
                      </span>
                      <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{task.time}</span>
                    </div>
                    <h3 className={clsx("font-bold text-gray-800 mb-1", task.isPrimary ? '' : 'text-base')}>{task.title}</h3>
                    {task.description && <p className="text-sm text-gray-400 mb-3">{task.description}</p>}
                    {task.isPrimary && (
                      <button
                        onClick={() => navigateTo('study')}
                        className="w-full h-10 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Play size={16} /> Iniciar Sessão
                      </button>
                    )}
                    {task.duration && (
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={12} /> {task.duration}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200/50 bg-white/30 backdrop-blur-md shrink-0">
            <button className="w-full py-2.5 rounded-lg border-2 border-dashed border-violet-500/30 text-violet-600 font-bold text-sm hover:bg-violet-50 hover:border-violet-500/50 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Adicionar Nova Tarefa
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}