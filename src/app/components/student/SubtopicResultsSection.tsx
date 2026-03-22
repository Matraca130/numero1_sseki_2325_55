// ============================================================
// Axon — Student Quiz: Subtopic Grouping in Results (P4 Feature)
//
// Agent: GROUPER
// Groups quiz results by subtopic_id with collapsible sections,
// per-subtopic score bars, and BKT mastery badges.
//
// Design: teal accent, matches KeywordMasterySection pattern.
// ============================================================

import React, { useState, useMemo } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { SavedAnswer } from '@/app/components/student/quiz-types';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Layers, Brain, ChevronDown, ChevronRight,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { getMasteryLevel } from '@/app/services/aiApi';
import { useBktStates } from '@/app/components/student/useBktStates';

// ── Types ────────────────────────────────────────────────

interface SubtopicGroup {
  subtopicId: string;
  subtopicName: string;
  keywordId: string;
  questions: { question: QuizQuestion; idx: number; saved: SavedAnswer | undefined }[];
  correct: number;
  total: number;
}

// ── Props ────────────────────────────────────────────────

interface SubtopicResultsSectionProps {
  questions: QuizQuestion[];
  savedAnswers: Record<number, SavedAnswer>;
  keywordMap?: Record<string, string>;
}

// ── Component ────────────────────────────────────────────

export const SubtopicResultsSection = React.memo(function SubtopicResultsSection({
  questions,
  savedAnswers,
  keywordMap,
}: SubtopicResultsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── BKT states (M-2: shared hook) ───────────────────
  const { bktStates, bktBySubtopic, hasBktData: hasSubtopics } = useBktStates(questions);

  // ── Build subtopic groups ───────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, SubtopicGroup>();
    questions.forEach((q, idx) => {
      const stId = q.subtopic_id || '__none__';
      if (!map.has(stId)) {
        map.set(stId, {
          subtopicId: stId,
          subtopicName: stId === '__none__' ? 'Sin subtopico' : `Subtopico ${stId.substring(0, 8)}`,
          keywordId: q.keyword_id,
          questions: [],
          correct: 0,
          total: 0,
        });
      }
      const group = map.get(stId)!;
      const sa = savedAnswers[idx];
      group.questions.push({ question: q, idx, saved: sa });
      if (sa?.answered) {
        group.total++;
        if (sa.correct) group.correct++;
      }
    });
    return Array.from(map.values())
      .filter(g => g.total > 0)
      .sort((a, b) => {
        const aPct = a.total > 0 ? a.correct / a.total : 0;
        const bPct = b.total > 0 ? b.correct / b.total : 0;
        return aPct - bPct; // Weakest first
      });
  }, [questions, savedAnswers]);

  // ── Guard ──────────────────────────────────────────────
  if (!hasSubtopics || groups.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} className="text-teal-500" />
        <h3 className="text-sm text-zinc-700" style={{ fontWeight: 700 }}>
          Resultado por subtopico
        </h3>
        {bktStates.length > 0 && (
          <span className="flex items-center gap-1 text-[9px] text-teal-500 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-200" style={{ fontWeight: 600 }}>
            <Brain size={9} /> BKT
          </span>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {groups.map((group, gi) => {
          const pct = group.total > 0 ? (group.correct / group.total) * 100 : 0;
          const mastery = bktBySubtopic.get(group.subtopicId);
          const masteryInfo = mastery != null ? getMasteryLevel(mastery) : null;
          const isExpanded = expandedId === group.subtopicId;

          return (
            <div key={group.subtopicId} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {/* Group header (clickable) */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : group.subtopicId)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/50 transition-colors text-left"
              >
                <span className="text-zinc-400 shrink-0">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[12px] text-zinc-700 truncate" style={{ fontWeight: 600 }}>
                        {group.subtopicName}
                      </span>
                      {/* Keyword label */}
                      {keywordMap?.[group.keywordId] && (
                        <span className="text-[9px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 shrink-0" style={{ fontWeight: 600 }}>
                          {keywordMap[group.keywordId]}
                        </span>
                      )}
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
                      pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-500',
                    )} style={{ fontWeight: 700 }}>
                      {group.correct}/{group.total}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div
                      className={clsx(
                        'h-full rounded-full',
                        pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-400',
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: gi * 0.08 }}
                    />
                  </div>
                </div>
              </button>

              {/* Expanded questions */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 border-t border-zinc-100 pt-2 space-y-1.5">
                      {group.questions.map(({ question: q, idx, saved }) => (
                        <div
                          key={q.id}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-zinc-50 text-[11px]"
                        >
                          <span className="shrink-0 mt-0.5">
                            {saved?.answered && saved.correct ? (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            ) : saved?.answered ? (
                              <XCircle size={12} className="text-rose-500" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-zinc-300" />
                            )}
                          </span>
                          <span className="text-zinc-600 truncate flex-1" style={{ lineHeight: '1.4' }}>
                            {q.question}
                          </span>
                          <span className="text-zinc-400 shrink-0" style={{ fontWeight: 600 }}>
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
});