// ============================================================
// Axon — Plan Progress Sidebar (right column)
// Action buttons, quick nav, progress gauge, active plan list.
// Extracted from StudyPlanDashboard.tsx for modularization.
// ============================================================
import React, { useRef, useEffect } from 'react';
import {
  MoreVertical,
  Plus,
  Pencil,
  Trophy,
  Check,
  Archive,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { QuickNavLinks } from '@/app/components/schedule/QuickNavLinks';
import type { StudyPlan } from '@/app/context/AppContext';

interface PlanProgressSidebarProps {
  studyPlans: StudyPlan[];
  progressPercent: number;
  completedTasks: number;
  totalTasks: number;
  onNavigateNewPlan: () => void;
  onNavigateEditPlan: (planId: string) => void;
  onPlanAction: (planId: string, action: 'completed' | 'archived' | 'delete') => Promise<void>;
}

export function PlanProgressSidebar({
  studyPlans,
  progressPercent,
  completedTasks,
  totalTasks,
  onNavigateNewPlan,
  onNavigateEditPlan,
  onPlanAction,
}: PlanProgressSidebarProps) {
  const [openMenuPlanId, setOpenMenuPlanId] = React.useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPlanId(null);
      }
    };
    if (openMenuPlanId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuPlanId]);

  const isOnTrack = totalTasks > 0 && (completedTasks / totalTasks) >= 0.4;

  const handleAction = async (planId: string, action: 'completed' | 'archived' | 'delete') => {
    setOpenMenuPlanId(null);
    await onPlanAction(planId, action);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
      {/* Action buttons */}
      <div className="p-4 border-b border-gray-100 space-y-2">
        <button
          onClick={onNavigateNewPlan}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#1B3B36] text-white rounded-xl font-semibold text-sm hover:bg-[#244e47] transition-colors shadow-sm"
        >
          <Plus size={16} />
          Agregar nuevo plan de estudio
        </button>
        <button
          onClick={() => {
            if (studyPlans.length > 0) onNavigateEditPlan(studyPlans[0].id);
          }}
          disabled={studyPlans.length === 0}
          className={`w-full flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors ${
            studyPlans.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
          }`}
        >
          <Pencil size={16} />
          Editar plan de estudio
        </button>
      </div>

      {/* Quick Nav */}
      <div className="p-4 border-b border-gray-100">
        <QuickNavLinks variant="light" />
      </div>

      {/* General Progress */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="font-bold text-gray-800 text-sm mb-4">Progreso general</h4>

        {/* Gauge */}
        <div className="flex flex-col items-center mb-4">
          <svg viewBox="0 0 120 80" className="w-40">
            <path
              d="M 10 70 A 50 50 0 0 1 110 70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 10 70 A 50 50 0 0 1 110 70"
              fill="none"
              stroke="#0d9488"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${progressPercent * 1.57} 157`}
            />
            <text x="60" y="55" textAnchor="middle" className="text-2xl font-bold" fill="#1e293b" fontSize="24">
              {progressPercent}%
            </text>
            <text x="60" y="72" textAnchor="middle" fill="#94a3b8" fontSize="9">
              del contenido cubierto
            </text>
          </svg>
        </div>

        {/* Status badge */}
        <div className="flex justify-center">
          <span className={clsx(
            "px-3 py-1 rounded-full text-xs font-bold",
            isOnTrack
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          )}>
            {isOnTrack ? 'Al dia' : 'Atrasado'}
          </span>
        </div>

        <p className="text-xs text-gray-500 text-center mt-3">
          Vas al ritmo previsto y vas a alcanzar tu objetivo segun lo programado.
        </p>
      </div>

      {/* Study Plan list */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h4 className="font-bold text-gray-800 text-sm mb-3">Planes activos</h4>
        <div className="space-y-3">
          {studyPlans.map((plan) => {
            const planCompleted = plan.tasks.filter(t => t.completed).length;
            const planTotal = plan.tasks.length;
            const planProgress = planTotal > 0 ? Math.round((planCompleted / planTotal) * 100) : 0;
            const isMenuOpen = openMenuPlanId === plan.id;
            return (
              <div key={plan.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-sm">{plan.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-500">{planProgress}%</span>
                    <button
                      onClick={() => setOpenMenuPlanId(isMenuOpen ? null : plan.id)}
                      className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>

                {/* Action dropdown */}
                {isMenuOpen && (
                  <div ref={menuRef} className="absolute right-3 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 w-48">
                    <button
                      onClick={() => {
                        setOpenMenuPlanId(null);
                        onNavigateEditPlan(plan.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-[#e6f5f1] hover:text-[#1B3B36] transition-colors"
                    >
                      <Pencil size={14} />
                      Editar plan
                    </button>
                    <button
                      onClick={() => handleAction(plan.id, 'completed')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <Check size={14} />
                      Marcar como completado
                    </button>
                    <button
                      onClick={() => handleAction(plan.id, 'archived')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                      <Archive size={14} />
                      Archivar plan
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => handleAction(plan.id, 'delete')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Eliminar plan
                    </button>
                  </div>
                )}

                <div className="flex gap-1 mb-2">
                  {plan.subjects.map(s => (
                    <span key={s.id} className={clsx("text-[10px] px-2 py-0.5 rounded-full text-white font-bold", s.color)}>
                      {s.name}
                    </span>
                  ))}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-[#2a8c7a] h-1.5 rounded-full transition-all"
                    style={{ width: `${planProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
                  <span>{planCompleted}/{planTotal} tareas</span>
                  <span>hasta {format(plan.completionDate, "dd/MM/yyyy")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly report button */}
      <div className="p-4 border-t border-gray-100">
        <button className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          Ver Reporte Semanal
        </button>
      </div>
    </div>
  );
}