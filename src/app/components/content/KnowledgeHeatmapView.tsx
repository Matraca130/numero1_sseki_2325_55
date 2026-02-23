import React, { useState } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  PlayCircle,
  TrendingUp,
  Activity,
  Brain,
  RotateCcw,
  Calendar,
  Clock,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { headingStyle, components, colors } from '@/app/design-system';

// Mock calendar data for the heatmap
interface CalendarEvent {
  day: number;
  title: string;
  category: 'science' | 'arts' | 'core';
  cards?: number;
  time?: string;
  isUrgent?: boolean;
  isDue?: boolean;
  noteText?: string;
}

interface HeatLevel {
  day: number;
  level: 'high' | 'med' | 'none';
}

const CALENDAR_EVENTS: CalendarEvent[] = [
  { day: 4, title: 'Fisiologia II', category: 'science', cards: 15 },
  { day: 6, title: 'Anatomia Patológica', category: 'arts', cards: 48, isUrgent: true, isDue: true },
  { day: 11, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 11, title: 'Bioquímica', category: 'core' },
  { day: 18, title: 'Farmacologia I', category: 'science', cards: 22 },
  { day: 24, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 24, title: '', category: 'core', noteText: '+45 cards criados' },
  { day: 25, title: 'Histologia', category: 'arts', isDue: true },
  { day: 27, title: 'Grupo de Estudo', category: 'core', time: '18:00 - 20:00' },
];

const HEAT_LEVELS: HeatLevel[] = [
  { day: 4, level: 'med' },
  { day: 6, level: 'high' },
  { day: 10, level: 'med' },
  { day: 18, level: 'med' },
  { day: 25, level: 'high' },
];

// Memory timeline data
const TIMELINE_DATA = {
  activeSession: { subject: 'Fisiologia II: Integração', retentionBoost: 15, progress: 65 },
  overallRetention: 84,
  criticalAlert: {
    subject: 'Anatomia Patológica: Neoplasias',
    retention: 45,
    message: 'Você pulou a última revisão. A retenção caiu para 45%.',
  },
};

const CATEGORY_STYLES = {
  science: 'bg-blue-500/15 border-l-4 border-l-blue-500 text-blue-900',
  arts: 'bg-pink-500/15 border-l-4 border-l-pink-500 text-pink-900',
  core: 'bg-emerald-500/15 border-l-4 border-l-emerald-500 text-emerald-900',
};

export function KnowledgeHeatmapView() {
  const { navigateTo } = useStudentNav();
  const { dailyActivity, courseProgress, stats, isConnected } = useStudentDataContext();
  const [selectedDay, setSelectedDay] = useState<number | null>(6);
  const [currentMonth] = useState('Fevereiro 2026');

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Calendar grid: Feb 2026 starts on Sunday
  const prevMonthDays = [26, 27, 28, 29, 30]; // from previous month
  const daysInMonth = 28; // Feb 2026
  const today = 14;

  // Build heat levels from real daily activity data
  const activityMap = new Map<number, { minutes: number; cards: number; retention: number | null }>();
  if (isConnected && dailyActivity.length > 0) {
    dailyActivity.forEach(d => {
      const date = new Date(d.date + 'T12:00:00');
      if (date.getMonth() === 1 && date.getFullYear() === 2026) { // February 2026
        activityMap.set(date.getDate(), {
          minutes: d.studyMinutes,
          cards: d.cardsReviewed,
          retention: d.retentionPercent ?? null,
        });
      }
    });
  }

  const getHeatLevel = (day: number): 'high' | 'med' | 'none' => {
    const data = activityMap.get(day);
    if (!data || data.minutes === 0) return 'none';
    if (data.minutes >= 80) return 'high';
    if (data.minutes >= 30) return 'med';
    return 'none';
  };

  const getEventsForDay = (day: number) => {
    const data = activityMap.get(day);
    if (!data || data.minutes === 0) return CALENDAR_EVENTS.filter(e => e.day === day);
    // Merge real activity with calendar events
    return CALENDAR_EVENTS.filter(e => e.day === day);
  };

  // Compute overall retention from real data
  const overallRetention = isConnected && stats
    ? Math.round(
        courseProgress.reduce((sum, cp) => sum + cp.masteryPercent, 0) /
        Math.max(courseProgress.length, 1)
      )
    : TIMELINE_DATA.overallRetention;

  // Find critical topics (lowest mastery)
  const criticalTopic = isConnected && courseProgress.length > 0
    ? courseProgress
        .flatMap(cp => cp.topicProgress || [])
        .sort((a, b) => a.masteryPercent - b.masteryPercent)[0]
    : null;

  const heatBg = (level: string) => {
    if (level === 'high') return 'bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.08)_0%,transparent_80%)]';
    if (level === 'med') return 'bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.06)_0%,transparent_80%)]';
    return '';
  };

  return (
    <div className="h-full flex flex-col bg-[#f5f6fa]">
      {/* Header */}
      <div className="shrink-0">
        <AxonPageHeader
          title="Knowledge Heatmap"
          subtitle="Mapa de calor de conhecimento"
          onBack={() => navigateTo('schedule')}
          statsLeft={
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/60 px-3 py-1.5 rounded-full border border-gray-200/60">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Alta carga
              <span className="w-2 h-2 rounded-full bg-orange-500 ml-2" /> Média
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2" /> Baixa
            </div>
          }
          statsRight={
            <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 border border-gray-200/60">
              <button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400">
                <ChevronLeft size={18} />
              </button>
              <button className="px-3 py-1 text-sm text-gray-700">{currentMonth}</button>
              <button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400">
                <ChevronRight size={18} />
              </button>
            </div>
          }
        />
      </div>

      {/* Content: Calendar + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 px-8 pb-2 pt-4 shrink-0">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-xs font-mono text-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex-1 px-8 pb-8 overflow-y-auto custom-scrollbar-light relative">
            <div className="grid grid-cols-7 h-full min-h-[600px] border-l border-t border-gray-200 rounded-bl-xl rounded-br-xl bg-white/30 backdrop-blur-sm relative">
              
              {/* Popover for selected day */}
              <AnimatePresence>
                {selectedDay === 6 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-[140px] left-[200px] z-50 w-72 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/80 p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-pink-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Anatomia Patológica</h4>
                      <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Retenção</div>
                        <div className="text-xl font-bold text-orange-500">72%</div>
                      </div>
                      <div className="h-8 w-px bg-gray-200" />
                      <div className="text-center">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Cards</div>
                        <div className="text-xl font-bold text-gray-800">48</div>
                      </div>
                      <div className="h-8 w-px bg-gray-200" />
                      <div className="text-center">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Pendentes</div>
                        <div className="text-xl font-bold text-red-500">12</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Força da Memória</span>
                        <span className="text-pink-600">Enfraquecendo</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 w-[72%] rounded-full" />
                      </div>
                    </div>
                    <button
                      onClick={() => navigateTo('review-session')}
                      className="mt-4 w-full py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <PlayCircle size={16} /> Revisar Agora
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Previous month days */}
              {prevMonthDays.map(d => (
                <div key={`prev-${d}`} className="border-r border-b border-gray-200 p-2 min-h-[120px] bg-gray-50/30">
                  <span className="text-gray-300 font-mono text-sm">{d}</span>
                </div>
              ))}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const heat = getHeatLevel(day);
                const events = getEventsForDay(day);
                const isCurrentDay = day === today;
                const hasUrgent = events.some(e => e.isUrgent);

                return (
                  <div
                    key={day}
                    onClick={() => events.length > 0 && setSelectedDay(day === selectedDay ? null : day)}
                    className={clsx(
                      "border-r border-b border-gray-200 p-2 min-h-[120px] relative group transition-colors cursor-pointer",
                      isCurrentDay
                        ? "bg-violet-500/5 ring-inset ring-2 ring-violet-500/20"
                        : "hover:bg-white/40",
                      heatBg(heat)
                    )}
                  >
                    <span className={clsx(
                      "font-mono text-sm",
                      isCurrentDay ? "text-violet-600 font-bold" : heat === 'high' ? "text-red-500 font-bold" : "text-gray-500"
                    )}>
                      {day}
                    </span>

                    {/* Heat indicators */}
                    {heat !== 'none' && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", heat === 'high' ? 'bg-red-500' : 'bg-orange-500')} />
                        {hasUrgent && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                      </div>
                    )}

                    {isCurrentDay && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                    )}

                    {/* Events */}
                    <div className="mt-2 space-y-1">
                      {events.map((event, i) => (
                        <div
                          key={i}
                          className={clsx(
                            "p-1.5 rounded-lg text-xs cursor-pointer transition-all shadow-sm",
                            CATEGORY_STYLES[event.category],
                            event.isUrgent && "ring-2 ring-pink-400/30"
                          )}
                        >
                          {event.title && <div className="font-bold mb-0.5 pr-4 truncate">{event.title}</div>}
                          {event.cards && (
                            <div className="flex items-center gap-1 text-[10px] opacity-80">
                              <RotateCcw size={10} /> {event.cards} cards
                            </div>
                          )}
                          {event.time && (
                            <div className="opacity-80 font-mono text-[10px]">{event.time}</div>
                          )}
                          {event.isDue && !event.cards && (
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              <AlertTriangle size={10} /> Revisão Pendente
                            </div>
                          )}
                          {event.noteText && (
                            <div className="text-xs text-gray-500 italic bg-white/50 border border-white rounded p-1.5 mt-1">
                              {event.noteText}
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

        {/* Memory Timeline Sidebar */}
        <aside className="w-[360px] h-full bg-white/65 backdrop-blur-xl border-l border-white/60 flex flex-col relative shadow-xl overflow-hidden shrink-0">
          {/* Sidebar header */}
          <div className="px-6 py-6 border-b border-gray-200/50 flex items-start justify-between shrink-0 bg-white/20">
            <div>
              <h2 className="font-bold text-gray-800 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Memory Timeline</h2>
              <p className="text-gray-400 text-xs mt-1">Impacto do estudo de hoje na retenção</p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center bg-white/50 rounded-xl shadow-sm border border-white">
              <Activity size={18} className="text-violet-500" />
            </div>
          </div>

          {/* Timeline content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar-light px-6 py-6 space-y-8">
            {/* Now */}
            <div className="relative pl-4 border-l-2 border-violet-500/30">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-violet-500 border-4 border-[#f5f6fa]" />
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Agora (14 Fev)</h3>
                <div className="bg-white rounded-xl p-4 shadow-md ring-1 ring-violet-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <Brain size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sessão Ativa</div>
                      <div className="text-sm font-bold text-gray-800">{TIMELINE_DATA.activeSession.subject}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Aumento de Retenção Projetado</span>
                      <span className="text-emerald-600 font-bold">+{TIMELINE_DATA.activeSession.retentionBoost}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full" style={{ width: `${TIMELINE_DATA.activeSession.progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tomorrow */}
            <div className="relative pl-4 border-l-2 border-dashed border-gray-300">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-300 border-4 border-[#f5f6fa]" />
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Amanhã (15 Fev)</h3>
                <div className="bg-white/60 rounded-xl p-3 border border-white hover:bg-white transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-gray-700">Primeira Revisão</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">Prioridade Média</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Completar a sessão de hoje agendará uma revisão curta para amanhã para solidificar os traços iniciais.
                  </p>
                </div>
              </div>
            </div>

            {/* In 3 days */}
            <div className="relative pl-4 border-l-2 border-dashed border-gray-300">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-300 border-4 border-[#f5f6fa]" />
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Em 3 Dias (17 Fev)</h3>
                <div className="bg-white/40 rounded-xl p-3 border border-white/60">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-gray-700">Consolidação</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700">Baixo Esforço</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Estabilidade da memória atinge 80%. Uma revisão rápida de 5 min estenderá a retenção para 2 semanas.
                  </p>
                </div>
              </div>
            </div>

            {/* Critical */}
            <div className="relative pl-4 border-l-2 border-red-200">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-400 border-4 border-[#f5f6fa] animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Queda Crítica
                </h3>
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100 shadow-sm">
                  <h4 className="text-sm font-bold text-red-900 mb-1">
                    {criticalTopic
                      ? `${criticalTopic.sectionTitle}: ${criticalTopic.topicTitle}`
                      : TIMELINE_DATA.criticalAlert.subject}
                  </h4>
                  <p className="text-xs text-red-700/80 mb-3">
                    {criticalTopic
                      ? `Retenção caiu para ${criticalTopic.masteryPercent}%. ${criticalTopic.flashcardsDue} cards pendentes.`
                      : TIMELINE_DATA.criticalAlert.message}
                  </p>
                  <button
                    onClick={() => navigateTo('review-session')}
                    className="w-full py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded shadow-sm hover:bg-red-50 transition-colors"
                  >
                    Agendar Revisão de Emergência
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200/50 bg-white/30 backdrop-blur-md shrink-0">
            <div className="bg-white/60 rounded-lg p-3 border border-white/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Retenção Geral</div>
                <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{overallRetention}%</div>
              </div>
              <div className="h-10 w-24">
                <svg className="w-full h-full text-emerald-500" preserveAspectRatio="none" viewBox="0 0 100 40">
                  <path d="M0 30 Q 10 35, 20 25 T 40 20 T 60 15 T 80 5 L 100 10 L 100 40 L 0 40 Z" fill="currentColor" opacity="0.2" />
                  <path d="M0 30 Q 10 35, 20 25 T 40 20 T 60 15 T 80 5 L 100 10" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}