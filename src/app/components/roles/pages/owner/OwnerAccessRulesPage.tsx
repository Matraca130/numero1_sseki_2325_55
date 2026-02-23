// ============================================================
// Axon — Owner: Plan Access Rules
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// API DIRECT (import * as api from '@/app/services/platformApi'):
//   api.getPlanAccessRules(planId)
//   api.createAccessRule({ plan_id, scope_type, scope_id })
//   api.deleteAccessRule(id)
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import * as api from '@/app/services/platformApi';
import { motion } from 'motion/react';
import { formatDate } from '@/app/components/shared/page-helpers';
import { toast, Toaster } from 'sonner';

import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/app/components/ui/select';

import {
  Key, Plus, Trash2, AlertCircle, RefreshCw, Loader2,
  BookOpen, GraduationCap, Layers, FileText, ShieldCheck,
} from 'lucide-react';

import type { InstitutionPlan, PlanAccessRule } from '@/app/types/platform';

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

const SCOPE_ICONS: Record<string, React.ReactNode> = {
  course:   <BookOpen size={14} />,
  semester: <Layers size={14} />,
  section:  <GraduationCap size={14} />,
  topic:    <FileText size={14} />,
  summary:  <FileText size={14} />,
};

// ── Main Component ────────────────────────────────────────

export function OwnerAccessRulesPage() {
  const { plans, institutionId, loading, error, refresh } = usePlatformData();
  const { tree } = useContentTree();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [rules, setRules] = useState<PlanAccessRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  // Add rule form
  const [addScopeType, setAddScopeType] = useState<string>('course');
  const [addScopeId, setAddScopeId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const activePlans = useMemo(() => plans.filter(p => p.is_active), [plans]);

  // Auto-select first plan
  useEffect(() => {
    if (!selectedPlanId && activePlans.length > 0) {
      setSelectedPlanId(activePlans[0].id);
    }
  }, [activePlans, selectedPlanId]);

  // Fetch rules when plan changes
  useEffect(() => {
    if (!selectedPlanId) { setRules([]); return; }
    setLoadingRules(true);
    setRulesError(null);
    api.getPlanAccessRules(selectedPlanId)
      .then(data => setRules(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('[AccessRules] fetch error:', err);
        setRulesError(err.message || 'Error al cargar reglas');
        setRules([]);
      })
      .finally(() => setLoadingRules(false));
  }, [selectedPlanId]);

  // Build scope options from content tree
  const courseOptions = useMemo(() => tree?.courses ?? [], [tree]);
  const semesterOptions = useMemo(() =>
    courseOptions.flatMap(c => c.semesters.map(s => ({ id: s.id, name: `${c.name} → ${s.name}` }))),
    [courseOptions]
  );
  const sectionOptions = useMemo(() =>
    courseOptions.flatMap(c => c.semesters.flatMap(s =>
      s.sections.map(sec => ({ id: sec.id, name: `${c.name} → ${s.name} → ${sec.name}` }))
    )),
    [courseOptions]
  );
  const topicOptions = useMemo(() =>
    courseOptions.flatMap(c => c.semesters.flatMap(s =>
      s.sections.flatMap(sec => sec.topics.map(t => ({
        id: t.id, name: `${c.name} → ${s.name} → ${sec.name} → ${t.name}`,
      })))
    )),
    [courseOptions]
  );

  const scopeOptionsMap: Record<string, { id: string; name: string }[]> = {
    course: courseOptions.map(c => ({ id: c.id, name: c.name })),
    semester: semesterOptions,
    section: sectionOptions,
    topic: topicOptions,
  };

  const handleAddRule = useCallback(async () => {
    if (!selectedPlanId || !addScopeId) {
      toast.error('Selecciona un tipo y elemento');
      return;
    }
    setAdding(true);
    try {
      const newRule = await api.createAccessRule({
        plan_id: selectedPlanId,
        scope_type: addScopeType,
        scope_id: addScopeId,
      });
      setRules(prev => [...prev, newRule]);
      setAddScopeId('');
      toast.success('Regla de acceso creada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al crear regla: ${msg}`);
    } finally {
      setAdding(false);
    }
  }, [selectedPlanId, addScopeType, addScopeId]);

  const handleDeleteRule = useCallback(async (ruleId: string) => {
    setDeleting(ruleId);
    try {
      await api.deleteAccessRule(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success('Regla eliminada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al eliminar regla: ${msg}`);
    } finally {
      setDeleting(null);
    }
  }, []);

  // Resolve scope name from tree
  const getScopeName = (rule: PlanAccessRule): string => {
    const options = scopeOptionsMap[rule.scope_type];
    if (options) {
      const found = options.find(o => o.id === rule.scope_id);
      if (found) return found.name;
    }
    return `${rule.scope_type}: ${rule.scope_id?.slice(0, 8)}…`;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6" aria-label="Cargando reglas">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-56" /></div>
        </div>
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <FadeIn>
          <div className="max-w-md mx-auto mt-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar datos</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Button onClick={refresh} className="gap-2"><RefreshCw size={14} />Reintentar</Button>
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
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Key size={18} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Reglas de Acceso</h1>
        </div>
        <p className="text-sm text-gray-500">
          Define que contenido puede ver cada plan de suscripcion
        </p>
      </FadeIn>

      {/* Plan selector */}
      <FadeIn delay={0.06}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Label className="text-sm font-medium text-gray-700 shrink-0">Plan:</Label>
          {activePlans.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No hay planes activos. Crea un plan primero.</p>
          ) : (
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Seleccionar plan..." />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </FadeIn>

      {/* Rules list */}
      {selectedPlanId && (
        <FadeIn delay={0.12}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Rules header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Reglas del plan</h3>
                <Badge variant="secondary" className="text-xs tabular-nums">{rules.length}</Badge>
              </div>
              <button
                onClick={() => {
                  if (!selectedPlanId) return;
                  setLoadingRules(true);
                  api.getPlanAccessRules(selectedPlanId)
                    .then(data => setRules(Array.isArray(data) ? data : []))
                    .catch(() => {})
                    .finally(() => setLoadingRules(false));
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={10} />
                Refrescar
              </button>
            </div>

            {/* Rules body */}
            <div className="p-6">
              {loadingRules ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : rulesError ? (
                <div className="text-center py-8">
                  <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-500">{rulesError}</p>
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <Key size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Sin reglas de acceso</p>
                  <p className="text-xs text-gray-400 mt-0.5">Agrega reglas debajo para limitar el contenido visible</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-gray-200 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        {SCOPE_ICONS[rule.scope_type] || <Key size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{getScopeName(rule)}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{rule.scope_type}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 hidden sm:block">{formatDate(rule.created_at)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deleting === rule.id}
                      >
                        {deleting === rule.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add rule */}
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Agregar regla</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={addScopeType} onValueChange={(v) => { setAddScopeType(v); setAddScopeId(''); }} disabled={adding}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="course">Curso</SelectItem>
                        <SelectItem value="semester">Semestre</SelectItem>
                        <SelectItem value="section">Seccion</SelectItem>
                        <SelectItem value="topic">Tema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Elemento</Label>
                    <div className="flex gap-2">
                      <Select value={addScopeId} onValueChange={setAddScopeId} disabled={adding}>
                        <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {(scopeOptionsMap[addScopeType] ?? []).map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAddRule}
                        disabled={adding || !addScopeId}
                        className="gap-1.5 bg-amber-500 hover:bg-amber-600 shrink-0"
                        size="sm"
                      >
                        {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
