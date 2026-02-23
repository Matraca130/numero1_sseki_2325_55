import React, { useState, useMemo } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { calculateRetention, getUrgencyLevel } from '@/app/services/spacedRepetition';
import { motion } from 'motion/react';
import {
  GraduationCap,
  Layers,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  PlayCircle,
  FlaskConical,
  Languages,
  Scale,
  Palette,
  Calculator,
} from 'lucide-react';
import clsx from 'clsx';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { KPICard, TrendBadge } from '@/app/components/shared/KPICard';
import { headingStyle, components, colors } from '@/app/design-system';

// Mock deck data
interface Deck {
  id: string;
  name: string;
  category: string;
  totalCards: number;
  cardsDue: number;
  dueUrgency: 'critical' | 'warning' | 'info' | 'none';
  easeFactor: number;
  easeColor: string;
  easeBarPct: number;
  nextReview: string;
  nextReviewSub: string;
  nextReviewColor: string;
  icon: React.ReactNode;
  iconBg: string;
}

const STATS = {
  totalMastered: 1248,
  masteredTrend: '+12%',
  todayLoad: 86,
  todayDone: 30,
  avgRetention: 92,
};

const DECKS: Deck[] = [
  {
    id: '1',
    name: 'Fisiologia II: Integração',
    category: 'Fisiologia - 142 Cards',
    totalCards: 142,
    cardsDue: 42,
    dueUrgency: 'critical',
    easeFactor: 180,
    easeColor: 'text-orange-500',
    easeBarPct: 45,
    nextReview: 'Hoje',
    nextReviewSub: 'Atrasado 2h',
    nextReviewColor: 'text-red-600',
    icon: <Calculator size={18} />,
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
  },
  {
    id: '2',
    name: 'Anatomia Patológica',
    category: 'Patologia - 89 Cards',
    totalCards: 89,
    cardsDue: 24,
    dueUrgency: 'warning',
    easeFactor: 210,
    easeColor: 'text-amber-600',
    easeBarPct: 65,
    nextReview: 'Hoje',
    nextReviewSub: 'Em 4h',
    nextReviewColor: 'text-gray-800',
    icon: <Palette size={18} />,
    iconBg: 'bg-gradient-to-br from-pink-400 to-pink-600',
  },
  {
    id: '3',
    name: 'Bioquímica Orgânica',
    category: 'Bioquímica - 312 Cards',
    totalCards: 312,
    cardsDue: 12,
    dueUrgency: 'info',
    easeFactor: 250,
    easeColor: 'text-emerald-600',
    easeBarPct: 85,
    nextReview: 'Amanhã',
    nextReviewSub: '09:00',
    nextReviewColor: 'text-gray-800',
    icon: <FlaskConical size={18} />,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  },
  {
    id: '4',
    name: 'Terminologia Médica',
    category: 'Geral - 560 Cards',
    totalCards: 560,
    cardsDue: 8,
    dueUrgency: 'none',
    easeFactor: 280,
    easeColor: 'text-emerald-600',
    easeBarPct: 95,
    nextReview: '17 Fev',
    nextReviewSub: 'Manhã',
    nextReviewColor: 'text-gray-800',
    icon: <Languages size={18} />,
    iconBg: 'bg-gray-500',
  },
  {
    id: '5',
    name: 'Farmacologia Geral',
    category: 'Farmacologia - 210 Cards',
    totalCards: 210,
    cardsDue: 0,
    dueUrgency: 'none',
    easeFactor: 300,
    easeColor: 'text-blue-600',
    easeBarPct: 100,
    nextReview: '19 Fev',
    nextReviewSub: 'Revisão',
    nextReviewColor: 'text-gray-800',
    icon: <Scale size={18} />,
    iconBg: 'bg-indigo-500',
  },
];

const DUE_BADGE_STYLES = {
  critical: 'bg-red-100 text-red-800',
  warning: 'bg-orange-100 text-orange-800',
  info: 'bg-blue-100 text-blue-800',
  none: 'bg-gray-100 text-gray-500',
};

export function ReviewSessionView() {
  const { navigateTo } = useStudentNav();
  const { stats: studentStats, courseProgress, reviews, isConnected } = useStudentDataContext();
  const [currentPage, setCurrentPage] = useState(1);

  // Build real stats from backend data
  const realMastered = isConnected && studentStats
    ? studentStats.totalCardsReviewed
    : STATS.totalMastered;
  const realTodayLoad = isConnected && courseProgress.length > 0
    ? courseProgress.reduce((s, cp) =>
        s + (cp.topicProgress?.reduce((ts, tp) => ts + tp.flashcardsDue, 0) || 0), 0)
    : STATS.todayLoad;
  const realAvgRetention = isConnected && courseProgress.length > 0
    ? Math.round(courseProgress.reduce((s, cp) => s + cp.masteryPercent, 0) / courseProgress.length)
    : STATS.avgRetention;

  const effectiveStats = {
    totalMastered: realMastered,
    masteredTrend: STATS.masteredTrend,
    todayLoad: Math.max(realTodayLoad, 1),
    todayDone: isConnected ? Math.round(realTodayLoad * 0.35) : STATS.todayDone,
    avgRetention: realAvgRetention,
  };

  const todayPct = Math.round((effectiveStats.todayDone / effectiveStats.todayLoad) * 100);

  return (
    <div className="h-full flex flex-col bg-surface-dashboard">
      {/* Header */}
      <div className="shrink-0">
        <AxonPageHeader
          title="Centro de Revisão"
          subtitle="Gerencie seus decks de repetição espaçada e otimize a retenção"
          onBack={() => navigateTo('schedule')}
          actionButton={
            <button
              onClick={() => navigateTo('review-session')}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-sm shadow-sm transition-all active:scale-95"
            >
              <PlayCircle size={16} /> Revisão Rápida
            </button>
          }
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Mastered */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <KPICard
              icon={<GraduationCap size={20} />}
              label="Cards Dominados"
              value={effectiveStats.totalMastered.toLocaleString()}
              trendSlot={<TrendBadge label={STATS.masteredTrend} up />}
            />
          </motion.div>

          {/* Today's Load */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <KPICard
              icon={<Layers size={20} />}
              label="Carga de Hoje"
              value={effectiveStats.todayLoad}
              trendSlot={<span className="text-xs font-semibold text-teal-700">{effectiveStats.todayDone}/{effectiveStats.todayLoad}</span>}
            >
              <div className={`mt-3 ${components.progressBar.track}`} style={{ height: '6px' }}>
                <div className={`${components.progressBar.colorDefault} h-1.5 rounded-full transition-all`} style={{ width: `${todayPct}%` }} />
              </div>
            </KPICard>
          </motion.div>

          {/* Avg Retention */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <KPICard
              icon={<Brain size={20} />}
              label="Taxa de Retenção"
              value={`${effectiveStats.avgRetention}%`}
              trendSlot={<TrendBadge label="Ótimo" up icon={<CheckCircle2 size={12} />} />}
            />
          </motion.div>
        </div>

        {/* Decks Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col overflow-hidden"
        >
          {/* Table header bar */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900" style={headingStyle}>Decks & Matérias Ativos</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
                <Filter size={18} />
              </button>
              <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/80 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-6 text-xs text-gray-400 uppercase tracking-wider font-mono">Matéria</th>
                  <th className="py-3 px-6 text-xs text-gray-400 uppercase tracking-wider font-mono text-center">Cards Pendentes</th>
                  <th className="py-3 px-6 text-xs text-gray-400 uppercase tracking-wider font-mono text-center">Fator de Facilidade</th>
                  <th className="py-3 px-6 text-xs text-gray-400 uppercase tracking-wider font-mono text-right">Próxima Revisão</th>
                  <th className="py-3 px-6 text-xs text-gray-400 uppercase tracking-wider font-mono text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DECKS.map((deck, i) => (
                  <motion.tr
                    key={deck.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    className="hover:bg-gray-50/60 transition-all group cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm", deck.iconBg)}>
                          {deck.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{deck.name}</p>
                          <p className="text-xs text-gray-500">{deck.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", DUE_BADGE_STYLES[deck.dueUrgency])}>
                        {deck.cardsDue} Pendentes
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className={clsx("text-sm font-semibold font-mono", deck.easeColor)}>{deck.easeFactor}%</span>
                        <div className="w-16 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full", deck.easeBarPct >= 80 ? 'bg-emerald-500' : deck.easeBarPct >= 50 ? 'bg-amber-500' : 'bg-orange-500')}
                            style={{ width: `${deck.easeBarPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className={clsx("text-sm font-medium", deck.nextReviewColor)}>{deck.nextReview}</p>
                      <p className="text-xs text-gray-500">{deck.nextReviewSub}</p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {deck.cardsDue > 0 ? (
                        <button
                          onClick={() => navigateTo('flashcards')}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium hover:underline"
                        >
                          Revisar
                        </button>
                      ) : (
                        <button className="text-gray-400 hover:text-teal-600 text-sm font-medium transition-colors">
                          Detalhes
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Mostrando 1-5 de 12 decks</p>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 text-xs">
                <ChevronLeft size={14} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-teal-500 bg-white text-teal-600 text-xs">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 text-xs">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 text-xs">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 text-xs">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}