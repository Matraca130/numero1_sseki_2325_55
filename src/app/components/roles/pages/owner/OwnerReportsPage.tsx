// ============================================================
// Axon — Owner: Reports & AI Generations Log
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// API DIRECT:
//   api.getAIGenerations(instId, { generation_type?, limit, offset })
//   api.getInstitutionDashboardStats(instId)
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import * as api from '@/app/services/platformApi';
import type { AIGeneration } from '@/app/services/platformApi';
import { motion } from 'motion/react';
import { formatDate, formatRelative } from '@/app/components/shared/page-helpers';
import { toast, Toaster } from 'sonner';

import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/app/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/app/components/ui/table';

import {
  BarChart3, AlertCircle, RefreshCw, Bot, Sparkles, FileText,
  ChevronLeft, ChevronRight, Users, BookOpen, CreditCard,
} from 'lucide-react';

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

const GEN_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  flashcard:  { label: 'Flashcards',  color: 'text-blue-500 bg-blue-50' },
  quiz:       { label: 'Quiz',        color: 'text-purple-500 bg-purple-50' },
  summary:    { label: 'Resumen',     color: 'text-emerald-500 bg-emerald-50' },
  diagnostic: { label: 'Diagnostico', color: 'text-amber-500 bg-amber-50' },
  keyword:    { label: 'Keywords',    color: 'text-teal-500 bg-teal-50' },
};

function getGenTypeCfg(type: string) {
  return GEN_TYPE_CONFIG[type] || { label: type, color: 'text-gray-500 bg-gray-50' };
}

const PAGE_SIZE = 25;

// ── Main Component ────────────────────────────────────────

export function OwnerReportsPage() {
  const { dashboardStats, institutionId, loading, error, refresh } = usePlatformData();

  // AI Generations
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [loadingGen, setLoadingGen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genTypeFilter, setGenTypeFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);

  // Fetch AI generations
  const fetchGenerations = useCallback(async () => {
    if (!institutionId) return;
    setLoadingGen(true);
    setGenError(null);
    try {
      const data = await api.getAIGenerations(institutionId, {
        generation_type: genTypeFilter === 'all' ? undefined : genTypeFilter,
        limit: PAGE_SIZE,
        offset,
      });
      setGenerations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Reports] AI gen fetch error:', err);
      setGenError(err.message || 'Error al cargar generaciones');
      setGenerations([]);
    } finally {
      setLoadingGen(false);
    }
  }, [institutionId, genTypeFilter, offset]);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  // Stat cards
  const stats = dashboardStats;
  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Miembros', value: stats.totalMembers, icon: <Users size={16} />, color: 'text-blue-500 bg-blue-50' },
      { label: 'Estudiantes activos', value: stats.activeStudents, icon: <BookOpen size={16} />, color: 'text-emerald-500 bg-emerald-50' },
      { label: 'Planes', value: stats.totalPlans, icon: <CreditCard size={16} />, color: 'text-amber-500 bg-amber-50' },
      { label: 'Inactivos', value: stats.inactiveMembers, icon: <AlertCircle size={16} />, color: 'text-gray-400 bg-gray-50' },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6" aria-label="Cargando reportes">
        <div className="space-y-2"><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-56" /></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar reportes</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Button onClick={refresh} className="gap-2"><RefreshCw size={14} />Reintentar</Button>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <Toaster position="top-right" richColors closeButton />

      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <BarChart3 size={18} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
        </div>
        <p className="text-sm text-gray-500">Metricas de la institucion e historial de generaciones IA</p>
      </FadeIn>

      {/* Stats cards */}
      {stats && statCards.length > 0 && (
        <FadeIn delay={0.06}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{card.value}</p>
                  <p className="text-[11px] text-gray-400">{card.label}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* AI Generations Log */}
      <FadeIn delay={0.12}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Table header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Generaciones IA</h3>
              <Badge variant="secondary" className="text-xs tabular-nums">{generations.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={genTypeFilter} onValueChange={(v) => { setGenTypeFilter(v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(GEN_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={fetchGenerations}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={10} />
              </button>
            </div>
          </div>

          {/* Table body */}
          {loadingGen ? (
            <div className="p-6 space-y-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : genError ? (
            <div className="p-12 text-center">
              <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-500">{genError}</p>
            </div>
          ) : generations.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Sin generaciones registradas</p>
              <p className="text-xs text-gray-400 mt-0.5">Las generaciones de IA apareceran aqui automaticamente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 bg-gray-50/30">
                  <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider pl-6">Tipo</TableHead>
                  <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider hidden sm:table-cell">Modelo</TableHead>
                  <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider hidden md:table-cell">Items</TableHead>
                  <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider hidden lg:table-cell">Source</TableHead>
                  <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider pr-6 text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations.map(gen => {
                  const cfg = getGenTypeCfg(gen.generation_type);
                  return (
                    <TableRow key={gen.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
                          <Sparkles size={10} />
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-gray-600 font-mono">{gen.model_used || '—'}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-gray-700 tabular-nums font-medium">
                          {gen.items_generated ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-gray-400 truncate block max-w-[180px]">
                          {gen.source_summary_id
                            ? `Summary: ${gen.source_summary_id.slice(0, 8)}…`
                            : gen.source_keyword_id
                              ? `Keyword: ${gen.source_keyword_id.slice(0, 8)}…`
                              : '—'
                          }
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="text-xs text-gray-500">{formatRelative(gen.created_at)}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {generations.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Mostrando <span className="font-semibold text-gray-600">{offset + 1}</span>
                {' - '}
                <span className="font-semibold text-gray-600">{offset + generations.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={generations.length < PAGE_SIZE}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
