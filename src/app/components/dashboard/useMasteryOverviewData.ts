// ============================================================
// Axon — useMasteryOverviewData hook
// Fetches content tree → summaries → keywords → subtopics → BKT
// and builds the KeywordMastery[] sorted by weakest-first.
// Extracted from MasteryOverview.tsx for modularization.
// ============================================================
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { apiCall } from '@/app/lib/api';
import {
  getTopicSummaries,
  getAllBktStates,
} from '@/app/services/platformApi';
import { getContentTree } from '@/app/services/contentTreeApi';

import type {
  KeywordRaw,
  SubtopicRaw,
  SummaryRef,
  TopicRef,
  KeywordMastery,
  SubtopicMastery,
  MasteryFilter,
} from './masteryOverviewTypes';
import { matchesFilter } from './masteryOverviewTypes';

export function useMasteryOverviewData() {
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

      // 5. Get subtopic counts per keyword
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
    } catch (err: unknown) {
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

    if (filter !== 'all') {
      items = items.filter((k) => matchesFilter(k.pKnow, filter));
    }

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

    for (const group of groups.values()) {
      group.items.sort((a, b) => (a.pKnow ?? -1) - (b.pKnow ?? -1));
    }

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

  // ── Close dropdown on outside click ────────────────────

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

  const allMastered = keywords.every((k) => k.pKnow !== null && k.pKnow >= 0.85);

  return {
    // Data
    keywords,
    loading,
    error,
    loadData,
    filtered,
    grouped,
    kpiCounts,
    allMastered,

    // Filters
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    showFilterDropdown,
    setShowFilterDropdown,
    hasActiveFilters,
    clearFilters,
    dropdownRef,

    // Expansion
    expandedKeywords,
    toggleExpand,
    subtopicsCache,
  };
}
