// ============================================================
// Axon — MasteryOverview (EV-7 Prompt C)
// Shows all student keywords sorted by mastery (weakest first).
// Data: content-tree + summaries + keywords + bkt-states
// ============================================================
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Search,
  Filter,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { apiCall } from '@/app/lib/api';
import {
  getTopicSummaries,
  getAllBktStates,
  type BktStateRecord,
} from '@/app/services/platformApi';
import {
  getContentTree,
  type TreeCourse,
} from '@/app/services/contentTreeApi';

// ── Types ────────────────────────────────────────────────

interface KeywordRaw {
  id: string;
  name: string;
  definition?: string | null;
  summary_id: string;
  priority: number;
  is_active?: boolean;
}

interface SubtopicRaw {
  id: string;
  keyword_id: string;
  name: string;
  order_index: number;
  is_active?: boolean;
}

interface SummaryRef {
  id: string;
  title?: string | null;
  topic_id: string;
}

interface TopicRef {
  id: string;
  name: string;
  courseName: string;
}

interface KeywordMastery {
  keyword: KeywordRaw;
  topicName: string;
  courseName: string;
  pKnow: number | null; // null = no data
  subtopicCount: number;
  subtopicBkt: Map<string, number>; // subtopic_id → p_know
}

interface SubtopicMastery {
  subtopic: SubtopicRaw;
  pKnow: number | null;
}

// ── Mastery color helpers ────────────────────────────────

function getMasteryColor(pKnow: number | null) {
  if (pKnow === null) return { bg: 'bg-zinc-700/40', text: 'text-zinc-500', bar: 'bg-zinc-600', label: 'Sin datos' };
  if (pKnow < 0.3) return { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500', label: 'Critico' };
  if (pKnow < 0.5) return { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: 'bg-orange-500', label: 'Debil' };
  if (pKnow < 0.7) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', bar: 'bg-yellow-500', label: 'En progreso' };
  if (pKnow < 0.85) return { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500', label: 'Bueno' };
  return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500', label: 'Dominado' };
}

function getMasteryDot(pKnow: number | null): string {
  if (pKnow === null) return 'bg-zinc-600';
  if (pKnow < 0.3) return 'bg-red-500';
  if (pKnow < 0.5) return 'bg-orange-500';
  if (pKnow < 0.7) return 'bg-yellow-500';
  if (pKnow < 0.85) return 'bg-blue-500';
  return 'bg-emerald-500';
}

// ── Filter types ─────────────────────────────────────────

type MasteryFilter = 'all' | 'critical' | 'weak' | 'progress' | 'good' | 'mastered';

const FILTER_OPTIONS: { value: MasteryFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'critical', label: 'Criticos (< 30%)' },
  { value: 'weak', label: 'Debiles (< 50%)' },
  { value: 'progress', label: 'En progreso' },
  { value: 'good', label: 'Buenos' },
  { value: 'mastered', label: 'Dominados (≥ 85%)' },
];

function matchesFilter(pKnow: number | null, filter: MasteryFilter): boolean {
  if (filter === 'all') return true;
  if (pKnow === null) return filter === 'all';
  switch (filter) {
    case 'critical': return pKnow < 0.3;
    case 'weak': return pKnow >= 0.3 && pKnow < 0.5;
    case 'progress': return pKnow >= 0.5 && pKnow < 0.7;
    case 'good': return pKnow >= 0.7 && pKnow < 0.85;
    case 'mastered': return pKnow >= 0.85;
    default: return true;
  }
}

// ── Main Component ───────────────────────────────────────

export function MasteryOverview() {
  const { selectedInstitution } = useAuth();
  const [keywords, setKeywords] = useState<KeywordMastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filter, setFilter] = useState<MasteryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Expand state
  const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set());
  const [subtopicsCache, setSubtopicsCache] = useState<Map<string, SubtopicMastery[]>>(new Map());
  const [loadingSubtopics, setLoadingSubtopics] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fetch all data ─────────────────────────────────────

  const loadData = useCallback(async () => {
    const instId = selectedInstitution?.id;
    if (!instId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Content tree + BKT states in parallel
      const [tree, bktStates] = await Promise.all([
        getContentTree(instId),
        getAllBktStates(undefined, 500),
      ]);

      // Build BKT lookup: subtopic_id → p_know
      const bktMap = new Map<string, number>();
      for (const s of bktStates) {
        bktMap.set(s.subtopic_id, s.p_know);
      }

      // 2. Flatten tree to get topics with course names
      const topicRefs: TopicRef[] = [];
      for (const course of tree) {
        for (const sem of course.semesters || []) {
          for (const sec of sem.sections || []) {
            for (const topic of sec.topics || []) {
              topicRefs.push({
                id: topic.id,
                name: topic.name,
                courseName: course.name,
              });
            }
          }
        }
      }

      // 3. Get summaries for all topics in parallel
      const summaryResults = await Promise.all(
        topicRefs.map(async (t) => {
          try {
            const sums = await getTopicSummaries(t.id);
            return sums.map((s: any) => ({
              id: s.id,
              title: s.title,
              topic_id: t.id,
            }));
          } catch {
            return [];
          }
        })
      );

      const allSummaries: SummaryRef[] = summaryResults.flat();
      // Map summary_id → topic
      const summaryToTopic = new Map<string, TopicRef>();
      for (let i = 0; i < topicRefs.length; i++) {
        for (const sum of summaryResults[i]) {
          summaryToTopic.set(sum.id, topicRefs[i]);
        }
      }

      // 4. Get keywords for all summaries in parallel (batched)
      const keywordResults = await Promise.all(
        allSummaries.map(async (sum) => {
          try {
            const kws = await apiCall<KeywordRaw[]>(`/keywords?summary_id=${sum.id}`);
            return (kws || []).map((kw) => ({ ...kw, summary_id: sum.id }));
          } catch {
            return [];
          }
        })
      );

      const allKeywords: KeywordRaw[] = keywordResults.flat();

      // 5. Get subtopic counts per keyword (we need to know how many subtopics each has)
      // Fetch all subtopics for all keywords in parallel
      const subtopicResults = await Promise.all(
        allKeywords.map(async (kw) => {
          try {
            const subs = await apiCall<SubtopicRaw[]>(`/subtopics?keyword_id=${kw.id}`);
            return { keywordId: kw.id, subtopics: subs || [] };
          } catch {
            return { keywordId: kw.id, subtopics: [] };
          }
        })
      );

      // Build subtopic count and BKT aggregation per keyword
      const subtopicsByKeyword = new Map<string, SubtopicRaw[]>();
      for (const r of subtopicResults) {
        subtopicsByKeyword.set(r.keywordId, r.subtopics);
      }

      // 6. Build KeywordMastery items
      const masteryItems: KeywordMastery[] = allKeywords.map((kw) => {
        const topic = summaryToTopic.get(kw.summary_id);
        const subs = subtopicsByKeyword.get(kw.id) || [];
        const subtopicBkt = new Map<string, number>();

        let sumPKnow = 0;
        let countWithBkt = 0;

        for (const sub of subs) {
          const pk = bktMap.get(sub.id);
          if (pk !== undefined) {
            subtopicBkt.set(sub.id, pk);
            sumPKnow += pk;
            countWithBkt++;
          }
        }

        const pKnow = countWithBkt > 0 ? sumPKnow / countWithBkt : null;

        return {
          keyword: kw,
          topicName: topic?.name || 'Sin tema',
          courseName: topic?.courseName || 'Sin curso',
          pKnow,
          subtopicCount: subs.length,
          subtopicBkt,
        };
      });

      // Pre-cache subtopics for all keywords (we already fetched them)
      const cache = new Map<string, SubtopicMastery[]>();
      for (const r of subtopicResults) {
        const item = masteryItems.find((m) => m.keyword.id === r.keywordId);
        cache.set(
          r.keywordId,
          r.subtopics
            .map((sub) => ({
              subtopic: sub,
              pKnow: bktMap.get(sub.id) ?? null,
            }))
            .sort((a, b) => (a.pKnow ?? -1) - (b.pKnow ?? -1))
        );
      }
      setSubtopicsCache(cache);

      setKeywords(masteryItems);
    } catch (err: any) {
      console.error('[MasteryOverview] Failed to load:', err);
      setError('No pudimos cargar tus datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [selectedInstitution?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filter & sort ──────────────────────────────────────

  const filtered = useMemo(() => {
    let items = keywords;

    // Apply mastery filter
    if (filter !== 'all') {
      items = items.filter((k) => matchesFilter(k.pKnow, filter));
    }

    // Apply search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(
        (k) =>
          k.keyword.name.toLowerCase().includes(q) ||
          k.topicName.toLowerCase().includes(q) ||
          k.courseName.toLowerCase().includes(q)
      );
    }

    return items;
  }, [keywords, filter, debouncedSearch]);

  // Group by course > topic, sorted by worst keyword avg
  const grouped = useMemo(() => {
    const groups = new Map<string, { courseName: string; topicName: string; items: KeywordMastery[] }>();

    for (const item of filtered) {
      const key = `${item.courseName} > ${item.topicName}`;
      if (!groups.has(key)) {
        groups.set(key, {
          courseName: item.courseName,
          topicName: item.topicName,
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }

    // Sort items within each group by p_know ASC (weakest first, nulls first)
    for (const group of groups.values()) {
      group.items.sort((a, b) => (a.pKnow ?? -1) - (b.pKnow ?? -1));
    }

    // Sort groups by worst avg p_know
    const groupArr = Array.from(groups.entries()).map(([key, group]) => {
      const withData = group.items.filter((i) => i.pKnow !== null);
      const avgPKnow =
        withData.length > 0
          ? withData.reduce((acc, i) => acc + i.pKnow!, 0) / withData.length
          : -1;
      return { key, ...group, avgPKnow };
    });

    groupArr.sort((a, b) => a.avgPKnow - b.avgPKnow);
    return groupArr;
  }, [filtered]);

  // ── KPI summary ────────────────────────────────────────

  const kpiCounts = useMemo(() => {
    const counts = { critical: 0, weak: 0, progress: 0, good: 0, mastered: 0, noData: 0, total: keywords.length };
    for (const k of keywords) {
      if (k.pKnow === null) { counts.noData++; continue; }
      if (k.pKnow < 0.3) counts.critical++;
      else if (k.pKnow < 0.5) counts.weak++;
      else if (k.pKnow < 0.7) counts.progress++;
      else if (k.pKnow < 0.85) counts.good++;
      else counts.mastered++;
    }
    return counts;
  }, [keywords]);

  // ── Expand/collapse ────────────────────────────────────

  const toggleExpand = useCallback((keywordId: string) => {
    setExpandedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keywordId)) {
        next.delete(keywordId);
      } else {
        next.add(keywordId);
      }
      return next;
    });
  }, []);

  // ── Clear filters ──────────────────────────────────────

  const hasActiveFilters = filter !== 'all' || debouncedSearch.length > 0;

  const clearFilters = useCallback(() => {
    setFilter('all');
    setSearchQuery('');
  }, []);

  // Close dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 min-h-[288px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 animate-pulse" />
          <p className="text-sm text-zinc-500 animate-pulse">Cargando dominio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 min-h-[288px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400/60" />
        <p className="text-sm text-zinc-400 text-center">{error}</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 min-h-[288px] flex flex-col items-center justify-center gap-3">
        <BookOpen className="w-10 h-10 text-zinc-600" />
        <p className="text-sm text-zinc-400 text-center">
          Aun no tienes keywords. Empieza estudiando un resumen.
        </p>
      </div>
    );
  }

  const allMastered = keywords.every((k) => k.pKnow !== null && k.pKnow >= 0.85);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
    >
      {/* ── Header + Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="text-sm font-semibold text-zinc-100">Dominio de Conceptos</h3>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                filter !== 'all'
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {FILTER_OPTIONS.find((f) => f.value === filter)?.label || 'Todos'}
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setFilter(opt.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      filter === opt.value
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-36 sm:w-44 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Summary bar ── */}
      <div className="mb-4">
        <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2 flex-wrap">
          {kpiCounts.critical > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {kpiCounts.critical} criticos
            </span>
          )}
          {kpiCounts.weak > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {kpiCounts.weak} debiles
            </span>
          )}
          {kpiCounts.progress > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {kpiCounts.progress} en progreso
            </span>
          )}
          {kpiCounts.good > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {kpiCounts.good} buenos
            </span>
          )}
          {kpiCounts.mastered > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {kpiCounts.mastered} dominados
            </span>
          )}
          <span className="text-zinc-500">· {kpiCounts.total} total</span>
        </div>

        {/* Distribution bar */}
        {kpiCounts.total > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-700 gap-px">
            {kpiCounts.critical > 0 && (
              <div className="bg-red-500 rounded-sm" style={{ width: `${(kpiCounts.critical / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.weak > 0 && (
              <div className="bg-orange-500 rounded-sm" style={{ width: `${(kpiCounts.weak / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.progress > 0 && (
              <div className="bg-yellow-500 rounded-sm" style={{ width: `${(kpiCounts.progress / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.good > 0 && (
              <div className="bg-blue-500 rounded-sm" style={{ width: `${(kpiCounts.good / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.mastered > 0 && (
              <div className="bg-emerald-500 rounded-sm" style={{ width: `${(kpiCounts.mastered / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.noData > 0 && (
              <div className="bg-zinc-600 rounded-sm" style={{ width: `${(kpiCounts.noData / kpiCounts.total) * 100}%` }} />
            )}
          </div>
        )}
      </div>

      {/* Active filter badge */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-zinc-400">
            Filtrando: {filter !== 'all' ? FILTER_OPTIONS.find((f) => f.value === filter)?.label : ''}{' '}
            {debouncedSearch ? `"${debouncedSearch}"` : ''}{' '}
            ({filtered.length} keyword{filtered.length !== 1 ? 's' : ''})
          </span>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        </div>
      )}

      {/* ── All mastered celebration ── */}
      {allMastered && !hasActiveFilters && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            ¡Felicitaciones! Dominas todos tus conceptos.
          </p>
        </div>
      )}

      {/* ── Sorted hint ── */}
      {!hasActiveFilters && !allMastered && (
        <p className="text-[11px] text-zinc-600 mb-3">Ordenado por: necesidad de repaso</p>
      )}

      {/* ── Keyword groups ── */}
      <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">
            No se encontraron keywords con este filtro.
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.key}>
              {/* Group header */}
              <p className="text-[11px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                {group.courseName} › {group.topicName}
              </p>

              {/* Keywords in group */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <KeywordRow
                    key={item.keyword.id}
                    item={item}
                    expanded={expandedKeywords.has(item.keyword.id)}
                    onToggle={() => toggleExpand(item.keyword.id)}
                    subtopics={subtopicsCache.get(item.keyword.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ── KeywordRow ───────────────────────────────────────────

function KeywordRow({
  item,
  expanded,
  onToggle,
  subtopics,
}: {
  item: KeywordMastery;
  expanded: boolean;
  onToggle: () => void;
  subtopics?: SubtopicMastery[];
}) {
  const mc = getMasteryColor(item.pKnow);
  const pct = item.pKnow !== null ? Math.round(item.pKnow * 100) : null;
  const showRepeat = item.pKnow === null || item.pKnow < 0.7;

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Main row */}
      <div
        onClick={item.subtopicCount > 0 ? onToggle : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          item.subtopicCount > 0 ? 'cursor-pointer hover:bg-zinc-800/60' : ''
        } ${expanded ? 'bg-zinc-800/40' : ''}`}
      >
        {/* Expand icon */}
        <div className="w-4 shrink-0">
          {item.subtopicCount > 0 ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )
          ) : null}
        </div>

        {/* Color dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getMasteryDot(item.pKnow)}`} />

        {/* Name */}
        <span className="text-sm text-zinc-200 flex-1 truncate">{item.keyword.name}</span>

        {/* Percentage */}
        <span className={`text-xs font-medium w-10 text-right shrink-0 ${mc.text}`}>
          {pct !== null ? `${pct}%` : '—'}
        </span>

        {/* Progress bar */}
        <div className="w-20 sm:w-28 h-2 rounded-full bg-zinc-700 shrink-0 overflow-hidden">
          {pct !== null && (
            <div
              className={`h-full rounded-full ${mc.bar} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>

        {/* Subtopic count */}
        {item.subtopicCount > 0 && (
          <span className="text-[11px] text-zinc-500 w-16 sm:w-20 text-right shrink-0 hidden sm:block">
            {item.subtopicCount} subtopic{item.subtopicCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Repeat button */}
        {showRepeat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: navigate to adaptive quiz with keyword preselected
              console.log('[MasteryOverview] Repetir:', item.keyword.id, item.keyword.name);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-violet-400 hover:bg-violet-500/10 transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Repetir</span>
          </button>
        )}
      </div>

      {/* Expanded subtopics */}
      <AnimatePresence>
        {expanded && subtopics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-9 pl-3 border-l border-zinc-800 py-1 space-y-0.5">
              {subtopics.length === 0 ? (
                <p className="text-xs text-zinc-600 py-2">Sin subtopics</p>
              ) : (
                subtopics.map((sub) => {
                  const smc = getMasteryColor(sub.pKnow);
                  const sPct = sub.pKnow !== null ? Math.round(sub.pKnow * 100) : null;
                  return (
                    <div
                      key={sub.subtopic.id}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${getMasteryDot(sub.pKnow)}`} />
                      <span className="text-xs text-zinc-400 flex-1 truncate">
                        {sub.subtopic.name}
                      </span>
                      <span className={`text-[11px] font-medium w-10 text-right ${smc.text}`}>
                        {sPct !== null ? `${sPct}%` : '—'}
                      </span>
                      <div className="w-16 sm:w-20 h-1.5 rounded-full bg-zinc-700 shrink-0 overflow-hidden">
                        {sPct !== null && (
                          <div
                            className={`h-full rounded-full ${smc.bar}`}
                            style={{ width: `${sPct}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
