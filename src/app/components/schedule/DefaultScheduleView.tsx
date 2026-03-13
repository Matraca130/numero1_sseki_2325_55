// ============================================================
// Axon — Default Schedule View (no study plans)
// Shown when the user has no active study plans.
// Extracted from ScheduleView.tsx for modularization.
// ============================================================
import React, { useState } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle } from '@/app/design-system';
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
  Plus,
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
} from 'date-fns';
import { es } from 'date-fns/locale';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { getAxonToday } from '@/app/utils/constants';
import { QuickNavLinks } from '@/app/components/schedule/QuickNavLinks';
import {
  buildFallbackEvents,
  UPCOMING_EXAMS,
  COMPLETED_TASKS,
} from '@/app/components/schedule/scheduleFallbackData';

const SCHEDULE_EVENTS = buildFallbackEvents();

export function DefaultScheduleView() {
  const { navigateTo } = useStudentNav();
  const [currentDate, setCurrentDate] = useState(getAxonToday());
  const [selectedDate, setSelectedDate] = useState<Date>(getAxonToday());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    provas: false,
    completado: false,
  });
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  const getEventsForDay = (date: Date) => {
    return SCHEDULE_EVENTS.filter(event => isSameDay(event.date, date));
  };

  const selectedEvents = getEventsForDay(selectedDate);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-light bg-surface-dashboard">
      {/* AXON Page Header */}
      <div>
        <AxonPageHeader
          title="Cronograma"
          subtitle="Organiza tu rutina de estudios"
          statsLeft={
            <p className="text-gray-500 text-sm">
              {SCHEDULE_EVENTS.length} eventos agendados
            </p>
          }
          actionButton={
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigateTo('organize-study')}
                className="flex items-center gap-2 px-6 py-2.5 bg-axon-accent hover:bg-axon-hover rounded-full text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0"
              >
                <Plus size={15} /> Organizar Estudio
              </button>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <button
                  onClick={() => setViewMode('month')}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === 'month' ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  Mes
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

      {/* 2-Column Layout */}
      <div className="flex w-full">
        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0 p-8">
          {/* Calendar Controls */}
          <div className="bg-white rounded-t-2xl border border-gray-100 border-b-0 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 capitalize flex items-center gap-2" style={headingStyle}>
              <CalendarIcon size={20} className="text-axon-accent" />
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setCurrentDate(getAxonToday())} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
                Hoy
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white border border-gray-100 border-t-gray-200/60 rounded-b-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden min-h-[500px]">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
              {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(day => (
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
                      isSelected && "bg-[#e6f5f1]/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={clsx(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-all",
                        isTodayDate
                          ? "bg-axon-accent text-white shadow-md"
                          : isSelected
                            ? "bg-axon-accent text-white"
                            : "text-gray-700"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-axon-accent" />
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
                      <div className="absolute inset-0 border-2 border-axon-accent pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-[#2d3e50] border-l border-white/10 shadow-xl flex flex-col z-10 sticky top-0 self-start max-h-screen">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#263545]">
            <h3 className="font-semibold text-white text-lg" style={headingStyle}>Detalles del Dia</h3>
            <span className="text-sm font-medium text-[#99d7c7] bg-axon-accent/20 px-3 py-1 rounded-full">
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 space-y-8 bg-[#2d3e50]">
            {/* What to study today */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-axon-accent" />
                <h4 className="font-semibold text-white text-sm uppercase tracking-wide" style={headingStyle}>Que estudiar hoy</h4>
              </div>

              {selectedEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedEvents.map((event, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
                      <div className={clsx("absolute left-0 top-0 bottom-0 w-1", event.type === 'exam' ? 'bg-red-400' : 'bg-axon-accent')} />
                      <div className="flex justify-between items-start mb-2">
                        <span className={clsx(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          event.type === 'exam' ? 'bg-red-500/20 text-red-300' : 'bg-axon-accent/20 text-[#99d7c7]'
                        )}>
                          {event.type === 'exam' ? 'Examen' : 'Estudio'}
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
                          <Star size={12} /> Alta prioridad
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-white/15 rounded-2xl bg-white/5">
                  <p className="text-sm font-medium text-white/40">Nada planificado para este dia.</p>
                  <button className="mt-2 text-xs font-medium text-axon-accent hover:text-[#99d7c7]">
                    + Agregar tarea
                  </button>
                </div>
              )}
            </section>

            {/* Upcoming Exams */}
            <section>
              <button
                onClick={() => toggleSection('provas')}
                className="flex items-center gap-2 mb-4 w-full group cursor-pointer"
              >
                <AlertCircle size={18} className="text-red-400" />
                <h4 className="font-semibold text-white text-sm uppercase tracking-wide flex-1 text-left" style={headingStyle}>Proximos Examenes</h4>
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
                            <p className="text-xs text-red-300 font-medium">{exam.date} - {exam.daysLeft === 0 ? 'HOY!' : `Faltan ${exam.daysLeft} dias`}</p>
                          </div>
                          {exam.priority === 'high' && (
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Alta Prioridad" />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Recently Completed */}
            <section>
              <button
                onClick={() => toggleSection('completado')}
                className="flex items-center gap-2 mb-4 w-full group cursor-pointer"
              >
                <CheckCircle2 size={18} className="text-axon-accent" />
                <h4 className="font-semibold text-white text-sm uppercase tracking-wide flex-1 text-left" style={headingStyle}>Completado Recientemente</h4>
                <span className="text-[10px] font-semibold text-[#99d7c7] bg-axon-accent/20 px-2 py-1 rounded-full mr-1">{COMPLETED_TASKS.length}</span>
                <ChevronDown size={16} className={clsx("text-white/40 group-hover:text-white/60 transition-transform duration-200", expandedSections.completado && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSections.completado && (
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
                          <div className="absolute left-2 w-3 h-3 rounded-full bg-axon-accent border-2 border-[#2d3e50] shadow-sm z-10" />
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{task.title}</h5>
                            <p className="text-[10px] text-white/40">{task.date}</p>
                          </div>
                          <span className="text-xs font-semibold text-[#99d7c7] bg-axon-accent/20 px-2 py-0.5 rounded-full">
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

          {/* Quick Nav */}
          <div className="p-4 border-t border-white/10 bg-[#263545]">
            <QuickNavLinks variant="dark" />
          </div>
        </div>
      </div>
    </div>
  );
}