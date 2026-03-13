// ============================================================
// Axon — Dashboard Active Study Plans Section
// Shows active study plans with progress, subject badges,
// and today's tasks preview.
// Extracted from DashboardView.tsx for modularization.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import clsx from 'clsx';
import { headingStyle, components } from '@/app/design-system';
import { SkeletonList } from '@/app/components/shared/Skeletons';
import type { StudyPlan } from '@/app/context/AppContext';

interface DashboardStudyPlansProps {
  studyPlans: StudyPlan[];
  plansLoading: boolean;
  toggleTaskComplete: (planId: string, taskId: string) => Promise<void>;
}

export function DashboardStudyPlans({
  studyPlans,
  plansLoading,
  toggleTaskComplete,
}: DashboardStudyPlansProps) {
  const { navigateTo } = useStudentNav();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={components.chartCard.base}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900" style={headingStyle}>Planes de Estudio Activos</h3>
          <p className="text-sm text-gray-500">
            {studyPlans.length > 0
              ? `${studyPlans.length} plan${studyPlans.length > 1 ? 'es' : ''} en curso`
              : 'Crea tu primer plan de estudio'}
          </p>
        </div>
        <button
          onClick={() => navigateTo('organize-study')}
          className="flex items-center gap-2 px-4 py-2 bg-axon-dark hover:bg-axon-hover rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Crear Plan
        </button>
      </div>

      {plansLoading ? (
        <SkeletonList rows={3} />
      ) : studyPlans.length > 0 ? (
        <div className="space-y-4">
          {studyPlans.map((plan, index) => {
            const completed = plan.tasks.filter(t => t.completed).length;
            const total = plan.tasks.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const todayTasks = plan.tasks.filter(t => {
              const d = new Date(t.date);
              const now = new Date();
              return d.toDateString() === now.toDateString();
            });

            return (
              <div key={`${plan.id}-${index}`} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#ccebe3] flex items-center justify-center">
                      <Target size={18} className="text-axon-accent" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      <p className="text-xs text-gray-500">{completed}/{total} tareas - {pct}% completo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigateTo('schedule')}
                    className="text-sm text-axon-accent font-medium hover:text-axon-hover flex items-center gap-1"
                  >
                    Ver plan <ArrowUpRight size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-axon-accent rounded-full"
                  />
                </div>

                {/* Subject badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {plan.subjects.slice(0, 4).map((s, sIdx) => (
                    <span key={`${s.id}-${sIdx}`} className={clsx("text-[10px] px-2 py-0.5 rounded-full text-white font-medium", s.color)}>
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tareas de hoy</p>
                    {todayTasks.slice(0, 3).map((task, tIdx) => (
                      <div key={`${task.id}-${tIdx}`} className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTaskComplete(plan.id, task.id)}
                          className={clsx(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            task.completed
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-300 hover:border-axon-accent"
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
          <p className="font-medium text-gray-500">Ningun plan de estudio activo</p>
          <p className="text-sm mt-1">Crea un plan para organizar tu estudio</p>
          <button
            onClick={() => navigateTo('organize-study')}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-axon-dark hover:bg-axon-hover rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Crear Plan de Estudio
          </button>
        </div>
      )}
    </motion.div>
  );
}