/**
 * Plan dialogs — Create, Edit, Delete for OwnerPlansPage.
 */

import React, { useState, useCallback } from 'react';
import * as api from '@/app/services/platformApi';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { InstitutionPlan } from '@/app/types/platform';
import { PlanForm, DEFAULT_FORM, planToForm } from './PlanForm';
import type { PlanFormData } from './PlanForm';

// ── Create Plan Dialog ────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  onRefresh: () => Promise<void>;
}

export function CreatePlanDialog({ open, onOpenChange, institutionId, onRefresh }: CreateDialogProps) {
  const [form, setForm] = useState<PlanFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => { setForm(DEFAULT_FORM); setLoading(false); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('El nombre del plan es obligatorio'); return; }
    setLoading(true);
    try {
      await api.createInstitutionPlan({
        institution_id: institutionId, name: form.name.trim(),
        description: form.description.trim() || undefined,
        price_cents: form.price_cents, billing_cycle: form.billing_cycle, is_default: form.is_default,
      });
      await onRefresh();
      toast.success(`Plan "${form.name.trim()}" creado exitosamente`);
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Error al crear plan: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus size={18} className="text-amber-500" />Crear plan</DialogTitle>
          <DialogDescription>Define un nuevo plan de suscripcion para tus estudiantes</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <PlanForm form={form} onChange={setForm} loading={loading} />
          <DialogFooter className="pt-5">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-amber-500 hover:bg-amber-600">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {loading ? 'Creando...' : 'Crear plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Plan Dialog ──────────────────────────────────────

interface EditDialogProps {
  plan: InstitutionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => Promise<void>;
}

export function EditPlanDialog({ plan, open, onOpenChange, onRefresh }: EditDialogProps) {
  const [form, setForm] = useState<PlanFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { if (plan) setForm(planToForm(plan)); }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !form.name.trim()) { toast.error('El nombre del plan es obligatorio'); return; }
    setLoading(true);
    try {
      await api.updateInstitutionPlan(plan.id, {
        name: form.name.trim(), description: form.description.trim() || null,
        price_cents: form.price_cents, billing_cycle: form.billing_cycle, is_default: form.is_default,
      });
      await onRefresh();
      toast.success(`Plan "${form.name.trim()}" actualizado`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Error al actualizar plan: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil size={16} className="text-blue-500" />Editar plan</DialogTitle>
          <DialogDescription>Modifica los detalles de "{plan?.name}"</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <PlanForm form={form} onChange={setForm} loading={loading} />
          <DialogFooter className="pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirmation Dialog ────────────────────────────

interface DeleteDialogProps {
  plan: InstitutionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => Promise<void>;
}

export function DeletePlanDialog({ plan, open, onOpenChange, onRefresh }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      await api.deleteInstitutionPlan(plan.id);
      await onRefresh();
      toast.success(`Plan "${plan.name}" eliminado`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Error al eliminar plan: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar plan</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>¿Estas seguro de que quieres eliminar el plan <span className="font-semibold text-gray-900">"{plan?.name}"</span>?</span>
            {plan?.member_count && plan.member_count > 0 && (
              <span className="block text-amber-600 font-medium">
                Este plan tiene {plan.member_count} miembro(s) asignado(s). Se les desvinculara del plan.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {loading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
