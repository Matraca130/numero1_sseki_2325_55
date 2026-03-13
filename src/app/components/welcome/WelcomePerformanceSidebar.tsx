// ============================================================
// Axon — Welcome Performance Sidebar
// Right panel: circular progress + recent activity.
// Extracted from WelcomeView.tsx for modularization.
// ============================================================
import React from 'react';
import { Play, CheckCircle, FileText, MoreHorizontal } from 'lucide-react';
import { components, headingStyle } from '@/app/design-system';
import { CircularProgress } from '@/app/components/shared/CircularProgress';
import { ActivityItem } from '@/app/components/shared/ActivityItem';

interface WelcomePerformanceSidebarProps {
  timeFilter: 'today' | 'week' | 'month';
  dailyPerformance: number;
  studyHours: number;
  isConnected: boolean;
  cardsReviewed: number;
  streakDays: number;
}

export function WelcomePerformanceSidebar({
  timeFilter,
  dailyPerformance,
  studyHours,
  isConnected,
  cardsReviewed,
  streakDays,
}: WelcomePerformanceSidebarProps) {
  // Build activity items based on connection state
  const recentActivities = [
    {
      icon: <Play size={14} />,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      title: 'Video de Anatomia',
      subtitle: 'Sistema Cardiovascular \u00B7 Hace 20 min',
    },
    {
      icon: <CheckCircle size={14} />,
      iconColor: 'text-axon-accent',
      iconBg: 'bg-[#e6f5f1]',
      title: isConnected ? `${cardsReviewed} Flashcards Revisados` : 'Quiz de Histologia',
      subtitle: isConnected
        ? `Total acumulado \u00B7 ${streakDays} dias seguidos`
        : 'Nota: 9.5/10 \u00B7 Hace 2 horas',
    },
    {
      icon: <FileText size={14} />,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      title: isConnected ? `${studyHours}h Estudiadas` : 'Nuevo resumen',
      subtitle: isConnected ? 'Tiempo total acumulado' : 'Ciclo de Krebs \u00B7 09:15',
    },
  ];

  return (
    <>
      {/* Daily Performance Card */}
      <div className={`${components.cardDark.base} ${components.cardDark.padding}`}>
        <h3 className="text-lg font-bold mb-6" style={headingStyle}>
          Rendimiento {timeFilter === 'today' ? 'Diario' : timeFilter === 'week' ? 'Semanal' : 'Mensual'}
        </h3>

        <CircularProgress
          percent={dailyPerformance}
          size={176}
          strokeWidth={10}
          strokeColor={components.progressCircle.strokeActive}
          trackColor={components.progressCircle.strokeBg}
        >
          <span className="text-5xl font-bold">
            {dailyPerformance}<span className="text-3xl">%</span>
          </span>
          <span className="text-[10px] text-gray-400 mt-2 uppercase tracking-[0.2em] font-semibold">
            COMPLETADO
          </span>
        </CircularProgress>

        <div className="text-center mt-6">
          <p className="text-lg font-bold mb-1">{studyHours} de 10 Horas</p>
          <p className="text-sm text-gray-300">
            {dailyPerformance >= 80 ? 'Estas cerca de la excelencia.' : 'Segui dedicandote!'}
          </p>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className={`${components.card.base} ${components.card.paddingLg}`}>
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
            style={headingStyle}
          >
            Actividad Reciente
          </h3>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <ActivityItem
              key={index}
              icon={activity.icon}
              iconColor={activity.iconColor}
              iconBg={activity.iconBg}
              title={activity.title}
              subtitle={activity.subtitle}
            />
          ))}
        </div>
      </div>
    </>
  );
}