// ============================================================
// Axon — Student Quiz: KeywordMasterySection
//
// Extracted from QuizResults.tsx (Fase 2 post-audit) to keep
// QuizResults under the 500-line Architecture Practice limit.
//
// Responsibilities:
//   1. Fetch BKT states for subtopics in the quiz
//   2. Compute keyword → average mastery mapping
//   3. Render keyword group cards with BKT badges
//
// FIX H5-4: BKT fetch uses a `cancelled` flag for cleanup
//   to prevent state updates on unmounted component.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import { getBktStates } from '@/app/services/quizApi';
import type { BktState } from '@/app/services/quizApi';
import type { SavedAnswer } from '@/app/components/student/quiz-types';
import type { GroupStat } from '@/app/components/student/quiz-types';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { Target, Brain, AlertCircle } from 'lucide-react';
import { getMasteryLevel } from '@/app/services/aiApi';
import { logger } from '@/app/lib/logger';

// ── Props ────────────────────────────────────────────────

interface KeywordMasterySectionProps {
  questions: QuizQuestion[];
  keywordGroups: GroupStat[];
}

// ── Component ────────────────────────────────────────────

export const KeywordMasterySection = React.memo(function KeywordMasterySection({
  questions,
  keywordGroups,
}: KeywordMasterySectionProps) {

  // ── Check if BKT data is possible ─────────────────────
  const hasBktData = useMemo(
    () => questions.some(q => q.subtopic_id),
    [questions],
  );

  // ── BKT states fetch ──────────────────────────────────
  const [bktStates, setBktStates] = useState<BktState[]>([]);

  useEffect(() => {
    if (!hasBktData) return;
    let cancelled = false; // FIX H5-4: prevent state update after unmount

    const subtopicIds = [...new Set(
      questions.filter(q => q.subtopic_id).map(q => q.subtopic_id!)
    )];
    if (subtopicIds.length === 0) return;

    getBktStates({ subtopic_ids: subtopicIds, limit: 200 })
      .then(states => { if (!cancelled) setBktStates(states); })
      .catch(err => logger.warn('[KeywordMastery] BKT fetch failed (non-blocking):', err));

    return () => { cancelled = true; };
  }, [hasBktData, questions]);

  // ── Build subtopic → mastery lookup ────────────────────
  const bktBySubtopic = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of bktStates) {
      map.set(s.subtopic_id, s.p_know);
    }
    return map;
  }, [bktStates]);

  // ── Build keyword → average mastery ────────────────────
  const keywordMastery = useMemo(() => {
    const acc = new Map<string, { sum: number; count: number }>();
    for (const q of questions) {
      if (!q.subtopic_id || !q.keyword_id) continue;
      const pKnow = bktBySubtopic.get(q.subtopic_id);
      if (pKnow == null) continue;
      const existing = acc.get(q.keyword_id) || { sum: 0, count: 0 };
      existing.sum += pKnow;
      existing.count++;
      acc.set(q.keyword_id, existing);
    }
    const result = new Map<string, number>();
    for (const [kwId, { sum, count }] of acc) {
      result.set(kwId, sum / count);
    }
    return result;
  }, [questions, bktBySubtopic]);

  // ── Guard: no groups → nothing to render ───────────────
  if (keywordGroups.length === 0) return null;

  return (
    <div className="mb-8">
      {/* ── BKT not available notice ── */}
      {!hasBktData && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 text-[11px] mb-4">
          <AlertCircle size={14} className="shrink-0 text-zinc-400" />
          <span>Seguimiento adaptativo (BKT) no disponible — las preguntas no tienen subtopico asignado.</span>
        </div>
      )}

      {/* ── Section header ── */}
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} className="text-teal-500" />
        <h3 className="text-sm text-zinc-700" style={{ fontWeight: 700 }}>Resultado por keyword</h3>
        {bktStates.length > 0 && (
          <span className="flex items-center gap-1 text-[9px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-200" style={{ fontWeight: 600 }}>
            <Brain size={9} /> BKT
          </span>
        )}
      </div>

      {/* ── Keyword group cards ── */}
      <div className="space-y-2">
        {keywordGroups.map((group, gi) => {
          const groupPct = group.total > 0 ? (group.correct / group.total) * 100 : 0;
          const mastery = keywordMastery.get(group.keywordId) ?? undefined;
          const masteryInfo = mastery != null ? getMasteryLevel(mastery) : null;

          return (
            <div key={group.keywordId} className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-zinc-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] text-zinc-700 truncate" style={{ fontWeight: 600 }}>
                      {group.label}
                    </span>
                    {/* BKT mastery badge */}
                    {masteryInfo && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border shrink-0"
                        style={{
                          fontWeight: 700,
                          color: masteryInfo.color,
                          backgroundColor: `${masteryInfo.color}10`,
                          borderColor: `${masteryInfo.color}30`,
                        }}
                      >
                        <Brain size={9} />
                        {masteryInfo.label} ({Math.round(mastery! * 100)}%)
                      </span>
                    )}
                  </div>
                  <span className={clsx(
                    'text-[11px] shrink-0',
                    groupPct >= 70 ? 'text-emerald-600' : groupPct >= 40 ? 'text-amber-600' : 'text-rose-500'
                  )} style={{ fontWeight: 700 }}>
                    {group.correct}/{group.total}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <motion.div
                    className={clsx(
                      'h-full rounded-full',
                      groupPct >= 70 ? 'bg-emerald-500' : groupPct >= 40 ? 'bg-amber-500' : 'bg-rose-400'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${groupPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: gi * 0.1 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
