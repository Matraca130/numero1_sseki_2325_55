// ============================================================
// Month-level stats banner (tasks / time / progress).
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Timer, TrendingUp } from 'lucide-react';

export function MonthStatsBanner({
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
      className="grid grid-cols-3 gap-3"
    >
      {[
        { icon: <CheckCircle2 size={12} />, label: 'Tareas', value: `${completed}/${total}`, color: '#2a8c7a' },
        { icon: <Timer size={12} />, label: 'Tiempo total', value: timeStr, color: '#3a4455' },
        { icon: <TrendingUp size={12} />, label: 'Progreso', value: `${pct}%`, color },
      ].map((stat, i) => (
        <div
          key={i}
          className="bg-white rounded-[10px] border border-[#ebedf0] px-3 py-3 flex flex-col items-center gap-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-1.5 text-[#8b95a5]">
            {stat.icon}
            <span className="text-[10px] font-semibold uppercase tracking-wider">{stat.label}</span>
          </div>
          <span className="font-bold text-[14px]" style={{ color: stat.color }}>{stat.value}</span>
        </div>
      ))}
    </motion.div>
  );
}
