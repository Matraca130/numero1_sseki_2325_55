// ============================================================
// Axon — Daily Performance Sidebar
// Right sidebar for StudentDataPanel: circular progress ring
// + recent activity list.
// Extracted from StudentDataPanel.tsx for modularization.
// ============================================================
import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { ActivityItem } from '@/app/components/shared/ActivityItem';
import { CircularProgress } from '@/app/components/shared/CircularProgress';
import { ACTIVITY_VISUALS } from '@/app/components/student-panel/panelVisuals';

interface DailyPerformanceSidebarProps {
  dailyProgress: number;
  hoursCompleted: number;
  totalHoursGoal: number;
  dailyActivity: Array<{
    date: string;
    cardsReviewed: number;
    studyMinutes: number;
    sessionsCount: number;
  }>;
  sessions: Array<{
    id: string;
    startedAt: string;
  }>;
}

export function DailyPerformanceSidebar({
  dailyProgress,
  hoursCompleted,
  totalHoursGoal,
  dailyActivity,
  sessions,
}: DailyPerformanceSidebarProps) {
  return (
    <div className="w-80 space-y-6 flex-shrink-0">
      {/* Daily Performance Card */}
      <div className="bg-[#1a2e2a] rounded-2xl p-6 text-white">
        <h3 className="text-xl font-bold mb-6">Rendimiento Diario</h3>

        <CircularProgress percent={dailyProgress} size={192} strokeWidth={12}>
          <span className="text-5xl font-bold">{dailyProgress}%</span>
          <span className="text-xs text-gray-400 mt-1 uppercase tracking-wide">COMPLETADO</span>
        </CircularProgress>

        <div className="text-center">
          <p className="text-xl font-bold mb-1">{hoursCompleted} de {totalHoursGoal} Horas</p>
          <p className="text-sm text-gray-400">Estas cerca de la excelencia.</p>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Actividad Reciente</h3>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {dailyActivity.length > 0 ? (
            dailyActivity.slice(0, 3).map((day, idx) => {
              const a = ACTIVITY_VISUALS[idx % ACTIVITY_VISUALS.length];
              const date = new Date(day.date + 'T12:00:00');
              const timeStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
              return (
                <ActivityItem
                  key={day.date}
                  icon={a.icon}
                  iconColor={a.color}
                  iconBg={a.bg}
                  title={`${day.cardsReviewed} cards \u2022 ${day.studyMinutes} min`}
                  subtitle={`${day.sessionsCount} sesion(es) \u2022 ${timeStr}`}
                />
              );
            })
          ) : (
            sessions.slice(0, 3).map((session, idx) => {
              const a = ACTIVITY_VISUALS[idx % ACTIVITY_VISUALS.length];
              const date = new Date(session.startedAt);
              const timeStr = `Hace ${date.getHours()}h ${date.getMinutes()} min`;
              return (
                <ActivityItem
                  key={session.id}
                  icon={a.icon}
                  iconColor={a.color}
                  iconBg={a.bg}
                  title={a.label}
                  subtitle={`${a.sub} \u2022 ${timeStr}`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}