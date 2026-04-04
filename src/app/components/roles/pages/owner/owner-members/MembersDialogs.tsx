/**
 * Member dialogs — Invite, ChangeRole, ChangePlan, Delete.
 */

import React, { useState, useMemo, useCallback } from 'react';
import * as api from '@/app/services/platformApi';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
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
  UserPlus, ArrowUpDown, Trash2, CreditCard, Loader2, CheckCircle2,
} from 'lucide-react';
import type { MemberListItem, MembershipRole, CreateMemberPayload, InstitutionPlan } from '@/app/types/platform';
import { ROLE_CONFIG, ASSIGNABLE_ROLES } from './constants';

// ── Invite Member Dialog ──────────────────────────────────

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: InstitutionPlan[];
  institutionId: string;
  onInvite: (data: CreateMemberPayload) => Promise<MemberListItem>;
}

export function InviteMemberDialog({ open, onOpenChange, plans, institutionId, onInvite }: InviteDialogProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<MembershipRole>('student');
  const [planId, setPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const activePlans = useMemo(() => plans.filter(p => p.is_active), [plans]);
  const resetForm = useCallback(() => { setEmail(''); setName(''); setRole('student'); setPlanId(''); setLoading(false); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('El email es obligatorio'); return; }
    setLoading(true);
    try {
      await onInvite({ email: email.trim(), name: name.trim() || undefined, institution_id: institutionId, role, institution_plan_id: planId || undefined });
      toast.success(`Miembro "${email.trim()}" invitado exitosamente`);
      resetForm(); onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Error al invitar miembro: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus size={18} className="text-amber-500" />Invitar miembro</DialogTitle>
          <DialogDescription>Agrega un nuevo miembro a tu institución</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email *</Label>
            <Input id="invite-email" type="email" placeholder="usuario@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Nombre</Label>
            <Input id="invite-name" type="text" placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MembershipRole)} disabled={loading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}><span className="flex items-center gap-2">{ROLE_CONFIG[r].icon}{ROLE_CONFIG[r].label}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === 'student' && activePlans.length > 0 && (
            <div className="space-y-1.5">
              <Label>Plan (opcional)</Label>
              <Select value={planId} onValueChange={setPlanId} disabled={loading}>
                <SelectTrigger><SelectValue placeholder="Sin plan asignado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin plan</SelectItem>
                  {activePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><CreditCard size={12} className="text-gray-400" />{p.name}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-amber-500 hover:bg-amber-600">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {loading ? 'Invitando...' : 'Invitar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Role Dialog ────────────────────────────────────

interface ChangeRoleDialogProps {
  member: MemberListItem | null; open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeRole: (memberId: string, role: MembershipRole) => Promise<void>;
}

export function ChangeRoleDialog({ member, open, onOpenChange, onChangeRole }: ChangeRoleDialogProps) {
  const [newRole, setNewRole] = useState<MembershipRole>('student');
  const [loading, setLoading] = useState(false);
  React.useEffect(() => { if (member) setNewRole(member.role); }, [member]);

  const handleSubmit = async () => {
    if (!member || newRole === member.role) { onOpenChange(false); return; }
    setLoading(true);
    try {
      await onChangeRole(member.id, newRole);
      toast.success(`Rol de "${member.name || member.email}" cambiado a ${ROLE_CONFIG[newRole].label}`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Error al cambiar rol: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowUpDown size={16} className="text-blue-500" />Cambiar rol</DialogTitle>
          <DialogDescription>{member?.name || member?.email || 'Miembro'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {ASSIGNABLE_ROLES.map((r) => {
            const cfg = ROLE_CONFIG[r]; const selected = newRole === r;
            return (
              <button key={r} onClick={() => setNewRole(r)} disabled={loading}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selected ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.badgeClass}`}>{cfg.icon}</div>
                <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{cfg.label}</p></div>
                {selected && <CheckCircle2 size={16} className="text-blue-500" />}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || newRole === member?.role} className="gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}Cambiar rol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Plan Dialog ────────────────────────────────────

interface ChangePlanDialogProps {
  member: MemberListItem | null; open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: InstitutionPlan[]; onRefresh: () => Promise<void>;
}

export function ChangePlanDialog({ member, open, onOpenChange, plans, onRefresh }: ChangePlanDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const activePlans = useMemo(() => plans.filter(p => p.is_active), [plans]);
  React.useEffect(() => { if (member) setSelectedPlanId(member.institution_plan_id ?? ''); }, [member]);

  const handleSubmit = async () => {
    if (!member) return;
    setLoading(true);
    try {
      await api.changeMemberPlan(member.id, selectedPlanId || null);
      await onRefresh();
      toast.success(`Plan de "${member.name || member.email}" cambiado a "${activePlans.find(p => p.id === selectedPlanId)?.name ?? 'Sin plan'}"`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Error al cambiar plan: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard size={16} className="text-amber-500" />Cambiar plan</DialogTitle>
          <DialogDescription>{member?.name || member?.email || 'Miembro'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Plan</Label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={loading}>
            <SelectTrigger><SelectValue placeholder="Sin plan asignado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin plan</SelectItem>
              {activePlans.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}{p.price_cents > 0 && <span className="text-gray-400 ml-1">(${(p.price_cents / 100).toFixed(2)})</span>}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">{loading && <Loader2 size={14} className="animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Member Dialog ──────────────────────────────────

interface DeleteDialogProps {
  member: MemberListItem | null; open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (memberId: string) => Promise<void>;
}

export function DeleteMemberDialog({ member, open, onOpenChange, onDelete }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!member) return;
    setLoading(true);
    try {
      await onDelete(member.id);
      toast.success(`"${member.name || member.email}" eliminado de la institución`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Error al eliminar miembro: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setLoading(false); }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar miembro</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres eliminar a <span className="font-semibold text-gray-900">{member?.name || member?.email || 'este miembro'}</span> de la institución? Esta acción no se puede deshacer.
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
