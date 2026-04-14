import { useMemo } from 'react';
import type { useStudentDataContext } from '@/app/context/StudentDataContext';
import type { TimeFilter } from './welcomeTokens';

type StudentStats = ReturnType<typeof useStudentDataContext>['stats'];
type ProfileDataXP = { xp?: { today: number; this_week: number; total: number } } | null | undefined;

export function useFilteredStats(
  timeFilter: TimeFilter,
  stats: StudentStats,
  profileData: ProfileDataXP,
) {
  return useMemo(() => {
    const weekly = stats?.weeklyActivity ?? [];
    const todayIdx = (new Date().getDay() + 6) % 7;
    const todayMinutes = weekly[todayIdx] ?? 0;
    const weekMinutes = weekly.reduce((a, b) => a + b, 0);
    const xpToday = profileData?.xp?.today ?? 0;
    const xpWeek = profileData?.xp?.this_week ?? 0;
    const xpTotal = profileData?.xp?.total ?? 0;

    switch (timeFilter) {
      case 'today':
        return {
          xpLabel: 'XP Hoy',
          xpValue: xpToday > 0 ? `+${xpToday}` : '0',
          hoursLabel: 'Hoy',
          hoursValue: `${Math.round(todayMinutes / 60)}h`,
          studyMinutes: todayMinutes,
        };
      case 'week':
        return {
          xpLabel: 'XP Semana',
          xpValue: xpWeek > 0 ? `+${xpWeek}` : '0',
          hoursLabel: 'Semana',
          hoursValue: `${Math.round(weekMinutes / 60)}h`,
          studyMinutes: weekMinutes,
        };
      case 'month':
        return {
          xpLabel: 'XP Total',
          xpValue: xpTotal > 0 ? xpTotal.toLocaleString() : '0',
          hoursLabel: 'Total',
          hoursValue: `${Math.round((stats?.totalStudyMinutes ?? 0) / 60)}h`,
          studyMinutes: stats?.totalStudyMinutes ?? 0,
        };
    }
  }, [timeFilter, stats, profileData]);
}
