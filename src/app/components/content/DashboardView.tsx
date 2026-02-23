import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/app/context/AppContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudyPlans } from '@/app/hooks/useStudyPlans';
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
  Plus,
  CheckCircle2,
  Target,
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
  const { stats, dailyActivity, bktStates, isConnected } = useStudentDataContext();
  const { tree } = useContentTree();
  const { navigateTo } = useStudentNav();
  const { plans: studyPlans, loading: plansLoading, toggleTaskComplete } = useStudyPlans();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  // Dynamic colors based on course (Brainscape-like)
  const accentColor = currentCourse.color.replace('bg-', 'text-').replace('-500', '-600');
  const accentBg = currentCourse.color;

  // Build chart data from real daily activity
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const sliceDays = timeRange === 'week' ? 7 : 30;
  const activityData = isConnected && dailyActivity.length > 0
    ? dailyActivity.slice(-sliceDays).map(d => ({
        date: dayNames[new Date(d.date + 'T12:00:00').getDay()],
        videos: Math.round(d.studyMinutes * 0.3),
        cards: d.cardsReviewed,
        amt: d.studyMinutes,
      }))
    : [
        { date: 'Seg', videos: 0, cards: 0, amt: 0 },
        { date: 'Ter', videos: 0, cards: 0, amt: 0 },
        { date: 'Qua', videos: 0, cards: 0, amt: 0 },
        { date: 'Qui', videos: 0, cards: 0, amt: 0 },
        { date: 'Sex', videos: 0, cards: 0, amt: 0 },
        { date: 'Sab', videos: 0, cards: 0, amt: 0 },
        { date: 'Dom', videos: 0, cards: 0, amt: 0 },
      ];

  // Build mastery data from BKT states
  const totalBkt = bktStates.length || 1;
  const masteredBkt = bktStates.filter(b => b.p_know >= 0.9).length;
  const learningBkt = bktStates.filter(b => b.p_know >= 0.5 && b.p_know < 0.9).length;
  const reviewingBkt = bktStates.filter(b => b.p_know >= 0.3 && b.p_know < 0.5).length;
  const notStartedBkt = Math.max(0, totalBkt - masteredBkt - learningBkt - reviewingBkt);

  const totalCards = isConnected && bktStates.length > 0
    ? bktStates.length
    : 0;

  const masteryData = [
    { name: 'Nao Iniciado', value: notStartedBkt || (isConnected ? 0 : 250), color: '#d1d5db' },
    { name: 'Aprendendo', value: learningBkt || (isConnected ? 0 : 100), color: '#fbbf24' },
    { name: 'Revisando', value: reviewingBkt || (isConnected ? 0 : 80), color: '#14b8a6' },
    { name: 'Dominado', value: masteredBkt || (isConnected ? 0 : 70), color: '#0d9488' },
  ];

  // Subject progress from BKT + content tree
  const subjectProgress = (() => {
    if (!tree?.courses?.length) return [];
    const COLORS = ['#0d9488', '#14b8a6', '#0891b2', '#7c3aed', '#f59e0b', '#ef4444'];
    return tree.courses.map((course, i) => {
      // Collect all topic IDs for this course
      const topicIds: string[] = [];
      course.semesters?.forEach(s => s.sections?.forEach(sec => sec.topics?.forEach(t => topicIds.push(t.id))));
      // Match BKT states to topics
      const relevantBkt = bktStates.filter(b => topicIds.includes(b.subtopic_id));
      const avgMastery = relevantBkt.length > 0
        ? relevantBkt.reduce((sum, b) => sum + b.p_know, 0) / relevantBkt.length
        : 0;
      return {
        name: course.name,
        total: topicIds.length,
        completed: relevantBkt.filter(b => b.p_know >= 0.9).length,
        color: COLORS[i % COLORS.length],
      };
    });
  })();

  // KPI values from real stats
  const kpiCards = isConnected && stats ? stats.totalCardsReviewed.toLocaleString() : '0';
  const kpiTime = isConnected && stats ? `${Math.floor(stats.totalStudyMinutes / 60)}h ${stats.totalStudyMinutes % 60}m` : '0h 0m';
  const kpiStreak = isConnected && stats ? `${stats.currentStreak} Dias` : '0 Dias';
  const kpiAccuracy = (() => {
    if (!isConnected || !dailyActivity.length) return '0%';
    const totalR = dailyActivity.reduce((s, d) => s + d.cardsReviewed, 0);
    // retention is approximate from daily data
    const withRet = dailyActivity.filter(d => d.retentionPercent !== undefined);
    if (withRet.length === 0) return '—';
    const avgRet = Math.round(withRet.reduce((s, d) => s + (d.retentionPercent || 0), 0) / withRet.length);
    return `${avgRet}%`;
  })();

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
            label="Sequencia Atual"
            value={kpiStreak}
            trendSlot={<TrendBadge label={isConnected && stats && stats.currentStreak >= stats.longestStreak ? "Recorde!" : `Melhor: ${stats?.longestStreak ?? 0}`} up />}
            iconColorClass="bg-amber-50"
          />
          <KPICard 
            icon={<Trophy className="w-5 h-5 text-yellow-600" />}
            label="Media de Acertos"
            value={kpiAccuracy}
            trendSlot={<TrendBadge label={isConnected ? "BKT" : "—"} up />}
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
                <span className="text-3xl font-bold text-gray-900">{totalCards || '—'}</span>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Topics</span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {masteryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{totalCards > 0 ? Math.round((item.value / totalCards) * 100) : 0}%</span>
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
              const percentage = subject.total > 0 ? Math.round((subject.completed / subject.total) * 100) : 0;
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

        {/* ── Planos de Estudo Ativos ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={components.chartCard.base}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900" style={headingStyle}>Planos de Estudo Ativos</h3>
              <p className="text-sm text-gray-500">
                {studyPlans.length > 0
                  ? `${studyPlans.length} plano${studyPlans.length > 1 ? 's' : ''} em andamento`
                  : 'Crie seu primeiro plano de estudos'}
              </p>
            </div>
            <button
              onClick={() => navigateTo('organize-study')}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Novo Plano
            </button>
          </div>

          {plansLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              Carregando planos...
            </div>
          ) : studyPlans.length > 0 ? (
            <div className="space-y-4">
              {studyPlans.map((plan) => {
                const completed = plan.tasks.filter(t => t.completed).length;
                const total = plan.tasks.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                const todayTasks = plan.tasks.filter(t => {
                  const d = new Date(t.date);
                  const now = new Date();
                  return d.toDateString() === now.toDateString();
                });

                return (
                  <div key={plan.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                          <Target size={18} className="text-teal-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                          <p className="text-xs text-gray-500">{completed}/{total} tarefas · {pct}% completo</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigateTo('schedule')}
                        className="text-sm text-teal-600 font-medium hover:text-teal-700 flex items-center gap-1"
                      >
                        Ver plano <ArrowUpRight size={14} />
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full bg-teal-500 rounded-full"
                      />
                    </div>

                    {/* Subject badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {plan.subjects.slice(0, 4).map(s => (
                        <span key={s.id} className={clsx("text-[10px] px-2 py-0.5 rounded-full text-white font-medium", s.color)}>
                          {s.name}
                        </span>
                      ))}
                      {plan.subjects.length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                          +{plan.subjects.length - 4}
                        </span>
                      )}
                    </div>

                    {/* Today's tasks preview */}
                    {todayTasks.length > 0 && (
                      <div className="border-t border-gray-200 pt-3 space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tarefas de hoje</p>
                        {todayTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="flex items-center gap-2">
                            <button
                              onClick={() => toggleTaskComplete(plan.id, task.id)}
                              className={clsx(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                task.completed
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-gray-300 hover:border-teal-400"
                              )}
                            >
                              {task.completed && <CheckCircle2 size={10} className="text-white" />}
                            </button>
                            <span className={clsx("text-sm", task.completed ? "line-through text-gray-400" : "text-gray-700")}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CalendarIcon size={36} className="mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">Nenhum plano de estudo ativo</p>
              <p className="text-sm mt-1">Crie um plano para organizar seu estudo</p>
              <button
                onClick={() => navigateTo('organize-study')}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Criar Plano de Estudo
              </button>
            </div>
          )}
        </motion.div>

        </div>
      </div>
    </div>
  );
}