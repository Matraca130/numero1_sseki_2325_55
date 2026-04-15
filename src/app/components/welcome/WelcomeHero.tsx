import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Brain, Clock, Flame, Trophy, Zap } from 'lucide-react';
import { headingStyle } from '@/app/design-system';
import { StatPill } from './StatPill';
import { TimeFilters } from './TimeFilters';
import { XPLevelBar } from './XPLevelBar';
import { tk, type TimeFilter } from './welcomeTokens';

export interface WelcomeHeroProps {
  greeting: { line1: string; line2: string };
  timeFilter: TimeFilter;
  onTimeFilterChange: (f: TimeFilter) => void;
  filtered: {
    xpLabel: string;
    xpValue: string | number;
    hoursLabel: string;
    hoursValue: string;
  };
  streakDays: number;
  badgesEarned: number;
  cardsDue: number;
  cardsNew: number;
  totalXP: number;
  xpToday: number;
  atRisk: boolean;
  studiedToday: boolean;
}

export function WelcomeHero({
  greeting,
  timeFilter,
  onTimeFilterChange,
  filtered,
  streakDays,
  badgesEarned,
  cardsDue,
  cardsNew,
  totalXP,
  xpToday,
  atRisk,
  studiedToday,
}: WelcomeHeroProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div
      className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-10 overflow-hidden"
      style={{ background: `linear-gradient(145deg, ${tk.heroFrom}, ${tk.heroTo})` }}
    >
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute top-2 right-[-20px] rotate-[-12deg] select-none pointer-events-none z-0 opacity-[0.015]">
        <span className="text-[80px] text-white tracking-[0.15em] uppercase" style={{ fontWeight: 900 }}>
          AXON
        </span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <motion.div
            initial={shouldReduce ? {} : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h1
              className="text-xl sm:text-2xl text-white tracking-tight"
              style={{ ...headingStyle, fontWeight: 700 }}
            >
              {greeting.line1}
            </h1>
            <p className="text-xs text-white/40 mt-1">{greeting.line2}</p>
          </motion.div>
          <TimeFilters active={timeFilter} onChange={onTimeFilterChange} />
        </div>

        {/* Stats strip — ALL from real APIs */}
        <div className="flex flex-wrap items-center gap-3">
          <StatPill icon={Zap} label={filtered.xpLabel} value={filtered.xpValue} color="#2dd4a8" delay={0.1} />
          <StatPill icon={Flame} label="Racha" value={`${streakDays}d`} color="#fb923c" delay={0.15} />
          <StatPill icon={Trophy} label="Insignias" value={badgesEarned} color="#a78bfa" delay={0.2} />
          <StatPill icon={Clock} label={filtered.hoursLabel} value={filtered.hoursValue} color="#38bdf8" delay={0.25} />
          {cardsDue > 0 && (
            <StatPill
              icon={Brain}
              label="Cards Pendientes"
              value={`${cardsDue}${cardsNew > 0 ? ` (+${cardsNew})` : ''}`}
              color="#14b8a6"
              delay={0.3}
            />
          )}
        </div>

        {/* XP Progressive Level Bar */}
        <div className="mt-5">
          <XPLevelBar totalXP={totalXP} xpToday={xpToday} />
        </div>

        {/* Streak at risk warning */}
        {atRisk && !studiedToday && (
          <motion.div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
            style={{ backgroundColor: 'rgba(251,146,60,0.15)', color: '#fb923c', fontWeight: 500 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Tu racha de {streakDays} dias esta en riesgo. Estudia hoy para mantenerla.
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default WelcomeHero;
