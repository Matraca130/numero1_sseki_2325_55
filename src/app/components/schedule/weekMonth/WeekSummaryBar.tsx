// ============================================================
// Summary banner for the week view (completed / time / %).
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Timer, TrendingUp } from 'lucide-react';

export function WeekSummaryBar({
  total, completed, minutes,
}: { total: number; completed: number; minutes: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const color = pct >= 80 ? '#34D399' : pct >= 40 ? '#d97706' : '#f87171';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[12px] border border-[#ebedf0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4 flex items-center gap-4"
    >
      <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 divide-x divide-[#eef0f3]">
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-[#8b95a5]"><CheckCircle2 size={11} /><span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">Hechas</span></div>
          <span className="font-bold text-[13px] text-[#3a4455]">{completed}<span className="text-[10px] font-normal text-[#9ba3b2]">/{total}</span></span>
        </div>
        <div className="flex flex-col items-center gap-0.5 pl-2 sm:pl-3">
          <div className="flex items-center gap-1 text-[#8b95a5]"><Timer size={11} /><span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">Tiempo</span></div>
          <span className="font-bold text-[13px] text-[#3a4455]">{timeStr}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 pl-2 sm:pl-3">
          <div className="flex items-center gap-1 text-[#8b95a5]"><TrendingUp size={11} /><span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">Avance</span></div>
          <span className="font-bold text-[13px]" style={{ color }}>{pct}%</span>
        </div>
      </div>
      {/* Mini ring — hidden on very small screens */}
      <div className="shrink-0 relative hidden sm:block" style={{ width: 36, height: 36 }}>
        <svg viewBox="0 0 36 36" width="36" height="36" className="-rotate-90">
          <circle cx="18" cy="18" r="14" stroke="#EEF0F3" strokeWidth="3" fill="none" />
          <motion.circle
            cx="18" cy="18" r="14"
            stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"
            initial={{ strokeDasharray: '0 87.96' }}
            animate={{ strokeDasharray: `${(pct / 100) * 87.96} 87.96` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#3a4455]">
          {pct}%
        </span>
      </div>
    </motion.div>
  );
}
