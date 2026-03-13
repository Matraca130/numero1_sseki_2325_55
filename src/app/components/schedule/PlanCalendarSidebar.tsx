// ============================================================
// Axon — Plan Calendar Sidebar (left column)
// Mini-calendar + study plan checklist + plan list header.
// Extracted from StudyPlanDashboard.tsx for modularization.
// ============================================================
import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Pencil,
} from 'lucide-react';
import clsx from 'clsx';
import { format, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface PlanCalendarSidebarProps {
  currentDate: Date;
  selectedDate: Date;
  daysInMonth: Date[];
  emptyDays: null[];
  daysWithTasks: Set<string>;
  plansCount: number;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function PlanCalendarSidebar({
  currentDate,
  selectedDate,
  daysInMonth,
  emptyDays,
  daysWithTasks,
  plansCount,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: PlanCalendarSidebarProps) {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Plans header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-700">
          <LayoutGrid size={16} />
          <span className="text-sm font-semibold">Lista de planes de estudio</span>
        </div>
        <span className="text-xs text-gray-500">ativos: {plansCount}</span>
      </div>

      {/* Mini Calendar */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onPrevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-bold text-gray-800 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={onNextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((d, i) => (
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
                onClick={() => onSelectDate(day)}
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
          <span className="text-sm font-semibold text-gray-700">Checklist previo al estudio</span>
        </div>
        <div className="space-y-2">
          {['Revisar apuntes del dia anterior', 'Preparar material de estudio', 'Eliminar distracciones', 'Definir metas claras'].map((item, i) => (
            <label key={i} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer group">
              <input type="checkbox" className="rounded border-gray-300 text-teal-500 focus:ring-teal-500" />
              <span className="group-hover:text-gray-800 transition-colors">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
