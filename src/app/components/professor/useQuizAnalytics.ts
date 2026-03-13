// ============================================================
// Axon — Professor: useQuizAnalytics Hook (R15 Extraction)
//
// Encapsulates data loading and computed analytics for a quiz:
//   - Loads questions + attempts in parallel
//   - Computes difficulty distribution, type distribution,
//     per-question stats, and global stats
//
// Extracted from QuizAnalyticsPanel.tsx to separate concerns
// (data logic vs UI) and make analytics reusable.
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuizAttempt } from '@/app/services/quizApi';
import { normalizeDifficulty, normalizeQuestionType } from '@/app/services/quizConstants';
import type { Difficulty, QuestionType } from '@/app/services/quizConstants';
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from '@/app/services/quizConstants';
import { getErrorMsg } from '@/app/lib/error-utils';

// ── Color maps ───────────────────────────────────────────

export const DIFF_CHART_COLORS: Record<Difficulty, string> = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
};

export const TYPE_CHART_COLORS: Record<QuestionType, string> = {
  mcq: '#6366f1',
  true_false: '#8b5cf6',
  fill_blank: '#06b6d4',
  open: '#f97316',
};

// ── Types ────────────────────────────────────────────────

export interface ChartDatum {
  name: string;
  value: number;
  fill: string;
}

export interface QuestionStat {
  question: QuizQuestion;
  index: number;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
  avgTimeSec: number;
}

export interface GlobalStats {
  totalQuestions: number;
  totalAttempts: number;
  globalSuccessRate: number;
  avgTimeSec: string;
}

export interface UseQuizAnalyticsReturn {
  loading: boolean;
  error: string | null;
  diffData: ChartDatum[];
  typeData: ChartDatum[];
  questionStats: QuestionStat[];
  globalStats: GlobalStats;
}

// ── Hook ─────────────────────────────────────────────────

export function useQuizAnalytics(
  quizId: string,
  summaryId: string,
): UseQuizAnalyticsReturn {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await quizApi.getQuizQuestions(summaryId, { quiz_id: quizId, limit: 200 });
        if (cancelled) return;
        const items = res.items || [];
        setQuestions(items);

        const attemptResults = await Promise.allSettled(
          items.map(q => quizApi.getQuizAttempts({ quiz_question_id: q.id })),
        );
        if (cancelled) return;
        const allAttempts: QuizAttempt[] = [];
        for (const r of attemptResults) {
          if (r.status === 'fulfilled') allAttempts.push(...r.value);
        }
        setAttempts(allAttempts);
      } catch (err) {
        if (!cancelled) setError(getErrorMsg(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [quizId, summaryId]);

  // ── Difficulty distribution ────────────────────────────
  const diffData = useMemo<ChartDatum[]>(() => {
    const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const q of questions) {
      const d = normalizeDifficulty(q.difficulty);
      counts[d]++;
    }
    return (['easy', 'medium', 'hard'] as Difficulty[]).map(d => ({
      name: DIFFICULTY_LABELS[d],
      value: counts[d],
      fill: DIFF_CHART_COLORS[d],
    }));
  }, [questions]);

  // ── Type distribution ─────────────────────────────────
  const typeData = useMemo<ChartDatum[]>(() => {
    const counts: Record<QuestionType, number> = { mcq: 0, true_false: 0, fill_blank: 0, open: 0 };
    for (const q of questions) {
      const t = normalizeQuestionType(q.question_type);
      counts[t]++;
    }
    return (['mcq', 'true_false', 'fill_blank', 'open'] as QuestionType[])
      .filter(t => counts[t] > 0)
      .map(t => ({
        name: QUESTION_TYPE_LABELS[t],
        value: counts[t],
        fill: TYPE_CHART_COLORS[t],
      }));
  }, [questions]);

  // ── Per-question stats (sorted hardest first) ──────────
  const questionStats = useMemo<QuestionStat[]>(() => {
    const attemptsByQ = new Map<string, QuizAttempt[]>();
    for (const a of attempts) {
      const list = attemptsByQ.get(a.quiz_question_id) || [];
      list.push(a);
      attemptsByQ.set(a.quiz_question_id, list);
    }
    return questions.map((q, i) => {
      const qAttempts = attemptsByQ.get(q.id) || [];
      const totalAttempts = qAttempts.length;
      const correctAttempts = qAttempts.filter(a => a.is_correct).length;
      const avgTimeMs = qAttempts.length > 0
        ? qAttempts.reduce((sum, a) => sum + (a.time_taken_ms || 0), 0) / qAttempts.length
        : 0;
      return {
        question: q,
        index: i + 1,
        totalAttempts,
        correctAttempts,
        successRate: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
        avgTimeSec: avgTimeMs / 1000,
      };
    }).sort((a, b) => a.successRate - b.successRate);
  }, [questions, attempts]);

  // ── Global stats ───────────────────────────────────────
  const globalStats = useMemo<GlobalStats>(() => {
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.is_correct).length;
    const avgTimeMs = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + (a.time_taken_ms || 0), 0) / totalAttempts
      : 0;
    return {
      totalQuestions: questions.length,
      totalAttempts,
      globalSuccessRate: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
      avgTimeSec: (avgTimeMs / 1000).toFixed(1),
    };
  }, [questions, attempts]);

  return { loading, error, diffData, typeData, questionStats, globalStats };
}
