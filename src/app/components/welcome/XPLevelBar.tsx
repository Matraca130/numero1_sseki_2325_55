import { motion, useReducedMotion } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import { getLevelInfo } from '@/app/utils/gamification-helpers';
import { tk } from './welcomeTokens';

export function XPLevelBar({ totalXP, xpToday }: { totalXP: number; xpToday: number }) {
  const shouldReduce = useReducedMotion();
  const info = getLevelInfo(totalXP);

  return (
    <motion.div
      className="w-full"
      initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${tk.tealLight}, ${tk.teal})`, fontWeight: 800 }}
          >
            {info.level}
          </div>
          <p className="text-[11px] text-white/70 truncate" style={{ fontWeight: 600 }}>
            {info.title}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {xpToday > 0 && (
            <motion.span
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: `${tk.tealLight}20`, color: tk.tealLight, fontWeight: 600 }}
              initial={shouldReduce ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 500, damping: 25 }}
            >
              <ChevronUp className="w-2.5 h-2.5" />+{xpToday}
            </motion.span>
          )}
          <p className="text-[10px] text-white/40">
            <span className="text-white/70" style={{ fontWeight: 700 }}>
              {totalXP.toLocaleString()}
            </span>
            {info.next && <span> / {info.next.xp.toLocaleString()} XP</span>}
          </p>
        </div>
      </div>
      <div className="relative">
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${tk.tealLight}, ${tk.teal})` }}
            initial={shouldReduce ? { width: `${info.progress * 100}%` } : { width: '0%' }}
            animate={{ width: `${info.progress * 100}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
        {info.next && info.xpForNext > 0 && (
          <p className="text-[9px] text-white/25 mt-1.5 text-right">
            {(info.xpForNext - info.xpInLevel).toLocaleString()} XP para{' '}
            <span className="text-white/40">{info.next.title}</span>
          </p>
        )}
        {!info.next && (
          <p className="text-[9px] text-white/40 mt-1.5 text-right" style={{ fontWeight: 500 }}>
            Nivel maximo alcanzado
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default XPLevelBar;
