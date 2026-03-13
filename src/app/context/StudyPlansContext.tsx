// ============================================================
// Axon — StudyPlansContext
// Thin context wrapper around useStudyPlans hook.
// Provides a single shared instance across the component tree
// and exposes setRescheduleData for injecting mastery/estimate
// data from consuming components.
// ============================================================
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useStudyPlans, type UseStudyPlansOptions } from '@/app/hooks/useStudyPlans';
import type { StudyPlan } from '@/app/context/AppContext';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';

interface RescheduleData {
  topicMastery: Map<string, TopicMasteryInfo>;
  getTimeEstimate: (methodId: string) => { estimatedMinutes: number };
}

interface StudyPlansContextValue {
  plans: StudyPlan[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPlanFromWizard: (plan: StudyPlan) => Promise<void>;
  toggleTaskComplete: (planId: string, taskId: string) => Promise<void>;
  reorderTasks: (planId: string, orderedIds: string[]) => Promise<void>;
  updatePlanStatus: (planId: string, status: 'active' | 'completed' | 'archived') => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  /** Inject mastery + time estimate data for reschedule engine */
  setRescheduleData: (data: RescheduleData | null) => void;
}

const StudyPlansCtx = createContext<StudyPlansContextValue | null>(null);

export function StudyPlansProvider({ children }: { children: React.ReactNode }) {
  const [rescheduleData, setRescheduleDataState] = useState<RescheduleData | null>(null);

  const opts: UseStudyPlansOptions | undefined = rescheduleData
    ? {
        topicMastery: rescheduleData.topicMastery,
        getTimeEstimate: rescheduleData.getTimeEstimate,
      }
    : undefined;

  const hook = useStudyPlans(opts);

  const setRescheduleData = useCallback((data: RescheduleData | null) => {
    setRescheduleDataState(data);
  }, []);

  const value = useMemo<StudyPlansContextValue>(() => ({
    plans: hook.plans,
    loading: hook.loading,
    error: hook.error,
    refresh: hook.refresh,
    createPlanFromWizard: hook.createPlanFromWizard,
    toggleTaskComplete: hook.toggleTaskComplete,
    reorderTasks: hook.reorderTasks,
    updatePlanStatus: hook.updatePlanStatus,
    deletePlan: hook.deletePlan,
    setRescheduleData,
  }), [hook, setRescheduleData]);

  return <StudyPlansCtx.Provider value={value}>{children}</StudyPlansCtx.Provider>;
}

export function useStudyPlansContext(): StudyPlansContextValue {
  const ctx = useContext(StudyPlansCtx);
  if (!ctx) {
    throw new Error('useStudyPlansContext must be used within a StudyPlansProvider');
  }
  return ctx;
}
