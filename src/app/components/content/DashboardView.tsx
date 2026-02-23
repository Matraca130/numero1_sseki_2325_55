import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/app/context/AppContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { 
  Flame, 
  Trophy, 
  BookOpen, 
  Clock, 
  Layers, 
  ChevronDown,
  Calendar as CalendarIcon,
  HelpCircle,
  Video,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import clsx from 'clsx';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { KPICard, TrendBadge } from '@/app/components/shared/KPICard';
import { colors, components, headingStyle } from '@/app/design-system';

// --- Components ---

export function DashboardView() {
  const { currentCourse } = useApp();
  const { stats, courseProgress, dailyActivity, isConnected } = useStudentDataContext();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  // Dynamic colors based on course (Brainscape-like)
  const accentColor = currentCourse.color.replace('bg-', 'text-').replace('-500', '-600');
  const accentBg = currentCourse.color;

  // Build chart data from real daily activity
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const activityData = isConnected && dailyActivity.length > 0
    ? dailyActivity.slice(-7).map(d => ({
        date: dayNames[new Date(d.date + 'T12:00:00').getDay()],
        videos: Math.round(d.studyMinutes * 0.3),
        cards: d.cardsReviewed,
        amt: d.studyMinutes,
      }))
    : [
        { date: 'Seg', videos: 45, cards: 80, amt: 2400 },
        { date: 'Ter', videos: 30, cards: 120, amt: 2210 },
        { date: 'Qua', videos: 60, cards: 90, amt: 2290 },
        { date: 'Qui', videos: 20, cards: 150, amt: 2000 },
        { date: 'Sex', videos: 50, cards: 110, amt: 2181 },
        { date: 'Sáb', videos: 90, cards: 40, amt: 2500 },
        { date: 'Dom', videos: 10, cards: 30, amt: 2100 },
      ];

  // Build mastery data from real course progress
  const totalCards = isConnected && courseProgress.length > 0
    ? courseProgress.reduce((s, c) => s + c.flashcardsTotal, 0)
    : 1100;
  const masteredCards = isConnected && courseProgress.length > 0
    ? courseProgress.reduce((s, c) => s + c.flashcardsMastered, 0)
    : 450;
  const learningCards = Math.round((totalCards - masteredCards) * 0.4);
  const reviewingCards = Math.round((totalCards - masteredCards) * 0.35);
  const notStartedCards = totalCards - masteredCards - learningCards - reviewingCards;

  const masteryData = [
    { name: 'Não Iniciado', value: Math.max(0, notStartedCards), color: '#d1d5db' },
    { name: 'Aprendendo', value: learningCards, color: '#fbbf24' },
    { name: 'Revisando', value: reviewingCards, color: '#14b8a6' },
    { name: 'Dominado', value: masteredCards, color: '#0d9488' },
  ];

  // Subject progress from real data
  const subjectProgress = isConnected && courseProgress.length > 0
    ? courseProgress.map(cp => ({
        name: cp.courseName,
        total: cp.flashcardsTotal || cp.lessonsTotal,
        completed: cp.flashcardsMastered || cp.lessonsCompleted,
        color: cp.courseId === 'anatomy' ? '#0d9488' : cp.courseId === 'histology' ? '#14b8a6' : '#0891b2',
      }))
    : [
        { name: 'Anatomia', total: 1200, completed: 850, color: '#0d9488' },
        { name: 'Histologia', total: 800, completed: 320, color: '#14b8a6' },
      ];

  // KPI values from real stats
  const kpiCards = isConnected && stats ? stats.totalCardsReviewed.toLocaleString() : '1,248';
  const kpiTime = isConnected && stats ? `${Math.round(stats.totalStudyMinutes / 60)}h ${stats.totalStudyMinutes % 60}m` : '34h 20m';
  const kpiStreak = isConnected && stats ? `${stats.currentStreak} Dias` : '12 Dias';
  const kpiAccuracy = isConnected && courseProgress.length > 0
    ? `${Math.round(courseProgress.reduce((s, c) => s + c.quizAverageScore, 0) / courseProgress.length)}%`
    : '87%';

  return (
    <div className="h-full overflow-y-auto bg-surface-dashboard">
      {/* ── AXON Page Header ── */}
      <AxonPageHeader
        title="Dashboard"
        subtitle={currentCourse.name}
        statsLeft={<p className="text-gray-500 text-sm">Visão geral do seu aprendizado</p>}
        actionButton={
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200/60 shrink-0">
            <button
              onClick={() => setTimeRange('week')}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                timeRange === 'week' ? components.filterButton.active : components.filterButton.inactive
              )}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                timeRange === 'month' ? components.filterButton.active : components.filterButton.inactive
              )}
            >
              Este Mês
            </button>
          </div>
        }
      />

      {/* ── Content ── */}
      <div className="px-6 py-6 bg-surface-dashboard">
        <div className="max-w-7xl mx-auto space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            icon={<Layers className="w-5 h-5 text-teal-600" />}
            label="Cards Estudados"
            value={kpiCards}
            trendSlot={<TrendBadge label="+12%" up />}
            iconColorClass="bg-teal-50"
          />
          <KPICard 
            icon={<Clock className="w-5 h-5 text-teal-600" />}
            label="Tempo de Estudo"
            value={kpiTime}
            trendSlot={<TrendBadge label="+5%" up />}
            iconColorClass="bg-teal-50"
          />
          <KPICard 
            icon={<Flame className="w-5 h-5 text-amber-600" />}
            label="Sequência Atual"
            value={kpiStreak}
            trendSlot={<TrendBadge label={isConnected && stats && stats.currentStreak >= stats.longestStreak ? "Recorde!" : `Melhor: ${stats?.longestStreak ?? 23}`} up />}
            iconColorClass="bg-amber-50"
          />
          <KPICard 
            icon={<Trophy className="w-5 h-5 text-yellow-600" />}
            label="Média de Acertos"
            value={kpiAccuracy}
            trendSlot={<TrendBadge label="-2%" up={false} />}
            iconColorClass="bg-yellow-50"
          />
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Activity Chart (Stacked Bar) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`lg:col-span-2 ${components.chartCard.base} min-w-0`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900" style={headingStyle}>Atividade de Estudo</h3>
                <p className="text-sm text-gray-500">Comparativo de vídeos vs. flashcards</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-teal-500" />
                  Flashcards
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-500" />
                  Vídeos
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full min-w-0" style={{ minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                <BarChart data={activityData} barSize={24} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                    }}
                  />
                  <Bar dataKey="cards" stackId="a" fill={colors.chart.flashcards} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="videos" stackId="a" fill={colors.chart.videos} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Mastery Distribution (Donut) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${components.chartCard.base} min-w-0`}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1" style={headingStyle}>Nível de Domínio</h3>
            <p className="text-sm text-gray-500 mb-6">Baseado na metodologia SM2</p>
            
            <div className="h-[220px] relative min-w-0" style={{ minHeight: '220px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                <PieChart>
                  <Pie
                    data={masteryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {masteryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-gray-900">1.1k</span>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Cards</span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {masteryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{Math.round((item.value / 1100) * 100)}%</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Detailed Progress by Subject */}
        <div className={components.chartCard.base}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900" style={headingStyle}>Progresso por Matéria</h3>
            <button className="text-sm text-teal-600 font-medium hover:text-teal-700">Ver Relatório Completo</button>
          </div>
          
          <div className="space-y-6">
            {subjectProgress.map((subject, idx) => {
              const percentage = Math.round((subject.completed / subject.total) * 100);
              return (
                <div key={subject.name} className="relative">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{subject.completed} de {subject.total} tópicos dominados</p>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{percentage}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}