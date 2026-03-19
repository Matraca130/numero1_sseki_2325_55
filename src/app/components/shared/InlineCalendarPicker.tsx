// ============================================================
// Axon — Inline Calendar Picker (shared reusable component)
// Extracted from StudyOrganizerWizard for reuse.
// ============================================================
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { getAxonToday } from '@/app/utils/constants';

interface InlineCalendarPickerProps {
  completionDate: string;
  setCompletionDate: (v: string) => void;
  daysRemaining: number | null;
}

export function InlineCalendarPicker({
  completionDate,
  setCompletionDate,
  daysRemaining,
}: InlineCalendarPickerProps) {
  const today = getAxonToday();
  const selected = completionDate ? new Date(completionDate + 'T00:00:00') : null;
  const [calYear, setCalYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [calMonth, setCalMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const firstDay = new Date(calYear, calMonth, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dayNames = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const isPast = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    return d < new Date(todayY, todayM, todayD);
  };
  const isToday = (day: number) =>
    calYear === todayY && calMonth === todayM && day === todayD;
  const isSelected = (day: number) =>
    selected !== null && calYear === selected.getFullYear() && calMonth === selected.getMonth() && day === selected.getDate();

  const handleSelect = (day: number) => {
    if (isPast(day)) return;
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setCompletionDate(`${calYear}-${mm}-${dd}`);
  };

  const canGoPrev = calYear > todayY || (calYear === todayY && calMonth > todayM);

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const past = isPast(d);
    const sel = isSelected(d);
    const tod = isToday(d);
    cells.push(
      <button
        key={d}
        type="button"
        disabled={past}
        onClick={() => handleSelect(d)}
        className={clsx(
          'w-9 h-9 rounded-lg text-sm transition-all flex items-center justify-center',
          past && 'text-gray-300 cursor-not-allowed',
          !past && !sel && 'text-gray-700 hover:bg-[#e6f5f1] hover:text-axon-dark cursor-pointer',
          sel && 'bg-axon-accent text-white shadow-sm',
          tod && !sel && 'ring-1 ring-axon-accent'
        )}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-14 h-14 rounded-xl bg-[#e6f5f1] flex items-center justify-center text-axon-accent">
        <Calendar size={28} />
      </div>

      <div className="w-80 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canGoPrev}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              canGoPrev ? 'hover:bg-gray-100 text-gray-600 cursor-pointer' : 'text-gray-200 cursor-not-allowed'
            )}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>
            {monthNames[calMonth]} {calYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 cursor-pointer transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((dn) => (
            <div key={dn} className="text-xs text-gray-400 text-center py-1">{dn}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {cells}
        </div>
      </div>

      {daysRemaining !== null && (
        <div className="flex items-center gap-4">
          <div className="bg-[#e6f5f1] border border-[#ccebe3] rounded-xl px-5 py-3 text-center">
            <p className="text-2xl text-axon-dark" style={{ fontWeight: 700 }}>{daysRemaining}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Dias</p>
          </div>
          <div className="bg-[#F0F2F5] border border-gray-200 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl text-gray-800" style={{ fontWeight: 700 }}>{Math.ceil(daysRemaining / 7)}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Semanas</p>
          </div>
        </div>
      )}
    </div>
  );
}