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
import { useTopicMasteryContext } from '@/app/context/TopicMasteryContext';
import { useStudyTimeEstimatesContext } from '@/app/context/StudyTimeEstimatesContext';
import { SkeletonSchedule } from '@/app/components/shared/Skeletons';
import { DefaultScheduleView } from '@/app/components/schedule/DefaultScheduleView';
import { StudyPlanDashboard } from '@/app/components/schedule/StudyPlanDashboard';

export function ScheduleView() {
  // PERF-S4: Use shared context instead of per-component hook instance.
  const { topicMastery } = useTopicMasteryContext();
  const { getEstimate } = useStudyTimeEstimatesContext();

  const {
    plans,
    loading: plansLoading,
    toggleTaskComplete,
    reorderTasks,
    updatePlanStatus,
    deletePlan,
    setRescheduleData,
  } = useStudyPlansContext();

  // Inject mastery + estimate data for reschedule engine
  React.useEffect(() => {
    setRescheduleData({ topicMastery, getTimeEstimate: getEstimate });
    return () => setRescheduleData(null);
  }, [topicMastery, getEstimate, setRescheduleData]);

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
