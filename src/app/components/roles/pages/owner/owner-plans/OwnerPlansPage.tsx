/**
 * OwnerPlansPage — Main component.
 * Plans management page for institution owners.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import * as api from '@/app/services/platformApi';
import { toast, Toaster } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { CreditCard, Plus, RefreshCw } from 'lucide-react';
import type { InstitutionPlan } from '@/app/types/platform';
import { FadeIn, PlansSkeleton, PlansError, PlansEmpty } from './PlansStates';
import { PlanCard, PlansStats } from './PlanCard';
import { CreatePlanDialog, EditPlanDialog, DeletePlanDialog } from './PlanDialogs';

export function OwnerPlansPage() {
  const { plans, institutionId, loading, error, refresh, refreshPlans } = usePlatformData();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstitutionPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstitutionPlan | null>(null);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [plans]);

  const handleSetDefault = useCallback(async (plan: InstitutionPlan) => {
    try {
      await api.setDefaultInstitutionPlan(plan.id);
      await refreshPlans();
      toast.success(`"${plan.name}" es ahora el plan por defecto`);
    } catch (err: unknown) {
      toast.error(`Error al cambiar plan default: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  }, [refreshPlans]);

  const handleToggleActive = useCallback(async (plan: InstitutionPlan) => {
    try {
      await api.updateInstitutionPlan(plan.id, { is_active: !plan.is_active });
      await refreshPlans();
      toast.success(`"${plan.name}" ${!plan.is_active ? 'activado' : 'desactivado'}`);
    } catch (err: unknown) {
      toast.error(`Error al cambiar estado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  }, [refreshPlans]);

  if (loading) return <PlansSkeleton />;
  if (error) return <PlansError message={error} onRetry={refresh} />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <Toaster position="top-right" richColors closeButton />

      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Planes</h1>
              <Badge variant="secondary" className="text-xs tabular-nums">{plans.length}</Badge>
            </div>
            <p className="text-sm text-gray-500">Crea y gestiona planes de suscripcion para tus estudiantes</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 self-start sm:self-auto">
            <Plus size={14} />Crear plan
          </Button>
        </div>
      </FadeIn>

      {plans.length > 0 && <FadeIn delay={0.06}><PlansStats plans={plans} /></FadeIn>}

      {plans.length === 0 ? (
        <PlansEmpty onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedPlans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} onEdit={setEditTarget} onDelete={setDeleteTarget} onSetDefault={handleSetDefault} onToggleActive={handleToggleActive} />
          ))}
        </div>
      )}

      {plans.length > 0 && (
        <FadeIn delay={0.18}>
          <div className="flex justify-end">
            <button onClick={refreshPlans} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
              <RefreshCw size={10} />Refrescar planes
            </button>
          </div>
        </FadeIn>
      )}

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} institutionId={institutionId ?? ''} onRefresh={refreshPlans} />
      <EditPlanDialog plan={editTarget} open={editTarget !== null} onOpenChange={(v) => { if (!v) setEditTarget(null); }} onRefresh={refreshPlans} />
      <DeletePlanDialog plan={deleteTarget} open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }} onRefresh={refreshPlans} />
    </div>
  );
}
