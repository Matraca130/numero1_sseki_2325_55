/**
 * DaySummaryCard — Daily progress metrics card.
 * Shows time, tasks completed, and donut progress.
 */

import React from 'react';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';

interface DaySummaryCardProps {
  todayCompleted: number;
  todayTotal: number;
  todayMinutes: number;
  todayProgress: number;
}

export function DaySummaryCard({ todayCompleted, todayTotal, todayMinutes, todayProgress }: DaySummaryCardProps) {
  const h = Math.floor(todayMinutes / 60);
  const m = todayMinutes % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const progressColor = todayProgress >= 80 ? '#34D399' : todayProgress >= 40 ? '#d97706' : '#f87171';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-[14px] border border-[#ebedf0] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.03)] overflow-hidden"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4">
        <div
          className="px-5 py-4 flex items-center gap-3 col-span-2 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-[#eef0f3]"
          style={{ background: 'linear-gradient(90deg, rgb(230,245,241) 0%, rgb(237,248,245) 100%)' }}
        >
          <BookOpen size={13} className="text-[#1b3b36] shrink-0" />
          <div>
            <p className="font-semibold text-[13px] text-[#1b3b36] leading-[1.3]">Resumen del día</p>
            <p className="text-[10px] text-[#5a9485] leading-[1.3]">
              {todayCompleted > 0 ? 'Buen avance, continúa' : 'Empieza cuando estés listo'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-4 border-r border-[#eef0f3]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9ba3b2]">Tiempo</span>
          <span className="font-bold text-[14px] text-[#3a4455] mt-0.5">{timeStr}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-4 border-r border-[#eef0f3]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9ba3b2]">Tareas</span>
          <span className="font-bold text-[14px] text-[#3a4455] mt-0.5">{todayCompleted}/{todayTotal}</span>
        </div>
        <div className="flex items-center justify-center px-4 py-3 gap-3">
          <div className="relative flex items-center justify-center" style={{ width: 34, height: 34 }}>
            <svg viewBox="0 0 34 34" width="34" height="34" className="-rotate-90">
              <circle cx="17" cy="17" r="14" stroke="#EEF0F3" strokeWidth="3" fill="none" />
              <circle cx="17" cy="17" r="14" stroke={progressColor} strokeWidth="3" fill="none"
                strokeLinecap="round" strokeDasharray={`${(todayProgress / 100) * 87.96} 87.96`} />
            </svg>
          </div>
          <span className="font-bold text-[14px]" style={{ color: progressColor }}>{todayProgress}%</span>
        </div>
      </div>
    </motion.div>
  );
}
