import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Brain, ChevronRight, Flame, Sparkles, Zap } from 'lucide-react';
import { tk } from './welcomeTokens';

export function GamificationCTA({
  xpToday,
  streakDays,
  level,
  studiedToday,
  atRisk,
  cardsDue,
  onNavigate,
}: {
  xpToday: number;
  streakDays: number;
  level: number;
  studiedToday: boolean;
  atRisk: boolean;
  cardsDue: number;
  onNavigate: () => void;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.button
      onClick={onNavigate}
      className="w-full rounded-2xl p-5 text-left cursor-pointer relative overflow-hidden group"
      style={{ background: `linear-gradient(135deg, ${tk.heroFrom}, ${tk.teal})` }}
      initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      whileHover={shouldReduce ? {} : { scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)' }}
      />
      <div className="relative z-10 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <Zap className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-white" style={{ fontWeight: 600 }}>
              Tu Progreso XP
            </p>
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}
            >
              Nivel {level}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/50 flex-wrap">
            {xpToday > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />+{xpToday} XP hoy
              </span>
            )}
            {streakDays > 0 && (
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {streakDays}d racha
              </span>
            )}
            {cardsDue > 0 && (
              <span className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                {cardsDue} cards pendientes
              </span>
            )}
            {atRisk && !studiedToday && (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                Racha en riesgo
              </span>
            )}
            {xpToday === 0 && streakDays === 0 && cardsDue === 0 && <span>Comienza a estudiar</span>}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
      </div>
    </motion.button>
  );
}

export default GamificationCTA;
