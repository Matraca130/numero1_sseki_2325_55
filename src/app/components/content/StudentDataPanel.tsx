// ============================================================
// Axon — Student Data Panel (Medical Academy Complete Layout)
// Shows connection status + student profile & stats from Supabase
// ============================================================

import React, { useState } from 'react';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import {
  User,
  Database,
  RefreshCw,
  Zap,
  GraduationCap,
  AlertCircle,
  Loader2,
  Search,
  Bell,
  Play,
  CheckCircle,
  FileText,
  LayoutDashboard,
  Sparkles,
  ClipboardCheck,
  Library,
  Video,
  Image,
  LogOut,
  MoreHorizontal,
} from 'lucide-react';

import { NavItem } from '@/app/components/shared/NavItem';
import { CourseCard } from '@/app/components/shared/CourseCard';
import { ActivityItem } from '@/app/components/shared/ActivityItem';

// ── Mapping helpers for StudentDataPanel data → shared component props ──
const COURSE_VISUALS = [
  { icon: '🦠', bg: 'bg-purple-100', progress: 'bg-purple-500', percent: 'text-purple-600' },
  { icon: '🌿', bg: 'bg-teal-100', progress: 'bg-teal-600', percent: 'text-teal-600' },
  { icon: '🔬', bg: 'bg-blue-100', progress: 'bg-blue-500', percent: 'text-blue-600' },
  { icon: '❤️', bg: 'bg-pink-100', progress: 'bg-pink-500', percent: 'text-pink-600' },
];

const ACTIVITY_VISUALS = [
  { icon: <Play size={16} />, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Vídeo de Anatomia', sub: 'Sistema Cardiovascular' },
  { icon: <CheckCircle size={16} />, bg: 'bg-teal-100', color: 'text-teal-600', label: 'Quiz de Histologia', sub: 'Nota: 9.5/10' },
  { icon: <FileText size={16} />, bg: 'bg-amber-100', color: 'text-amber-600', label: 'Novo resumo', sub: 'Ciclo de Krebs' },
];

export function StudentDataPanel() {
  const { profile, stats, courseProgress, dailyActivity, sessions, loading, error, isConnected, refresh, seedAndLoad } = useStudentDataContext();
  const [seeding, setSeeding] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  const handleSeed = async () => {
    setSeeding(true);
    await seedAndLoad();
    setSeeding(false);
  };

  const seeded = isConnected;

  // Calculate daily progress
  const dailyGoal = profile?.preferences?.dailyGoalMinutes || 600; // 10 hours default
  const todayMinutes = stats?.averageDailyMinutes || 0;
  const dailyProgress = Math.min(Math.round((todayMinutes / dailyGoal) * 100), 100);
  const hoursCompleted = Math.floor(todayMinutes / 60);
  const totalHoursGoal = Math.floor(dailyGoal / 60);

  return (
    <div className="flex min-h-screen bg-[#f5f3ef]">
      {/* Left Sidebar */}
      <aside className="w-56 bg-[#2d3e50] text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">AXON</h1>
              <p className="text-xs text-gray-400">MEDICAL ACADEMY</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active variant="panel" />
          <NavItem icon={<Sparkles size={20} />} label="IA Mentor" variant="panel" />
          <NavItem icon={<ClipboardCheck size={20} />} label="Avaliações" variant="panel" />
          <NavItem icon={<Library size={20} />} label="Biblioteca" variant="panel" />
          <NavItem icon={<Video size={20} />} label="Masterclasses" variant="panel" />
          <NavItem icon={<Image size={20} />} label="Atlas Visual" variant="panel" />
        </nav>

        {/* Logout Button */}
        <div className="p-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
            <LogOut size={18} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar no acervo acadêmico..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-4 ml-6">
              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {profile?.name || 'Dr. Julian Reed'}
                  </p>
                  <p className="text-xs text-gray-500">{profile?.course || 'CARDIOLOGIA'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Connection Status Banner (only show when not connected) */}
        {!seeded && (
          <div className={`border-b px-8 py-4 ${
            error ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                error ? 'bg-red-500' : 'bg-amber-500'
              }`}>
                {loading ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : error ? (
                  <AlertCircle size={20} className="text-white" />
                ) : (
                  <Database size={20} className="text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-gray-900">
                  {loading ? 'Conectando ao Supabase...' : error ? 'Erro de Conexão' : 'Banco de Dados Vazio'}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {loading
                    ? 'Verificando dados do estudante...'
                    : error
                    ? error
                    : 'Clique em "Carregar Dados Demo" para popular o banco'}
                </p>
              </div>
              <div className="flex gap-2">
                {!loading && (
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {seeding ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Carregar Dados Demo
                  </button>
                )}
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="p-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          <div className="flex gap-6 max-w-[1600px]">
            {/* Left Content */}
            <div className="flex-1 space-y-6">
              {/* Welcome Section */}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Bem-vindo de volta, {profile?.name?.split(' ')[0] || 'Dr. Reed'}
                </h1>
                <p className="text-gray-500 italic text-sm">
                  "A excelência não é um ato, mas um hábito." — Aristóteles
                </p>
              </div>

              {/* Time Filters */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  {(['today', 'week', 'month'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTimeFilter(f)}
                      className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        timeFilter === f
                          ? 'bg-[#2d3e50] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {f === 'today' ? 'Hoje' : f === 'week' ? 'Semana' : 'Mês'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Disciplinas em Curso</h2>
                <button className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1">
                  Ver currículo completo →
                </button>
              </div>

              {/* Courses Grid */}
              {seeded && courseProgress.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courseProgress.slice(0, 4).map((course, idx) => {
                    const v = COURSE_VISUALS[idx % COURSE_VISUALS.length];
                    return (
                      <CourseCard
                        key={course.courseId}
                        title={course.courseName}
                        module={course.topicProgress?.[0]?.topicTitle || `MÓDULO ${['IV', 'FINAL', 'II', 'I'][idx % 4]}`}
                        progress={course.masteryPercent}
                        progressText={`${course.lessonsCompleted}/${course.lessonsTotal} Aulas`}
                        icon={v.icon}
                        iconBg={v.bg}
                        progressColor={v.progress}
                        percentColor={v.percent}
                        onContinue={() => {}}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                  <Database size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum dado disponível</h3>
                  <p className="text-gray-500 mb-6">
                    Carregue os dados de demonstração para visualizar o painel completo
                  </p>
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    {seeding ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    Carregar Dados Demo
                  </button>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            {seeded && (
              <div className="w-80 space-y-6 flex-shrink-0">
                {/* Daily Performance Card */}
                <div className="bg-[#2d3e50] rounded-2xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-6">Desempenho Diário</h3>
                  
                  {/* Circular Progress */}
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="#14b8a6"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 80}`}
                        strokeDashoffset={`${2 * Math.PI * 80 * (1 - dailyProgress / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold">{dailyProgress}%</span>
                      <span className="text-xs text-gray-400 mt-1 uppercase tracking-wide">CONCLUÍDO</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold mb-1">{hoursCompleted} de {totalHoursGoal} Horas</p>
                    <p className="text-sm text-gray-400">Você está próximo da excelência.</p>
                  </div>
                </div>

                {/* Recent Activity Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-900">Atividade Recente</h3>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {sessions.slice(0, 3).map((session, idx) => {
                      const a = ACTIVITY_VISUALS[idx % ACTIVITY_VISUALS.length];
                      const date = new Date(session.startedAt);
                      const timeStr = `Há ${date.getHours()}h ${date.getMinutes()} min`;
                      return (
                        <ActivityItem
                          key={session.id}
                          icon={a.icon}
                          iconColor={a.color}
                          iconBg={a.bg}
                          title={a.label}
                          subtitle={`${a.sub} • ${timeStr}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
