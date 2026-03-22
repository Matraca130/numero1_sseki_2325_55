// ============================================================
// Axon — Plan Progress Sidebar (right column) — RESPONSIVE
// Restyled to match Figma v4.5 Cronograma design.
//
// Changes:
//   1. Accept optional `embedded` prop for mobile tab rendering
//   2. When embedded: w-full, no border-l, no shrink-0
//   3. When not embedded: hidden lg:flex w-[288px] (desktop only)
//   4. Action buttons: dark full CTA + outlined edit button (Figma style)
//   5. QuickNavLinks: "ACCESO RÁPIDO" section using shared QuickNavLinks component
//   6. Plan list: compact cards with progress bar
//   7. Animations: slide-in, hover, motion interactions
// ============================================================
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreVertical,
  Plus,
  Pencil,
  Check,
  Archive,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import type { StudyPlan } from '@/app/context/AppContext';
import { QuickNavLinks } from '@/app/components/schedule/QuickNavLinks';

interface PlanProgressSidebarProps {
  studyPlans: StudyPlan[];
  progressPercent: number;
  completedTasks: number;
  totalTasks: number;
  onNavigateNewPlan: () => void;
  onNavigateEditPlan: (planId: string) => void;
  onPlanAction: (planId: string, action: 'completed' | 'archived' | 'delete') => Promise<void>;
  /** When true, renders full-width without border (for mobile tab panels) */
  embedded?: boolean;
}

export function PlanProgressSidebar({
  studyPlans,
  progressPercent,
  completedTasks,
  totalTasks,
  onNavigateNewPlan,
  onNavigateEditPlan,
  onPlanAction,
  embedded = false,
}: PlanProgressSidebarProps) {
  const [openMenuPlanId, setOpenMenuPlanId] = React.useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPlanId(null);
      }
    };
    if (openMenuPlanId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuPlanId]);

  const handleAction = async (planId: string, action: 'completed' | 'archived' | 'delete') => {
    setOpenMenuPlanId(null);
    await onPlanAction(planId, action);
  };

  return (
    <div
      className={
        embedded
          ? 'w-full bg-white flex flex-col'
          : 'hidden lg:flex w-[288px] bg-white border-l border-gray-200 flex-col shrink-0'
      }
    >
      {/* ── Action buttons — Figma style ── */}
      <div className="px-4 pt-4 pb-3 border-b border-[#f0f1f4] space-y-2">
        <motion.button
          onClick={onNavigateNewPlan}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-2 px-4 py-3 min-h-[44px] bg-[#1B3B36] text-white rounded-xl font-semibold text-[13px] hover:bg-[#244e47] transition-colors shadow-sm"
        >
          <Plus size={15} />
          Agregar nuevo plan de estudio
        </motion.button>
        <motion.button
          onClick={() => {
            if (studyPlans.length > 0) onNavigateEditPlan(studyPlans[0].id);
          }}
          disabled={studyPlans.length === 0}
          whileTap={{ scale: 0.98 }}
          className={clsx(
            'w-full flex items-center gap-2 px-4 py-3 min-h-[44px] border border-[#e8eaed] text-[#4a5565] rounded-xl font-semibold text-[13px] transition-colors bg-white',
            studyPlans.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
          )}
        >
          <Pencil size={14} className="text-[#8b95a5]" />
          Editar plan de estudio
        </motion.button>
      </div>

      {/* ── Acceso Rápido — using shared QuickNavLinks component ── */}
      <div className="px-4 pt-4 pb-3 border-b border-[#f0f1f4]">
        <QuickNavLinks variant="light" />
      </div>

      {/* ── Active Plans list ── */}
      <div className="px-4 pt-4 pb-3 flex-1 overflow-y-auto">
        <h4 className="text-[11px] font-bold text-[#8b95a5] uppercase tracking-[0.15em] mb-3">
          Planes activos
        </h4>

        {studyPlans.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-[#9ba3b2]">
            <p className="text-[12px] text-center">No hay planes activos.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {studyPlans.map((plan, i) => {
              const planCompleted = plan.tasks.filter(t => t.completed).length;
              const planTotal = plan.tasks.length;
              const planProgress = planTotal > 0 ? Math.round((planCompleted / planTotal) * 100) : 0;
              const isMenuOpen = openMenuPlanId === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#faf9f6] rounded-xl p-3 border border-[#eef0f3] relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[#3a4455] text-[12px] truncate flex-1 mr-2">{plan.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-[#6b7385]">{planProgress}%</span>
                      <button
                        onClick={() => setOpenMenuPlanId(isMenuOpen ? null : plan.id)}
                        className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-gray-200 rounded-lg text-[#9ba3b2] hover:text-[#4a5565] transition-colors"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-3 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 w-48"
                      >
                        <button
                          onClick={() => { setOpenMenuPlanId(null); onNavigateEditPlan(plan.id); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] text-[12px] text-gray-700 hover:bg-[#e6f5f1] hover:text-[#1B3B36] transition-colors"
                        >
                          <Pencil size={13} /> Editar plan
                        </button>
                        <button
                          onClick={() => handleAction(plan.id, 'completed')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] text-[12px] text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <Check size={13} /> Marcar completado
                        </button>
                        <button
                          onClick={() => handleAction(plan.id, 'archived')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] text-[12px] text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                        >
                          <Archive size={13} /> Archivar plan
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => handleAction(plan.id, 'delete')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} /> Eliminar plan
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Subject chips */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {plan.subjects.map(s => (
                      <span key={s.id} className={clsx('text-[10px] px-2 py-0.5 rounded-full text-white font-bold', s.color)}>
                        {s.name}
                      </span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#e8eaed] rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-1.5 rounded-full bg-[#2a8c7a]"
                      initial={{ width: 0 }}
                      animate={{ width: `${planProgress}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.1 }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-2 text-[10px] text-[#9ba3b2]">
                    <span>{planCompleted}/{planTotal} tareas</span>
                    <span>hasta {format(plan.completionDate, 'dd/MM/yyyy')}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Overall progress ── */}
      {!embedded && (
        <div className="px-4 py-4 border-t border-[#f0f1f4] bg-[#faf9f6]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0" style={{ width: 36, height: 36 }}>
              <svg viewBox="0 0 36 36" width="36" height="36" className="-rotate-90">
                <circle cx="18" cy="18" r="14" stroke="#e8eaed" strokeWidth="3" fill="none" />
                <motion.circle
                  cx="18" cy="18" r="14"
                  stroke="#2a8c7a"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 87.96' }}
                  animate={{ strokeDasharray: `${(progressPercent / 100) * 87.96} 87.96` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#3a4455]">
                {progressPercent}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#3a4455]">Progreso general</p>
              <p className="text-[10px] text-[#9ba3b2]">{completedTasks}/{totalTasks} tareas completadas</p>
            </div>
            <span className={clsx(
              'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
              completedTasks / Math.max(totalTasks, 1) >= 0.4
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            )}>
              {completedTasks / Math.max(totalTasks, 1) >= 0.4 ? 'Al día' : 'Atrasado'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
