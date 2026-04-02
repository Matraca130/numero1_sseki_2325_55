/**
 * AdminScopesDialog — Granular permissions management for admin/professor members.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import * as api from '@/app/services/platformApi';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/app/components/ui/select';
import { ShieldCheck, Trash2, AlertCircle, Loader2, Plus } from 'lucide-react';
import type { MemberListItem, AdminScope } from '@/app/types/platform';

const SCOPE_TYPE_CONFIG: Record<string, { label: string; description: string }> = {
  full:     { label: 'Acceso completo',  description: 'Acceso a todos los cursos y contenido' },
  course:   { label: 'Curso',            description: 'Acceso limitado a un curso especifico' },
  semester: { label: 'Semestre',         description: 'Acceso limitado a un semestre especifico' },
  section:  { label: 'Seccion',          description: 'Acceso limitado a una seccion especifica' },
};

interface AdminScopesDialogProps {
  member: MemberListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminScopesDialog({ member, open, onOpenChange }: AdminScopesDialogProps) {
  const { tree } = useContentTree();
  const [scopes, setScopes] = useState<AdminScope[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newScopeType, setNewScopeType] = useState<'full' | 'course' | 'semester' | 'section'>('full');
  const [newScopeId, setNewScopeId] = useState<string>('');

  useEffect(() => {
    if (!member || !open) return;
    setLoadingScopes(true); setScopeError(null);
    api.getAdminScopes(member.id)
      .then((data) => setScopes(Array.isArray(data) ? data : []))
      .catch((err) => { setScopeError(err.message || 'Error al cargar scopes'); setScopes([]); })
      .finally(() => setLoadingScopes(false));
  }, [member, open]);

  useEffect(() => { if (!open) { setNewScopeType('full'); setNewScopeId(''); } }, [open]);

  const courseOptions = useMemo(() => tree?.courses ?? [], [tree]);
  const semesterOptions = useMemo(() => courseOptions.flatMap(c => c.semesters.map(s => ({ id: s.id, name: `${c.name} → ${s.name}` }))), [courseOptions]);
  const sectionOptions = useMemo(() => courseOptions.flatMap(c => c.semesters.flatMap(s => s.sections.map(sec => ({ id: sec.id, name: `${c.name} → ${s.name} → ${sec.name}` })))), [courseOptions]);

  const scopeNeedsId = newScopeType !== 'full';

  const handleAddScope = async () => {
    if (!member) return;
    if (scopeNeedsId && !newScopeId) { toast.error('Selecciona un elemento para el scope'); return; }
    setAdding(true);
    try {
      const newScope = await api.createAdminScope({ membership_id: member.id, scope_type: newScopeType, scope_id: scopeNeedsId ? newScopeId : undefined });
      setScopes(prev => [...prev, newScope]);
      setNewScopeType('full'); setNewScopeId('');
      toast.success('Scope agregado exitosamente');
    } catch (err: unknown) {
      toast.error(`Error al agregar scope: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setAdding(false); }
  };

  const handleDeleteScope = async (scopeId: string) => {
    setDeleting(scopeId);
    try {
      await api.deleteAdminScope(scopeId);
      setScopes(prev => prev.filter(s => s.id !== scopeId));
      toast.success('Scope eliminado');
    } catch (err: unknown) {
      toast.error(`Error al eliminar scope: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setDeleting(null); }
  };

  const getScopeName = (scope: AdminScope): string => {
    if (scope.scope_type === 'full') return 'Acceso completo';
    if (!scope.scope_id) return SCOPE_TYPE_CONFIG[scope.scope_type]?.label || scope.scope_type;
    for (const c of courseOptions) {
      if (scope.scope_type === 'course' && c.id === scope.scope_id) return c.name;
      for (const s of c.semesters) {
        if (scope.scope_type === 'semester' && s.id === scope.scope_id) return `${c.name} → ${s.name}`;
        for (const sec of s.sections) {
          if (scope.scope_type === 'section' && sec.id === scope.scope_id) return `${c.name} → ${s.name} → ${sec.name}`;
        }
      }
    }
    return `${scope.scope_type}: ${scope.scope_id?.slice(0, 8)}…`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-500" />Admin Scopes</DialogTitle>
          <DialogDescription>Permisos granulares de {member?.name || member?.email || 'miembro'}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {loadingScopes ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : scopeError ? (
            <div className="text-center py-6"><AlertCircle size={20} className="text-red-400 mx-auto mb-2" /><p className="text-sm text-red-500">{scopeError}</p></div>
          ) : scopes.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
              <ShieldCheck size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Sin scopes asignados</p>
              <p className="text-xs text-gray-400 mt-0.5">Agrega permisos granulares debajo</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Scopes actuales ({scopes.length})</p>
              {scopes.map((scope) => (
                <div key={scope.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-gray-200 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><ShieldCheck size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{getScopeName(scope)}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{SCOPE_TYPE_CONFIG[scope.scope_type]?.label || scope.scope_type}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500" onClick={() => handleDeleteScope(scope.id)} disabled={deleting === scope.id}>
                    {deleting === scope.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Agregar scope</p>
            <div className="space-y-2">
              <Label className="text-xs">Tipo de scope</Label>
              <Select value={newScopeType} onValueChange={(v) => { setNewScopeType(v as any); setNewScopeId(''); }} disabled={adding}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}><span className="flex items-center gap-2"><ShieldCheck size={12} className="text-blue-400" />{cfg.label}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {scopeNeedsId && (
              <div className="space-y-2">
                <Label className="text-xs">{newScopeType === 'course' ? 'Curso' : newScopeType === 'semester' ? 'Semestre' : 'Seccion'}</Label>
                <Select value={newScopeId} onValueChange={setNewScopeId} disabled={adding}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {newScopeType === 'course' && courseOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    {newScopeType === 'semester' && semesterOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    {newScopeType === 'section' && sectionOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleAddScope} disabled={adding || (scopeNeedsId && !newScopeId)} className="w-full gap-2 bg-[#2a8c7a] hover:bg-[#244e47] rounded-full" size="sm">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? 'Agregando...' : 'Agregar scope'}
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
