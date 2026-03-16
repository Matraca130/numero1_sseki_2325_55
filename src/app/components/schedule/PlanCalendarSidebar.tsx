// ============================================================
// Axon — Plan Calendar Sidebar (left column) — RESPONSIVE
// Restyled to match Figma v4.5 Cronograma design.
//
// Changes:
//   1. Accept optional `embedded` prop for mobile tab rendering
//   2. When embedded: w-full, no border-r, no shrink-0
//   3. When not embedded: hidden lg:flex w-[280px] (desktop only)
//   4. Calendar day buttons: animated selection, dot indicators
//   5. Checklist items: animated checkbox + min-h-[44px] touch targets
//   6. Figma-style month label + nav arrows
// ============================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Pencil,
} from 'lucide-react';
import clsx from 'clsx';
import { format, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

const CHECKLIST_ITEMS = [
  'Revisar apuntes del dia anterior',
  'Preparar material de estudio',
  'Eliminar distracciones',
  'Definir metas claras para hoy',
];

const DAY_HEADERS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

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
  /** When true, renders full-width without border (for mobile tab panels) */
  embedded?: boolean;
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
  embedded = false,
}: PlanCalendarSidebarProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleItem = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div
      className={
        embedded
          ? 'w-full bg-white flex flex-col'
          : 'hidden lg:flex w-[280px] bg-white border-r border-gray-200 flex-col shrink-0'
      }
    >
      {/* Plans header */}
      <div className="px-5 py-4 border-b border-[#f0f1f4]">
        <div className="flex items-center gap-2 text-[#4a5565]">
          <LayoutGrid size={15} className="text-[#8b95a5]" />
          <span className="text-[13px] font-semibold text-[#4a5565]">Lista de planes de estudio</span>
        </div>
        <span className="text-[11px] text-[#9ba3b2] mt-0.5 block">ativos: {plansCount}</span>
      </div>

      {/* Mini Calendar */}
      <div className="px-4 pt-4 pb-3 border-b border-[#f0f1f4]">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <motion.button
            onClick={onPrevMonth}
            whileTap={{ scale: 0.9 }}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg text-[#8b95a5] transition-colors"
          >
            <ChevronLeft size={13} />
          </motion.button>
          <span className="text-[13px] font-bold text-[#3a4455] capitalize tracking-[0.2px]">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <motion.button
            onClick={onNextMonth}
            whileTap={{ scale: 0.9 }}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg text-[#8b95a5] transition-colors"
          >
            <ChevronRight size={13} />
          </motion.button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {DAY_HEADERS.map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-[#9ba3b2] py-1 tracking-[0.25px]">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0">
          {emptyDays.map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {daysInMonth.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const hasTasks = daysWithTasks.has(format(day, 'yyyy-MM-dd'));

            return (
              <div key={i} className="relative flex items-center justify-center py-0.5">
                <motion.button
                  onClick={() => onSelectDate(day)}
                  whileTap={{ scale: 0.88 }}
                  className={clsx(
                    'w-[32px] h-[32px] flex items-center justify-center rounded-full text-[11px] relative transition-all min-h-[32px]',
                    isSelected
                      ? 'bg-[#1a2332] text-white font-bold'
                      : isTodayDate
                        ? 'bg-[#2a8c7a]/15 text-[#2a8c7a] font-bold'
                        : 'text-[#4a5268] font-medium hover:bg-gray-100',
                  )}
                >
                  {format(day, 'd')}
                  {hasTasks && !isSelected && (
                    <motion.div
                      layoutId={`dot-${format(day, 'yyyy-MM-dd')}`}
                      className={clsx(
                        'absolute bottom-0.5 w-[4px] h-[4px] rounded-full',
                        'bg-[#2a8c7a]',
                      )}
                    />
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checklist */}
      <div className="px-5 pt-4 pb-3 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <Pencil size={13} className="text-[#8b95a5]" />
          <span className="text-[13px] font-semibold text-[#4a5565]">Checklist previo al estudio</span>
        </div>
        <div className="space-y-0.5">
          {CHECKLIST_ITEMS.map((item, i) => {
            const checked = checkedItems.has(i);
            return (
              <motion.label
                key={i}
                className="flex items-center gap-2.5 cursor-pointer group min-h-[44px] px-1 rounded-lg hover:bg-gray-50 transition-colors"
                whileTap={{ scale: 0.99 }}
              >
                {/* Custom animated checkbox */}
                <div
                  onClick={() => toggleItem(i)}
                  className={clsx(
                    'w-[16px] h-[16px] rounded-[5px] border flex items-center justify-center shrink-0 transition-all',
                    checked
                      ? 'bg-[#2a8c7a] border-[#2a8c7a]'
                      : 'bg-white border-[#cdd1d8]',
                  )}
                >
                  <AnimatePresence>
                    {checked && (
                      <motion.svg
                        viewBox="0 0 10 8"
                        width="10"
                        height="8"
                        fill="none"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.18 }}
                      >
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </div>
                <span
                  className={clsx(
                    'text-[12px] transition-colors leading-[1.4] flex-1',
                    checked ? 'line-through text-[#b0b8c4]' : 'text-[#4a5565] group-hover:text-[#1a2332]',
                  )}
                >
                  {item}
                </span>
              </motion.label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
