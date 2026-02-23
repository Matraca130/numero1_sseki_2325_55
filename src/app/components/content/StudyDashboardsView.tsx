import React, { useState, useMemo } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { getUrgencyLevel } from '@/app/services/spacedRepetition';
import { motion } from 'motion/react';
import {
  Brain,
  BookOpen,
  FlaskConical,
  Palette,
  Calculator,
  Plus,
  Filter,
  ArrowUpDown,
  Calendar,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { headingStyle, components, colors } from '@/app/design-system';

// Subject data
interface SubjectCard {
  id: string;
  name: string;
  department: string;
  retention: number;
  retentionColor: string;
  ringStroke: string;
  ringOffset: number;
  consistency: string;
  consistencyColor: string;
  nextReview: string;
  nextReviewColor: string;
  progressPct: number;
  progressColor: string;
  accentGradient: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  heatmapColors: string[];
  isUrgent?: boolean;
}

const SUBJECTS: SubjectCard[] = [
  {
    id: '1',
    name: 'Fisiologia II',
    department: 'Fisiologia',
    retention: 92,
    retentionColor: 'text-blue-600',
    ringStroke: '#3B82F6',
    ringOffset: 10,
    consistency: 'Alta',
    consistencyColor: 'text-blue-600',
    nextReview: 'Em 2 dias',
    nextReviewColor: 'text-gray-700',
    progressPct: 80,
    progressColor: 'bg-blue-500',
    accentGradient: 'bg-gradient-to-r from-blue-400 to-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: <Calculator size={18} />,
    heatmapColors: [
      'bg-blue-200', 'bg-blue-400', 'bg-blue-500', 'bg-blue-300', 'bg-blue-100',
      'bg-blue-500', 'bg-blue-500', 'bg-blue-400', 'bg-blue-200', 'bg-blue-100',
      'bg-blue-300', 'bg-blue-500', 'bg-blue-400', 'bg-blue-200', 'bg-blue-100',
      'bg-blue-500', 'bg-blue-300', 'bg-blue-400', 'bg-blue-200', 'bg-blue-50',
    ],
  },
  {
    id: '2',
    name: 'Anatomia Patológica',
    department: 'Patologia',
    retention: 28,
    retentionColor: 'text-red-600',
    ringStroke: '#ef4444',
    ringOffset: 90,
    consistency: 'Volátil',
    consistencyColor: 'text-red-500',
    nextReview: 'Agora (Atrasado)',
    nextReviewColor: 'text-red-500 font-bold uppercase',
    progressPct: 100,
    progressColor: 'bg-red-500 animate-pulse',
    accentGradient: 'bg-gradient-to-r from-red-400 to-orange-400',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: <Brain size={18} />,
    heatmapColors: [
      'bg-red-200', 'bg-gray-200', 'bg-gray-200', 'bg-red-300', 'bg-gray-200',
      'bg-red-500', 'bg-gray-200', 'bg-red-400', 'bg-gray-200', 'bg-gray-200',
      'bg-red-300', 'bg-gray-200', 'bg-gray-200', 'bg-red-200', 'bg-gray-200',
      'bg-red-500', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200', 'bg-red-50',
    ],
    isUrgent: true,
  },
  {
    id: '3',
    name: 'Histologia',
    department: 'Morfologia',
    retention: 68,
    retentionColor: 'text-pink-600',
    ringStroke: '#DB2777',
    ringOffset: 40,
    consistency: 'Moderada',
    consistencyColor: 'text-pink-600',
    nextReview: 'Amanhã',
    nextReviewColor: 'text-gray-700',
    progressPct: 45,
    progressColor: 'bg-pink-500',
    accentGradient: 'bg-gradient-to-r from-pink-400 to-pink-600',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    icon: <Palette size={18} />,
    heatmapColors: [
      'bg-pink-200', 'bg-pink-300', 'bg-pink-100', 'bg-pink-300', 'bg-pink-100',
      'bg-pink-500', 'bg-pink-400', 'bg-pink-200', 'bg-pink-100', 'bg-pink-100',
      'bg-pink-300', 'bg-pink-500', 'bg-pink-400', 'bg-pink-200', 'bg-pink-100',
      'bg-pink-500', 'bg-pink-300', 'bg-pink-400', 'bg-pink-200', 'bg-pink-50',
    ],
  },
  {
    id: '4',
    name: 'Farmacologia I',
    department: 'Farmacologia',
    retention: 84,
    retentionColor: 'text-indigo-600',
    ringStroke: '#4F46E5',
    ringOffset: 20,
    consistency: 'Crescente',
    consistencyColor: 'text-indigo-600',
    nextReview: 'Em 5 dias',
    nextReviewColor: 'text-gray-700',
    progressPct: 25,
    progressColor: 'bg-indigo-500',
    accentGradient: 'bg-gradient-to-r from-indigo-400 to-indigo-600',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    icon: <FlaskConical size={18} />,
    heatmapColors: [
      'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-200', 'bg-indigo-300', 'bg-indigo-300',
      'bg-indigo-400', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-500', 'bg-indigo-500',
      'bg-indigo-200', 'bg-indigo-300', 'bg-indigo-400', 'bg-indigo-400', 'bg-indigo-500',
      'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-300', 'bg-indigo-400', 'bg-indigo-500',
    ],
  },
  {
    id: '5',
    name: 'Bioquímica',
    department: 'Ciências Básicas',
    retention: 88,
    retentionColor: 'text-emerald-600',
    ringStroke: '#10B981',
    ringOffset: 15,
    consistency: 'Estável',
    consistencyColor: 'text-emerald-600',
    nextReview: 'Em 4 dias',
    nextReviewColor: 'text-gray-700',
    progressPct: 30,
    progressColor: 'bg-emerald-500',
    accentGradient: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: <BookOpen size={18} />,
    heatmapColors: [
      'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300',
      'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300',
      'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300',
      'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300', 'bg-emerald-300',
    ],
  },
];

const TABS = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'subjects', label: 'Matérias' },
  { id: 'settings', label: 'Config. Algoritmo' },
] as const;

export function StudyDashboardsView() {
  const { navigateTo } = useStudentNav();
  const { bktStates, dailyActivity, stats, isConnected } = useStudentDataContext();
  const { tree } = useContentTree();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('overview');

  // Build topic lookup from content tree
  const topicLookup = useMemo(() => {
    const map = new Map<string, { topicName: string; sectionName: string; sectionId: string; courseName: string; courseId: string }>();
    if (!tree) return map;
    for (const course of tree.courses) {
      for (const semester of course.semesters) {
        for (const section of semester.sections) {
          for (const topic of section.topics) {
            map.set(topic.id, {
              topicName: topic.name,
              sectionName: section.name,
              sectionId: section.id,
              courseName: course.name,
              courseId: course.id,
            });
          }
        }
      }
    }
    return map;
  }, [tree]);

  // Build subject cards from real BKT states grouped by section
  const realSubjects: SubjectCard[] = useMemo(() => {
    if (!isConnected || bktStates.length === 0) return [];

    // Group bkt states by section
    const sectionGroups = new Map<string, { name: string; department: string; states: typeof bktStates }>();
    bktStates.forEach(b => {
      const lookup = topicLookup.get(b.subtopic_id);
      const sectionId = lookup?.sectionId || 'unknown';
      const sectionName = lookup?.sectionName || `Seção ${b.subtopic_id.slice(0, 6)}`;
      const courseName = lookup?.courseName || 'Curso';
      if (!sectionGroups.has(sectionId)) {
        sectionGroups.set(sectionId, { name: sectionName, department: courseName, states: [] });
      }
      sectionGroups.get(sectionId)!.states.push(b);
    });

    const PALETTE = ['blue', 'pink', 'indigo', 'emerald', 'red'] as const;
    const ICONS = [<Calculator size={18} />, <Brain size={18} />, <Palette size={18} />, <FlaskConical size={18} />, <BookOpen size={18} />];
    const STROKE_COLORS: Record<string, string> = {
      blue: '#3B82F6', pink: '#DB2777', indigo: '#4F46E5', emerald: '#10B981', red: '#ef4444',
    };

    return Array.from(sectionGroups.entries()).map(([sectionId, group], idx) => {
      const avgPKnow = group.states.reduce((s, b) => s + b.p_know, 0) / group.states.length;
      const retention = Math.round(avgPKnow * 100);
      const c = PALETTE[idx % PALETTE.length];
      const ringOffset = Math.round((1 - avgPKnow) * 125);
      const urgency = getUrgencyLevel(retention);

      // Build mini-heatmap from individual topic mastery values
      const heatmap = group.states
        .map(b => {
          const pct = Math.round(b.p_know * 100);
          if (pct >= 80) return `bg-${c}-500`;
          if (pct >= 60) return `bg-${c}-400`;
          if (pct >= 40) return `bg-${c}-300`;
          return `bg-${c}-200`;
        })
        .concat(Array(Math.max(0, 20 - group.states.length)).fill(`bg-${c}-100`))
        .slice(0, 20);

      // Consistency label
      const variance = group.states.reduce((s, b) => s + Math.abs(b.p_know - avgPKnow), 0) / group.states.length;
      const consistency = variance < 0.1 ? 'Estável' : variance < 0.2 ? 'Moderada' : 'Volátil';

      // Next review estimation
      const hasDue = group.states.some(b => b.p_know < 0.5);

      return {
        id: sectionId,
        name: group.name,
        department: group.department,
        retention,
        retentionColor: `text-${c}-600`,
        ringStroke: STROKE_COLORS[c] || '#8b5cf6',
        ringOffset,
        consistency,
        consistencyColor: retention >= 80 ? `text-${c}-600` : variance >= 0.2 ? 'text-red-500' : `text-${c}-600`,
        nextReview: hasDue ? 'Agora (Atrasado)' : retention >= 80 ? 'Em 5 dias' : 'Amanhã',
        nextReviewColor: hasDue ? 'text-red-500 font-bold uppercase' : 'text-gray-700',
        progressPct: hasDue ? 100 : Math.min(retention, 50),
        progressColor: hasDue ? `bg-${c}-500 animate-pulse` : `bg-${c}-500`,
        accentGradient: `bg-gradient-to-r from-${c}-400 to-${c}-600`,
        iconBg: `bg-${c}-100`,
        iconColor: `text-${c}-600`,
        icon: ICONS[idx % ICONS.length],
        heatmapColors: heatmap,
        isUrgent: urgency === 'critical',
      } as SubjectCard;
    });
  }, [isConnected, bktStates, topicLookup]);

  const displaySubjects = realSubjects.length > 0 ? realSubjects : SUBJECTS;

  return (
    <div className="h-full flex flex-col bg-[#f5f6fa]">
      {/* Header */}
      <div className="shrink-0">
        <AxonPageHeader
          title="Memory Mastery Hub"
          subtitle="Visualize sua retenção e otimize intervalos de estudo"
          onBack={() => navigateTo('schedule')}
          statsRight={
            <div className="flex bg-white/60 p-1 rounded-xl border border-gray-200/60 backdrop-blur-sm">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "px-5 py-2 rounded-lg text-sm transition-all",
                    activeTab === tab.id
                      ? "bg-white shadow-sm text-violet-600"
                      : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light relative">
        {/* Ambient blur */}
        <div className="absolute top-0 left-1/2 w-[800px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

        <div className="px-8 pb-12 space-y-8 relative z-10 pt-6">
          {/* Global Forgetting Curve */}
          {activeTab === 'overview' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/65 backdrop-blur-xl rounded-2xl p-6 shadow-md border border-white/60 relative overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Curva de Esquecimento Global</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-xs text-gray-400">Retenção Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-xs text-gray-400">Decaimento Previsto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
                      <span className="text-xs text-gray-400">Limite Ideal</span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="relative w-full h-80 bg-white/30 rounded-xl border border-white/50 p-4">
                  {/* Y axis labels */}
                  <div className="absolute left-4 top-4 bottom-8 flex flex-col justify-between text-xs text-gray-400 font-mono">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  {/* Grid + Lines */}
                  <div className="absolute left-12 right-4 top-4 bottom-8 border-l border-b border-gray-300">
                    {/* Grid lines */}
                    <div className="w-full border-b border-gray-100 border-dashed absolute top-0" style={{ height: '25%' }} />
                    <div className="w-full border-b border-gray-100 border-dashed absolute top-1/4" style={{ height: '25%' }} />
                    <div className="w-full border-b border-gray-100 border-dashed absolute top-2/4" style={{ height: '25%' }} />
                    
                    {/* Threshold line */}
                    <div className="w-full border-b-2 border-dashed border-red-200 absolute group" style={{ top: '20%' }}>
                      <span className="absolute right-0 -top-6 bg-red-50 text-red-500 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Limite de Revisão
                      </span>
                    </div>

                    {/* Retention curve (SVG) */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                      {/* Actual retention */}
                      <path
                        d="M0,20 Q150,40 300,100 T600,160 T900,180"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="drop-shadow-lg filter"
                      />
                      <circle cx="0" cy="20" r="4" fill="white" stroke="#8b5cf6" strokeWidth="2" />
                      <circle cx="300" cy="100" r="4" fill="white" stroke="#8b5cf6" strokeWidth="2" className="cursor-pointer" />
                      <circle cx="600" cy="160" r="4" fill="white" stroke="#8b5cf6" strokeWidth="2" className="cursor-pointer" />

                      {/* Predicted decay */}
                      <path
                        d="M0,20 Q120,80 250,150 T500,220"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeDasharray="8,4"
                        strokeOpacity="0.6"
                      />
                    </svg>
                  </div>

                  {/* X axis labels */}
                  <div className="absolute left-12 right-4 bottom-2 flex justify-between text-xs text-gray-400 font-mono">
                    <span>Dia 0</span>
                    <span>Dia 3</span>
                    <span>Dia 7</span>
                    <span>Dia 14</span>
                    <span>Dia 30</span>
                  </div>
                </div>
              </motion.div>

              {/* Subject Performance Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Desempenho por Matéria</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-white/50 rounded-lg text-gray-400 transition-colors">
                    <Filter size={18} />
                  </button>
                  <button className="p-2 hover:bg-white/50 rounded-lg text-gray-400 transition-colors">
                    <ArrowUpDown size={18} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Subject Cards Grid */}
          {(activeTab === 'overview' || activeTab === 'subjects') && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displaySubjects.map((subject, i) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx(
                    "bg-white/65 backdrop-blur-xl rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden border border-white/60",
                    subject.isUrgent && "ring-2 ring-red-100"
                  )}
                >
                  {/* Top accent bar */}
                  <div className={clsx("absolute top-0 left-0 w-full h-1", subject.accentGradient)} />

                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", subject.iconBg, subject.iconColor)}>
                        {subject.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{subject.name}</h4>
                        <span className="text-xs text-gray-400">{subject.department}</span>
                      </div>
                    </div>
                    {/* Retention ring */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke={subject.ringStroke}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray="125"
                          strokeDashoffset={subject.ringOffset}
                        />
                      </svg>
                      <span className={clsx("absolute text-xs font-bold", subject.retentionColor)}>{subject.retention}%</span>
                    </div>
                  </div>

                  {/* Consistency */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Consistência de Estudo</span>
                      <span className={clsx("font-mono", subject.consistencyColor)}>{subject.consistency}</span>
                    </div>

                    {/* Mini heatmap */}
                    <div className="grid grid-cols-10 gap-1 h-8">
                      {subject.heatmapColors.map((color, j) => (
                        <div
                          key={j}
                          className={clsx("rounded-sm transition-all hover:scale-125 hover:z-10", color)}
                        />
                      ))}
                    </div>

                    {/* Next review + progress */}
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">
                        Próxima Revisão: <span className={clsx(subject.nextReviewColor)}>{subject.nextReview}</span>
                      </p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={clsx("h-1.5 rounded-full", subject.progressColor)}
                          style={{ width: `${subject.progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Add Subject card */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: displaySubjects.length * 0.05 }}
                className="bg-white/40 backdrop-blur-xl rounded-2xl p-5 hover:shadow-lg transition-all duration-300 relative group flex flex-col items-center justify-center border-dashed border-2 border-gray-300/50 hover:border-violet-500/50 gap-3 min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center text-gray-400 group-hover:bg-violet-50 group-hover:text-violet-500 transition-colors">
                  <Plus size={28} />
                </div>
                <span className="font-bold text-gray-400 group-hover:text-violet-500 transition-colors">Adicionar Matéria</span>
              </motion.button>
            </div>
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/65 backdrop-blur-xl rounded-2xl p-8 shadow-md border border-white/60 max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Settings size={20} className="text-violet-500" />
                <h3 className="font-bold text-gray-800 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Configurações do Algoritmo</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-gray-600 mb-2 block">Intervalo Mínimo de Revisão</label>
                  <p className="text-xs text-gray-400 mb-2">Tempo mínimo entre revisões de um mesmo card.</p>
                  <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-violet-500 focus:border-violet-500">
                    <option>15 minutos</option>
                    <option>1 hora</option>
                    <option>4 horas</option>
                    <option>1 dia</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-600 mb-2 block">Limite de Retenção</label>
                  <p className="text-xs text-gray-400 mb-2">Nível de retenção abaixo do qual o sistema agenda revisão automática.</p>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    defaultValue="80"
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>50%</span>
                    <span className="text-violet-600 font-bold">80%</span>
                    <span>95%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-600 mb-2 block">Cards por Sessão</label>
                  <p className="text-xs text-gray-400 mb-2">Número máximo de cards por sessão de revisão.</p>
                  <input
                    type="number"
                    defaultValue={20}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <button className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm rounded-lg shadow-md hover:brightness-110 transition-all">
                  Salvar Configurações
                </button>
              </div>
            </motion.div>
          )}

          {/* Placeholder notice */}
          {!isConnected && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
              <p className="text-xs text-blue-600">
                Conecte ao backend para ver dados reais do seu estudo.
              </p>
            </div>
          )}
          {isConnected && bktStates.length > 0 && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
              <p className="text-xs text-emerald-600">
                ✓ Dados conectados ao backend — {bktStates.length} estados de conhecimento, {dailyActivity.length} dias de atividade.
              </p>
            </div>
          )}
          {isConnected && bktStates.length === 0 && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
              <p className="text-xs text-amber-600">
                Backend conectado, mas ainda sem dados de progresso. Estude para gerar dados reais.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}