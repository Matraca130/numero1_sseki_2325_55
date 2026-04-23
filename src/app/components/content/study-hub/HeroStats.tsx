// ============================================================
// Axon — HeroStats (extracted from StudyHubHero.tsx)
//
// Four-stat row (Hoy, Resumenes, Flashcards, Videos) at the
// bottom of Hero ZONE 1.
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, Clock, Sparkles, Play } from 'lucide-react';
import type { TodayStats } from '../StudyHubHero';

interface HeroStatsProps {
  todayStats: TodayStats;
  studyMinutesToday: number;
  totalCardsReviewed: number;
  dailyGoalMinutes: number;
  fadeUp: (delay: number) => any;
}

export function HeroStats({
  todayStats,
  studyMinutesToday,
  totalCardsReviewed,
  dailyGoalMinutes,
  fadeUp,
}: HeroStatsProps) {
  const shouldReduce = useReducedMotion();

  const stats = [
    { icon: Clock, label: 'Hoy', value: `${todayStats.minutes > 0 ? todayStats.minutes : studyMinutesToday > 0 ? studyMinutesToday : 0}m`, sub: `meta ${dailyGoalMinutes}m`, accent: 'text-teal-300' },
    { icon: BookOpen, label: 'Resumenes', value: String(todayStats.summaries), sub: 'leidos hoy', accent: 'text-teal-300' },
    { icon: Sparkles, label: 'Flashcards', value: String(todayStats.flashcards > 0 ? todayStats.flashcards : totalCardsReviewed), sub: todayStats.flashcards > 0 ? 'hoy' : 'total', accent: 'text-amber-400' },
    { icon: Play, label: 'Videos', value: String(todayStats.videos), sub: 'visto hoy', accent: 'text-teal-300' },
  ];

  return (
    <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6" {...fadeUp(0.5)}>
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="bg-zinc-800/80 border border-white/[0.10] rounded-xl px-4 py-3.5"
          initial={shouldReduce ? false : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.05 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-3.5 h-3.5 ${stat.accent}`} />
            <span className="text-[11px] text-zinc-400" style={{ fontWeight: 500 }}>{stat.label}</span>
          </div>
          <p className="text-xl text-white tracking-tight" style={{ fontWeight: 700 }}>{stat.value}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{stat.sub}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
