// AdaptiveKeywordPanel — Keyword mastery visualization
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { ChevronDown, AlertTriangle, CheckCircle2, BookOpen } from 'lucide-react';
import { getKeywordDeltaColorSafe, getDeltaColorClasses } from '@/app/lib/mastery-helpers';
import type { KeywordMasteryMap, TopicMasterySummary, KeywordMasteryInfo } from '@/app/services/keywordMasteryApi';

const INITIAL_VISIBLE = 8;

export interface AdaptiveKeywordPanelProps {
  keywordMastery: KeywordMasteryMap;
  topicSummary: TopicMasterySummary | null;
  loading?: boolean;
  compact?: boolean;
}

function KeywordSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1"><div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5" /><div className="h-2 bg-gray-100 rounded w-full" /></div>
          <div className="h-3 w-8 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function KeywordRow({ keyword, compact = false }: { keyword: KeywordMasteryInfo; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const deltaLevel = getKeywordDeltaColorSafe(keyword.mastery, keyword.priority ?? 1);
  const dc = getDeltaColorClasses(deltaLevel);
  const pct = Math.round(keyword.mastery * 100);
  const hasSubtopics = keyword.subtopics.length > 0 && !compact;

  return (
    <div className="group">
      <button onClick={hasSubtopics ? () => setExpanded(!expanded) : undefined} className={clsx('w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-colors text-left', hasSubtopics && 'hover:bg-gray-50 cursor-pointer', !hasSubtopics && 'cursor-default')} aria-expanded={hasSubtopics ? expanded : undefined} disabled={!hasSubtopics} type="button">
        <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0', dc.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-800 truncate" style={{ fontWeight: 500 }} title={keyword.name}>{keyword.name}</span>
            <span className={clsx('text-xs tabular-nums shrink-0 ml-2', dc.text)} style={{ fontWeight: 600 }}>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className={clsx('h-full rounded-full', dc.dot)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
          </div>
        </div>
        {hasSubtopics && <ChevronDown size={14} className={clsx('shrink-0 text-gray-400 transition-transform', expanded && 'rotate-180')} />}
      </button>
      <AnimatePresence>
        {expanded && hasSubtopics && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pl-8 pr-2 pb-2 space-y-1.5">
              {keyword.subtopics.map((st) => {
                const stDelta = getKeywordDeltaColorSafe(st.p_know, keyword.priority ?? 1);
                const stDc = getDeltaColorClasses(stDelta);
                const stPct = Math.round(st.p_know * 100);
                return (
                  <div key={st.id} className="flex items-center gap-2">
                    <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', stDc.dot)} />
                    <span className="text-xs text-gray-600 flex-1 truncate" title={st.name}>{st.name}</span>
                    <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden shrink-0"><div className={clsx('h-full rounded-full', stDc.dot)} style={{ width: `${stPct}%` }} /></div>
                    <span className="text-[10px] text-gray-400 tabular-nums w-7 text-right" style={{ fontWeight: 600 }}>{stPct}%</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdaptiveKeywordPanel({ keywordMastery, topicSummary, loading = false, compact = false }: AdaptiveKeywordPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const { weakKeywords, masteredKeywords, allSorted } = useMemo(() => {
    if (!topicSummary) {
      const all = Array.from(keywordMastery.values()).sort((a, b) => a.mastery - b.mastery);
      return { weakKeywords: all.filter(kw => !kw.isMastered), masteredKeywords: all.filter(kw => kw.isMastered), allSorted: all };
    }
    return { weakKeywords: topicSummary.weakestKeywords, masteredKeywords: topicSummary.allKeywordsByMastery.filter(kw => kw.isMastered), allSorted: topicSummary.allKeywordsByMastery };
  }, [keywordMastery, topicSummary]);

  if (!loading && keywordMastery.size === 0) return <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center"><BookOpen size={16} /><span>No hay datos de mastery para este tema</span></div>;
  if (loading) return <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-4"><div className="flex items-center gap-2 mb-3"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></div><KeywordSkeleton count={4} /></div>;

  const visibleWeak = showAll ? weakKeywords : weakKeywords.slice(0, INITIAL_VISIBLE);
  const hasMore = weakKeywords.length > INITIAL_VISIBLE && !showAll;
  const totalKw = allSorted.length;
  const masteredCount = masteredKeywords.length;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Dominio por Keyword</h4>
        <span className="text-xs text-gray-500"><span style={{ fontWeight: 600 }} className="text-gray-700">{masteredCount}</span>/{totalKw} dominados</span>
      </div>
      {visibleWeak.length > 0 && (
        <div className="mb-2">
          {!compact && weakKeywords.length > 0 && <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-2 px-2" style={{ fontWeight: 600 }}><AlertTriangle size={12} /><span>Necesitan refuerzo ({weakKeywords.length})</span></div>}
          <div className="space-y-0.5">{visibleWeak.map((kw) => <KeywordRow key={kw.keyword_id} keyword={kw} compact={compact} />)}</div>
          {hasMore && <button onClick={() => setShowAll(true)} className="w-full text-center text-xs text-[#2a8c7a] hover:text-[#244e47] py-2 transition-colors" style={{ fontWeight: 500 }}>Mostrar {weakKeywords.length - INITIAL_VISIBLE} m{'\u00E1'}s...</button>}
        </div>
      )}
      {weakKeywords.length > 0 && masteredKeywords.length > 0 && <div className="h-px bg-gray-100 my-2" />}
      {masteredKeywords.length > 0 && (
        <div>
          {!compact && <div className="flex items-center gap-1.5 text-xs text-emerald-600 mb-2 px-2" style={{ fontWeight: 600 }}><CheckCircle2 size={12} /><span>Dominados ({masteredKeywords.length})</span></div>}
          <div className="space-y-0.5">
            {masteredKeywords.slice(0, compact ? 3 : 5).map((kw) => <KeywordRow key={kw.keyword_id} keyword={kw} compact={compact} />)}
            {masteredKeywords.length > (compact ? 3 : 5) && <p className="text-[10px] text-gray-400 text-center py-1">+{masteredKeywords.length - (compact ? 3 : 5)} m{'\u00E1'}s dominados</p>}
          </div>
        </div>
      )}
      {weakKeywords.length === 0 && masteredKeywords.length > 0 && <div className="flex items-center gap-2 text-sm text-emerald-600 py-2 justify-center" style={{ fontWeight: 500 }}><CheckCircle2 size={16} /><span>{'\u00A1'}Todos los keywords dominados!</span></div>}
    </div>
  );
}
