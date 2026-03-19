// ============================================================
// Axon — Schedule View (Orchestrator)
// Routes between DefaultScheduleView (no plans) and
// StudyPlanDashboard (active plans).
//
// Modularized from a 1200-line monolith. Sub-components live in:
//   /src/app/components/schedule/
// ============================================================
import React from 'react';
import { useStudyPlansContext } from '@/app/context/StudyPlansContext';
import { SkeletonSchedule } from '@/app/components/shared/Skeletons';
import { DefaultScheduleView } from '@/app/components/schedule/DefaultScheduleView';
import { StudyPlanDashboard } from '@/app/components/schedule/StudyPlanDashboard';

export function ScheduleView() {
  const {
    plans,
    loading: plansLoading,
    toggleTaskComplete,
    reorderTasks,
    updatePlanStatus,
    deletePlan,
  } = useStudyPlansContext();

  if (plansLoading) {
    return <SkeletonSchedule />;
  }

  if (plans.length === 0) {
    return <DefaultScheduleView />;
  }

  return (
    <StudyPlanDashboard
      studyPlans={plans}
      toggleTaskComplete={toggleTaskComplete}
      reorderTasks={reorderTasks}
      updatePlanStatus={updatePlanStatus}
      deletePlan={deletePlan}
    />
  );
}
