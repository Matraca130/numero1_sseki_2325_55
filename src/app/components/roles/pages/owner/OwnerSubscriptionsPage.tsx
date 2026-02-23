// ============================================================
// Axon — Owner: Subscriptions Management
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// API DIRECT (import * as api from '@/app/services/platformApi'):
//   api.getInstitutionSubscriptions(instId)
//   api.createSubscription({ institution_id, plan_id, ... })
//   api.updateSubscription(id, data)
//   api.cancelSubscription(id)
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import * as api from '@/app/services/platformApi';
import { motion } from 'motion/react';
import { formatDate, formatRelative } from '@/app/components/shared/page-helpers';
import { toast, Toaster } from 'sonner';

import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/app/components/ui/select';

import {
  ShieldCheck, Plus, AlertCircle, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock, Trash2, Pencil,
} from 'lucide-react';

import type { InstitutionSubscription, PlatformPlan } from '@/app/types/platform';

// ── FadeIn helper ─────────────────────────────────────────

function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={className}
    >{children}</motion.div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  active:   { label: 'Activa',    icon: <CheckCircle2 size={12} />, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trialing: { label: 'Trial',     icon: <Clock size={12} />,        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  past_due: { label: 'Vencida',   icon: <AlertCircle size={12} />,  badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  canceled: { label: 'Cancelada', icon: <XCircle size={12} />,      badgeClass: 'bg-red-50 text-red-700 border-red-200' },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.active;
}

// ── Main Component ────────────────────────────────────────

export function OwnerSubscriptionsPage() {
  const { plans, institutionId, loading, error, refresh, refreshSubscription } = usePlatformData();

  const [subscriptions, setSubscriptions] = useState<InstitutionSubscription[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subsError, setSubsError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<InstitutionSubscription | null>(null);

  // Platform plans (Axon-level) for the plan_id field
  const [platformPlans, setPlatformPlans] = useState<PlatformPlan[]>([]);

  // Fetch subscriptions
  const fetchSubs = useCallback(async () => {
    if (!institutionId) return;
    setLoadingSubs(true);
    setSubsError(null);
    try {
      const data = await api.getInstitutionSubscriptions(institutionId);
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Subscriptions] fetch error:', err);
      setSubsError(err.message || 'Error al cargar suscripciones');
      setSubscriptions([]);
    } finally {
      setLoadingSubs(false);
    }
  }, [institutionId]);

  // Fetch platform plans for create dialog
  useEffect(() => {
    api.getPlatformPlans(false)
      .then(data => setPlatformPlans(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  // Cancel handler
  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await api.cancelSubscription(cancelTarget.id);
      toast.success('Suscripcion cancelada');
      setCancelTarget(null);
      await fetchSubs();
      await refreshSubscription();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al cancelar: ${msg}`);
    }
  }, [cancelTarget, fetchSubs, refreshSubscription]);

  if (loading || loadingSubs) {
    return (
      <div className="p-6 lg:p-8 space-y-6" aria-label="Cargando suscripciones">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-7 w-44" /><Skeleton className="h-4 w-56" /></div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || subsError) {
    return (
      <div className="p-6 lg:p-8">
        <FadeIn>
          <div className="max-w-md mx-auto mt-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar suscripciones</h2>
            <p className="text-sm text-gray-500 mb-6">{error || subsError}</p>
            <Button onClick={() => { refresh(); fetchSubs(); }} className="gap-2"><RefreshCw size={14} />Reintentar</Button>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" richColors closeButton />

      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Suscripciones</h1>
              <Badge variant="secondary" className="text-xs tabular-nums">{subscriptions.length}</Badge>
            </div>
            <p className="text-sm text-gray-500">Gestiona las suscripciones de tu institucion</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-amber-500 hover:bg-amber-600 self-start sm:self-auto"
          >
            <Plus size={14} />
            Nueva suscripcion
          </Button>
        </div>
      </FadeIn>

      {/* Subscription cards */}
      {subscriptions.length === 0 ? (
        <FadeIn delay={0.06}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin suscripciones</h3>
            <p className="text-sm text-gray-500 mb-6">Crea una suscripcion para activar un plan de plataforma</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-amber-500 hover:bg-amber-600">
              <Plus size={14} />
              Crear suscripcion
            </Button>
          </div>
        </FadeIn>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub, i) => {
            const cfg = getStatusCfg(sub.status);
            return (
              <FadeIn key={sub.id} delay={0.06 * i}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cfg.badgeClass}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {sub.plan && (
                        <span className="text-xs text-gray-500 truncate">
                          Plan: <span className="font-medium text-gray-700">{sub.plan.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-1.5">
                      <span>Inicio: <span className="text-gray-600">{formatDate(sub.current_period_start)}</span></span>
                      {sub.current_period_end && (
                        <span>Fin: <span className="text-gray-600">{formatDate(sub.current_period_end)}</span></span>
                      )}
                      <span>Creada: <span className="text-gray-600">{formatRelative(sub.created_at)}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  {sub.status !== 'canceled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setCancelTarget(sub)}
                    >
                      <XCircle size={12} />
                      Cancelar
                    </Button>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {subscriptions.length > 0 && (
        <FadeIn delay={0.18}>
          <div className="flex justify-end">
            <button
              onClick={fetchSubs}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
            >
              <RefreshCw size={10} />
              Refrescar
            </button>
          </div>
        </FadeIn>
      )}

      {/* Create Dialog */}
      <CreateSubscriptionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        institutionId={institutionId ?? ''}
        platformPlans={platformPlans}
        onRefresh={async () => { await fetchSubs(); await refreshSubscription(); }}
      />

      {/* Cancel Dialog */}
      <AlertDialog open={cancelTarget !== null} onOpenChange={(v) => { if (!v) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar suscripcion</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de que quieres cancelar esta suscripcion? Se desactivara al final del periodo actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700 text-white gap-2">
              <XCircle size={14} />
              Cancelar suscripcion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Create Subscription Dialog ────────────────────────────

function CreateSubscriptionDialog({ open, onOpenChange, institutionId, platformPlans, onRefresh }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutionId: string;
  platformPlans: PlatformPlan[];
  onRefresh: () => Promise<void>;
}) {
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => { setPlanId(''); setStatus('active'); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) { toast.error('Selecciona un plan'); return; }
    setLoading(true);
    try {
      await api.createSubscription({
        institution_id: institutionId,
        plan_id: planId,
        status,
        current_period_start: new Date().toISOString(),
      });
      toast.success('Suscripcion creada exitosamente');
      resetForm();
      onOpenChange(false);
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al crear suscripcion: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={18} className="text-amber-500" />
            Nueva suscripcion
          </DialogTitle>
          <DialogDescription>Suscribe tu institucion a un plan de plataforma</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Plan de plataforma *</Label>
            <Select value={planId} onValueChange={setPlanId} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Seleccionar plan..." /></SelectTrigger>
              <SelectContent>
                {platformPlans.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus} disabled={loading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-amber-500 hover:bg-amber-600">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {loading ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
