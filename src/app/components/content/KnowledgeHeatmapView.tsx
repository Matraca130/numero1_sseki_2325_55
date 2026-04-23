import React, { useState, useMemo, useEffect } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useBreakpoint } from '@/app/hooks/useBreakpoint';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { CATEGORY_STYLES, CATEGORY_DOT_COLORS } from '@/app/utils/categoryStyles';
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
import { MobileDrawer } from '@/app/components/layout/MobileDrawer';

/**
 * Local mock-data shape for the hardcoded CALENDAR_EVENTS array.
 * NOT the canonical CalendarEvent (see `@/app/types/calendar`).
 * This type represents a day slot in the mock UI skeleton.
 */
interface MockCalendarDayEvent {
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

const CALENDAR_EVENTS: MockCalendarDayEvent[] = [
  { day: 4, title: 'Fisiologia II', category: 'science', cards: 15 },
  { day: 6, title: 'Anatomia Patológica', category: 'arts', cards: 48, isUrgent: true, isDue: true },
  { day: 11, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 11, title: 'Bioquímica', category: 'core' },
  { day: 18, title: 'Farmacologia I', category: 'science', cards: 22 },
  { day: 24, title: 'Fisiologia II', category: 'science', time: '10:00 - 11:30' },
  { day: 24, title: '', category: 'core', noteText: '+45 cards creados' },
  { day: 25, title: 'Histologia', category: 'arts', isDue: true },
  { day: 27, title: 'Grupo de Estudio', category: 'core', time: '18:00 - 20:00' },
];

const HEAT_LEVELS: HeatLevel[] = [
  { day: 4, level: 'med' }, { day: 6, level: 'high' }, { day: 10, level: 'med' }, { day: 18, level: 'med' }, { day: 25, level: 'high' },
];

// Module-scope constants — avoid re-allocation on every render.
const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const PREV_MONTH_DAYS = [26, 27, 28, 29, 30];
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

// Pre-index the mock events + heat levels by day so the 28 per-day lookups
// in the render loop become O(1) instead of re-scanning the arrays on every
// `getEventsForDay` / `getHeatLevel` call. Mirrors the indexing pattern used
// in MasteryDashboardView (eventsByDay) — the two views now optimize hot
// paths the same way.
const EVENTS_BY_DAY = CALENDAR_EVENTS.reduce<Map<number, MockCalendarDayEvent[]>>(
  (map, ev) => {
    const list = map.get(ev.day);
    if (list) list.push(ev);
    else map.set(ev.day, [ev]);
    return map;
  },
  new Map(),
);
const HEAT_LEVEL_BY_DAY: Map<number, 'high' | 'med' | 'none'> = new Map(
  HEAT_LEVELS.map((h) => [h.day, h.level]),
);

const TIMELINE_DATA = {
  activeSession: { subject: 'Fisiologia II: Integração', retentionBoost: 15, progress: 65 },
  overallRetention: 84,
  criticalAlert: { subject: 'Anatomia Patológica: Neoplasias', retention: 45, message: 'Salteaste la última revisión. La retención cayó a 45%.' },
};


// ── Línea de Memoria Sidebar Content (extracted for reuse in drawer) ──
function MemoryTimelineSidebar({ navigateTo, isConnected, stats, bktStates, overallRetention, criticalTopic }: {
  navigateTo: (route: string) => void; isConnected: boolean; stats: any; bktStates: any[]; overallRetention: number;
  criticalTopic: { topicTitle: string; masteryPercent: number; flashcardsDue: number } | null;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-6 py-4 lg:py-6 border-b border-gray-200/50 flex items-start justify-between shrink-0 bg-white/20">
        <div>
          <h2 className="text-gray-800 text-base lg:text-lg" style={{ fontWeight: 700, fontFamily: "Georgia, serif" }}>Línea de Memoria</h2>
          <p className="text-gray-400 text-xs mt-1">Impacto del estudio de hoy en la retención</p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center bg-teal-50 rounded-xl shadow-sm border border-white"><Activity size={18} className="text-teal-500" /></div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 lg:px-6 py-4 lg:py-6 space-y-6 lg:space-y-8">
        <div className="relative pl-4 border-l-2 border-teal-500/30">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-teal-500 border-4 border-[#f5f6fa]" />
          <div className="mb-6">
            <h3 className="text-sm text-gray-700 mb-2" style={{ fontWeight: 700 }}>Ahora (14 Feb)</h3>
            <div className="bg-white rounded-xl p-3 lg:p-4 shadow-md ring-1 ring-teal-500/20 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><Brain size={18} /></div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400" style={{ fontWeight: 700 }}>{isConnected && stats ? 'Sesión Actual' : 'Sesión Activa'}</div>
                  <div className="text-sm text-gray-800 truncate" style={{ fontWeight: 700 }}>{isConnected && stats ? `${stats.totalSessions} sesiones realizadas` : TIMELINE_DATA.activeSession.subject}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-gray-400">{isConnected ? 'Retención Media' : 'Aumento de Retención Proyectado'}</span><span className="text-emerald-600" style={{ fontWeight: 700 }}>{isConnected && bktStates.length > 0 ? `${Math.round(bktStates.reduce((s: number, b: any) => s + b.p_know, 0) / bktStates.length * 100)}%` : `+${TIMELINE_DATA.activeSession.retentionBoost}%`}</span></div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${isConnected && bktStates.length > 0 ? Math.round(bktStates.reduce((s: number, b: any) => s + b.p_know, 0) / bktStates.length * 100) : TIMELINE_DATA.activeSession.progress}%` }} /></div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative pl-4 border-l-2 border-dashed border-gray-300">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-300 border-4 border-[#f5f6fa]" />
          <div className="mb-6">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2" style={{ fontWeight: 700 }}>Mañana (15 Feb)</h3>
            <div className="bg-white/60 rounded-xl p-3 border border-white hover:bg-white transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1"><span className="text-sm text-gray-700" style={{ fontWeight: 700 }}>Primera Revisión</span><span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 self-start" style={{ fontWeight: 500 }}>Prioridad Media</span></div>
              <p className="text-xs text-gray-400 leading-relaxed">Completar la sesión de hoy agendará una revisión corta para mañana para solidificar los trazos iniciales.</p>
            </div>
          </div>
        </div>
        <div className="relative pl-4 border-l-2 border-dashed border-gray-300">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-300 border-4 border-[#f5f6fa]" />
          <div className="mb-6">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2" style={{ fontWeight: 700 }}>En 3 Días (17 Feb)</h3>
            <div className="bg-white/40 rounded-xl p-3 border border-white/60">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1"><span className="text-sm text-gray-700" style={{ fontWeight: 700 }}>Consolidación</span><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 self-start" style={{ fontWeight: 500 }}>Bajo Esfuerzo</span></div>
              <p className="text-xs text-gray-400 leading-relaxed">La estabilidad de la memoria alcanza 80%. Una revisión rápida de 5 min extenderá la retención por 2 semanas.</p>
            </div>
          </div>
        </div>
        <div className="relative pl-4 border-l-2 border-red-200">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-400 border-4 border-[#f5f6fa] animate-pulse" />
          <div>
            <h3 className="text-xs text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1" style={{ fontWeight: 700 }}><AlertTriangle size={12} /> Caída Crítica</h3>
            <div className="bg-red-50 rounded-xl p-3 lg:p-4 border border-red-100 shadow-sm">
              <h4 className="text-sm text-red-900 mb-1" style={{ fontWeight: 700 }}>{criticalTopic ? criticalTopic.topicTitle : TIMELINE_DATA.criticalAlert.subject}</h4>
              <p className="text-xs text-red-700/80 mb-3">{criticalTopic ? `La retención cayó a ${criticalTopic.masteryPercent}%. ${criticalTopic.flashcardsDue} cards pendientes.` : TIMELINE_DATA.criticalAlert.message}</p>
              <button onClick={() => navigateTo('review-session')} className="w-full py-2 bg-white border border-red-200 text-red-600 text-xs rounded shadow-sm hover:bg-red-50 transition-colors min-h-[44px]" style={{ fontWeight: 700 }}>Agendar Revisión de Emergencia</button>
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 lg:p-4 border-t border-gray-200/50 bg-white shrink-0">
        <div className="bg-white/60 rounded-lg p-3 border border-white/60 flex items-center justify-between">
          <div><div className="text-[10px] text-gray-400 uppercase tracking-wider" style={{ fontWeight: 700 }}>Retención General</div><div className="text-2xl text-gray-800" style={{ fontWeight: 700, fontFamily: "Georgia, serif" }}>{overallRetention}%</div></div>
          <div className="h-10 w-24"><svg className="w-full h-full text-emerald-500" preserveAspectRatio="none" viewBox="0 0 100 40"><path d="M0 30 Q 10 35, 20 25 T 40 20 T 60 15 T 80 5 L 100 10 L 100 40 L 0 40 Z" fill="currentColor" opacity="0.2" /><path d="M0 30 Q 10 35, 20 25 T 40 20 T 60 15 T 80 5 L 100 10" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
        </div>
      </div>
    </div>
  );
}

export function KnowledgeHeatmapView() {
  const { navigateTo } = useStudentNav();
  const { dailyActivity, bktStates, stats, isConnected } = useStudentDataContext();
  const { tree } = useContentTree();
  const [selectedDay, setSelectedDay] = useState<number | null>(6);
  const [currentMonth] = useState('Febrero 2026');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const topicLookup = useMemo(() => {
    const map = new Map<string, string>();
    if (!tree) return map;
    for (const course of tree.courses) for (const semester of course.semesters) for (const section of semester.sections) for (const topic of section.topics) map.set(topic.id, topic.name);
    return map;
  }, [tree]);

  const daysOfWeek = DAYS_OF_WEEK;
  const prevMonthDays = PREV_MONTH_DAYS;
  const daysInMonth = 28;
  const today = 14;

  // Layout-triggering media queries must be read in an effect, not during
  // render, to avoid forced synchronous style/layout reads each render.
  // Shared `useBreakpoint` hook (SSR-safe, event-driven via matchMedia).
  const isDesktop = useBreakpoint('lg');

  const activityMap = useMemo(() => {
    const map = new Map<number, { minutes: number; cards: number; retention: number | null; sessions: number }>();
    if (isConnected && dailyActivity.length > 0) {
      dailyActivity.forEach(d => { const date = new Date(d.date + 'T12:00:00'); if (date.getMonth() === 1 && date.getFullYear() === 2026) map.set(date.getDate(), { minutes: d.studyMinutes, cards: d.cardsReviewed, retention: d.retentionPercent ?? null, sessions: d.sessionsCount }); });
    }
    return map;
  }, [isConnected, dailyActivity]);

  const getHeatLevel = (day: number): 'high' | 'med' | 'none' => {
    const data = activityMap.get(day);
    if (data && data.minutes > 0) { if (data.minutes >= 80) return 'high'; if (data.minutes >= 30) return 'med'; return 'none'; }
    if (!isConnected || activityMap.size === 0) { return HEAT_LEVEL_BY_DAY.get(day) ?? 'none'; }
    return 'none';
  };

  const getEventsForDay = (day: number) => {
    const data = activityMap.get(day);
    const mockEvents = EVENTS_BY_DAY.get(day) ?? [];
    if (isConnected && data && data.minutes > 0) { const realEvent: MockCalendarDayEvent = { day, title: `${data.sessions} sesión(es)`, category: 'core', cards: data.cards > 0 ? data.cards : undefined, noteText: `${data.minutes} min estudiados` }; return mockEvents.length > 0 ? mockEvents : [realEvent]; }
    return mockEvents;
  };

  const overallRetention = useMemo(
    () => isConnected && bktStates.length > 0
      ? Math.round(bktStates.reduce((sum, b) => sum + b.p_know, 0) / bktStates.length * 100)
      : TIMELINE_DATA.overallRetention,
    [isConnected, bktStates],
  );

  const criticalTopic = useMemo(() => {
    if (!(isConnected && bktStates.length > 0)) return null;
    let worst = bktStates[0];
    for (let i = 1; i < bktStates.length; i++) {
      if (bktStates[i].p_know < worst.p_know) worst = bktStates[i];
    }
    return worst ? {
      topicId: worst.subtopic_id,
      topicTitle: topicLookup.get(worst.subtopic_id) || `Subtópico ${worst.subtopic_id.slice(0, 8)}`,
      masteryPercent: Math.round(worst.p_know * 100),
      flashcardsDue: worst.total_attempts > 0 ? Math.max(1, 5 - worst.correct_attempts) : 5,
    } : null;
  }, [isConnected, bktStates, topicLookup]);

  const heatBg = (level: string) => {
    if (level === 'high') return 'bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.08)_0%,transparent_80%)]';
    if (level === 'med') return 'bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.06)_0%,transparent_80%)]';
    return '';
  };

  return (
    <div className="h-full flex flex-col bg-[#f5f6fa]">
      <div className="shrink-0">
        <AxonPageHeader
          title="Mapa de Conocimiento"
          subtitle="Mapa de calor de conocimiento"
          onBack={() => navigateTo('schedule')}
          statsLeft={<div className="flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-xs text-gray-500 bg-white/60 px-2 lg:px-3 py-1.5 rounded-full border border-gray-200/60 overflow-x-auto whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Alta carga<span className="w-2 h-2 rounded-full bg-orange-500 ml-1 lg:ml-2 shrink-0" /> Media<span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 lg:ml-2 shrink-0" /> Baja</div>}
          statsRight={<div className="flex items-center gap-2"><button onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-lg border border-gray-200/60 text-gray-600 text-sm min-h-[44px]"><Activity size={16} className="text-teal-500" /><span className="hidden sm:inline">Timeline</span></button><div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 border border-gray-200/60"><button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronLeft size={18} /></button><button className="px-2 lg:px-3 py-1 text-sm text-gray-700 whitespace-nowrap">{currentMonth}</button><button className="p-1 hover:bg-white rounded-md transition-colors text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center"><ChevronRight size={18} /></button></div></div>}
        />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="grid grid-cols-7 border-b border-gray-200 px-4 lg:px-8 pb-2 pt-3 lg:pt-4 shrink-0">
            {daysOfWeek.map(day => (<div key={day} className="text-center text-[10px] lg:text-xs font-mono text-gray-400 uppercase tracking-wider">{day}</div>))}
          </div>
          <div className="flex-1 px-2 lg:px-8 pb-4 lg:pb-8 overflow-y-auto custom-scrollbar-light relative">
            <div className="grid grid-cols-7 h-full min-h-[400px] lg:min-h-[600px] border-l border-t border-gray-200 rounded-bl-xl rounded-br-xl bg-white relative">
              <AnimatePresence>
                {selectedDay !== null && selectedDay > 0 && selectedDay <= daysInMonth && (() => {
                  const dayData = activityMap.get(selectedDay);
                  const dayEvents = getEventsForDay(selectedDay);
                  if (dayEvents.length === 0 && !dayData) return null;
                  const retention = dayData?.retention ?? 72;
                  const cards = dayData?.cards ?? dayEvents.reduce((s, e) => s + (e.cards || 0), 0);
                  const pending = isConnected ? bktStates.filter(b => b.p_know < 0.5).length : 12;
                  const dayIndex = prevMonthDays.length + selectedDay - 1;
                  const row = Math.floor(dayIndex / 7);
                  const col = dayIndex % 7;
                  const topPx = 20 + row * 130;
                  const leftPx = Math.min(col * 140 + 60, 500);
                  return (
                    <motion.div key={`popover-${selectedDay}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className={clsx("absolute z-50 bg-white rounded-xl shadow-xl border border-zinc-200 p-4", "left-2 right-2 bottom-2 lg:bottom-auto lg:left-auto lg:right-auto lg:w-72")}
                      style={isDesktop ? { top: `${topPx}px`, left: `${leftPx}px` } : undefined}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-pink-700" style={{ fontWeight: 700, fontFamily: "Georgia, serif" }}>{dayEvents[0]?.title || `Día ${selectedDay}`}</h4>
                        <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 -mt-2"><X size={14} /></button>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center"><div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Retención</div><div className={clsx("text-xl", retention >= 70 ? 'text-emerald-500' : retention >= 50 ? 'text-orange-500' : 'text-red-500')} style={{ fontWeight: 700 }}>{retention}%</div></div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="text-center"><div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Cards</div><div className="text-xl text-gray-800" style={{ fontWeight: 700 }}>{cards}</div></div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="text-center"><div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Pendientes</div><div className="text-xl text-red-500" style={{ fontWeight: 700 }}>{pending}</div></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-gray-400">Fuerza de la Memoria</span><span className={clsx(retention >= 70 ? 'text-emerald-600' : 'text-pink-600')}>{retention >= 80 ? 'Fuerte' : retention >= 60 ? 'Moderada' : 'Debilitándose'}</span></div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className={clsx("h-full rounded-full", retention >= 70 ? 'bg-emerald-500' : 'bg-pink-500')} style={{ width: `${retention}%` }} /></div>
                      </div>
                      <button onClick={() => navigateTo('review-session')} className="mt-4 w-full py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-sm rounded-full transition-colors flex items-center justify-center gap-2 min-h-[44px]" style={{ fontWeight: 700 }}><PlayCircle size={16} /> Revisar Ahora</button>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
              {prevMonthDays.map(d => (<div key={`prev-${d}`} className="border-r border-b border-gray-200 p-1 lg:p-2 min-h-[60px] lg:min-h-[120px] bg-[#F0F2F5]/30"><span className="text-gray-300 font-mono text-[10px] lg:text-sm">{d}</span></div>))}
              {MONTH_DAYS.map(day => {
                const heat = getHeatLevel(day);
                const events = getEventsForDay(day);
                const isCurrentDay = day === today;
                const hasUrgent = events.some(e => e.isUrgent);
                return (
                  <div key={day} onClick={() => events.length > 0 && setSelectedDay(day === selectedDay ? null : day)}
                    className={clsx("border-r border-b border-gray-200 p-1 lg:p-2 min-h-[60px] lg:min-h-[120px] relative group transition-colors cursor-pointer", isCurrentDay ? "bg-teal-500/5 ring-inset ring-2 ring-teal-500/20" : "hover:bg-white/40", heatBg(heat))}>
                    <span className={clsx("font-mono text-[10px] lg:text-sm", isCurrentDay ? "text-teal-600" : heat === 'high' ? "text-red-500" : "text-gray-500", (isCurrentDay || heat === 'high') && "font-bold")}>{day}</span>
                    {heat !== 'none' && (<div className="absolute top-1 lg:top-2 right-1 lg:right-2 flex gap-0.5 lg:gap-1"><div className={clsx("w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full", heat === 'high' ? 'bg-red-500' : 'bg-orange-500')} />{hasUrgent && <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-red-500 animate-pulse" />}</div>)}
                    {isCurrentDay && <div className="absolute top-1 lg:top-2 right-1 lg:right-2 w-1.5 lg:w-2 h-1.5 lg:h-2 bg-teal-500 rounded-full animate-pulse" />}
                    <div className="mt-1 lg:mt-2 space-y-1 hidden lg:block">
                      {events.map((event, i) => (<div key={`${day}-${event.title}-${event.category}-${i}`} className={clsx("p-1.5 rounded-lg text-xs cursor-pointer transition-all shadow-sm", CATEGORY_STYLES[event.category], event.isUrgent && "ring-2 ring-pink-400/30")}>
                        {event.title && <div className="mb-0.5 pr-4 truncate" style={{ fontWeight: 700 }}>{event.title}</div>}
                        {event.cards && <div className="flex items-center gap-1 text-[10px] opacity-80"><RotateCcw size={10} /> {event.cards} cards</div>}
                        {event.time && <div className="opacity-80 font-mono text-[10px]">{event.time}</div>}
                        {event.isDue && !event.cards && <div className="flex items-center gap-1 text-[10px]" style={{ fontWeight: 700 }}><AlertTriangle size={10} /> Revisión Pendiente</div>}
                        {event.noteText && <div className="text-xs text-gray-500 italic bg-white/50 border border-white rounded p-1.5 mt-1">{event.noteText}</div>}
                      </div>))}
                    </div>
                    {events.length > 0 && (<div className="lg:hidden flex gap-0.5 mt-1 justify-center">{events.slice(0, 3).map((event, i) => (<div key={`${day}-dot-${event.title}-${event.category}-${i}`} className={clsx("w-1.5 h-1.5 rounded-full", CATEGORY_DOT_COLORS[event.category] ?? 'bg-emerald-500')} />))}</div>)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="hidden lg:flex w-[360px] h-full bg-white border-l border-zinc-200 flex-col relative shadow-xl overflow-hidden shrink-0">
          <MemoryTimelineSidebar navigateTo={navigateTo} isConnected={isConnected} stats={stats} bktStates={bktStates} overallRetention={overallRetention} criticalTopic={criticalTopic} />
        </aside>
        <MobileDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} width={340}>
          <MemoryTimelineSidebar navigateTo={navigateTo} isConnected={isConnected} stats={stats} bktStates={bktStates} overallRetention={overallRetention} criticalTopic={criticalTopic} />
        </MobileDrawer>
      </div>
    </div>
  );
}
