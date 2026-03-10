// ============================================================
// Axon — Professor: Quiz Analytics Panel (P4 Feature)
//
// Shows per-quiz analytics: question difficulty distribution,
// type distribution, and question-level stats.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuizAttempt } from '@/app/services/quizApi';
import { normalizeDifficulty, normalizeQuestionType } from '@/app/services/quizConstants';
import type { Difficulty, QuestionType } from '@/app/services/quizConstants';
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from '@/app/services/quizConstants';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  BarChart3, X, Loader2, AlertTriangle,
  TrendingUp, Clock, Target, HelpCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER, BTN_CLOSE, BANNER_ERROR } from '@/app/services/quizDesignTokens';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';

interface QuizAnalyticsPanelProps {
  quizId: string;
  quizTitle: string;
  summaryId: string;
  onClose: () => void;
}

const DIFF_CHART_COLORS: Record<Difficulty, string> = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
const TYPE_CHART_COLORS: Record<QuestionType, string> = { mcq: '#6366f1', true_false: '#8b5cf6', fill_blank: '#06b6d4', open: '#f97316' };

export function QuizAnalyticsPanel({ quizId, quizTitle, summaryId, onClose }: QuizAnalyticsPanelProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const res = await quizApi.getQuizQuestions(summaryId, { quiz_id: quizId, limit: 200 });
        if (cancelled) return;
        const items = res.items || [];
        setQuestions(items);
        const attemptResults = await Promise.allSettled(items.map(q => quizApi.getQuizAttempts({ quiz_question_id: q.id })));
        if (cancelled) return;
        const allAttempts: QuizAttempt[] = [];
        for (const r of attemptResults) { if (r.status === 'fulfilled') allAttempts.push(...r.value); }
        setAttempts(allAttempts);
      } catch (err) { if (!cancelled) setError(getErrorMsg(err)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [quizId, summaryId]);

  const diffData = useMemo(() => {
    const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const q of questions) { counts[normalizeDifficulty(q.difficulty)]++; }
    return (['easy', 'medium', 'hard'] as Difficulty[]).map(d => ({ name: DIFFICULTY_LABELS[d], value: counts[d], fill: DIFF_CHART_COLORS[d] }));
  }, [questions]);

  const typeData = useMemo(() => {
    const counts: Record<QuestionType, number> = { mcq: 0, true_false: 0, fill_blank: 0, open: 0 };
    for (const q of questions) { counts[normalizeQuestionType(q.question_type)]++; }
    return (['mcq', 'true_false', 'fill_blank', 'open'] as QuestionType[]).filter(t => counts[t] > 0).map(t => ({ name: QUESTION_TYPE_LABELS[t], value: counts[t], fill: TYPE_CHART_COLORS[t] }));
  }, [questions]);

  const questionStats = useMemo(() => {
    const attemptsByQ = new Map<string, QuizAttempt[]>();
    for (const a of attempts) { const list = attemptsByQ.get(a.quiz_question_id) || []; list.push(a); attemptsByQ.set(a.quiz_question_id, list); }
    return questions.map((q, i) => {
      const qAttempts = attemptsByQ.get(q.id) || [];
      const totalAttempts = qAttempts.length;
      const correctAttempts = qAttempts.filter(a => a.is_correct).length;
      const avgTimeMs = qAttempts.length > 0 ? qAttempts.reduce((sum, a) => sum + (a.time_taken_ms || 0), 0) / qAttempts.length : 0;
      return { question: q, index: i + 1, totalAttempts, correctAttempts, successRate: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0, avgTimeSec: avgTimeMs / 1000 };
    }).sort((a, b) => a.successRate - b.successRate);
  }, [questions, attempts]);

  const globalStats = useMemo(() => {
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.is_correct).length;
    const avgTimeMs = totalAttempts > 0 ? attempts.reduce((sum, a) => sum + (a.time_taken_ms || 0), 0) / totalAttempts : 0;
    return { totalQuestions: questions.length, totalAttempts, globalSuccessRate: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0, avgTimeSec: (avgTimeMs / 1000).toFixed(1) };
  }, [questions, attempts]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${MODAL_OVERLAY} p-4`} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()} className={`${MODAL_CARD} w-full max-w-[700px] max-h-[85vh] flex flex-col overflow-hidden`}>
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm"><BarChart3 size={17} className="text-white" /></div>
            <div><h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>Analytics del quiz</h3><p className="text-[10px] text-gray-400 truncate max-w-[350px]">{quizTitle}</p></div>
          </div>
          <button onClick={onClose} className={BTN_CLOSE}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2"><Loader2 size={20} className="animate-spin text-purple-500" /><span className="text-[12px] text-zinc-400">Cargando analytics...</span></div>
          ) : error ? (
            <div className={BANNER_ERROR}><AlertTriangle size={14} />{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                <AnalyticsStatCard icon={<HelpCircle size={14} />} label="Preguntas" value={String(globalStats.totalQuestions)} color="text-purple-600 bg-purple-50" />
                <AnalyticsStatCard icon={<Target size={14} />} label="Intentos" value={String(globalStats.totalAttempts)} color="text-blue-600 bg-blue-50" />
                <AnalyticsStatCard icon={<TrendingUp size={14} />} label="Acierto" value={`${globalStats.globalSuccessRate}%`} color={globalStats.globalSuccessRate >= 70 ? 'text-emerald-600 bg-emerald-50' : globalStats.globalSuccessRate >= 40 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'} />
                <AnalyticsStatCard icon={<Clock size={14} />} label="Tiempo prom." value={`${globalStats.avgTimeSec}s`} color="text-zinc-600 bg-zinc-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3" style={{ fontWeight: 700 }}>Por dificultad</p>
                  <ResponsiveContainer width="100%" height={120}><BarChart data={diffData}><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis hide allowDecimals={false} /><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{diffData.map((d, i) => (<Cell key={i} fill={d.fill} />))}</Bar></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3" style={{ fontWeight: 700 }}>Por tipo</p>
                  <ResponsiveContainer width="100%" height={120}><BarChart data={typeData}><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis hide allowDecimals={false} /><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{typeData.map((d, i) => (<Cell key={i} fill={d.fill} />))}</Bar></BarChart></ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2" style={{ fontWeight: 700 }}>Preguntas mas dificiles</p>
                {questionStats.length === 0 ? (<p className="text-[12px] text-zinc-400 text-center py-4">No hay datos de intentos</p>) : (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar-light">
                    {questionStats.map(qs => (
                      <div key={qs.question.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-zinc-200 text-[11px]">
                        <span className="text-zinc-400 shrink-0" style={{ fontWeight: 600 }}>#{qs.index}</span>
                        <span className="text-zinc-600 truncate flex-1">{qs.question.question}</span>
                        {qs.totalAttempts > 0 ? (<><span className={clsx('shrink-0 px-1.5 py-0.5 rounded text-[9px]', qs.successRate >= 70 ? 'text-emerald-600 bg-emerald-50' : qs.successRate >= 40 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50')} style={{ fontWeight: 700 }}>{Math.round(qs.successRate)}%</span><span className="text-zinc-400 shrink-0 flex items-center gap-0.5"><Clock size={9} />{qs.avgTimeSec.toFixed(1)}s</span><span className="text-zinc-400 shrink-0">{qs.correctAttempts}/{qs.totalAttempts}</span></>) : (<span className="text-zinc-300 text-[9px] italic">Sin intentos</span>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnalyticsStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string; }) {
  return (<div className={clsx('rounded-xl px-3 py-3 flex flex-col items-center gap-1', color)}>{icon}<span className="text-lg" style={{ fontWeight: 700 }}>{value}</span><span className="text-[9px] uppercase tracking-wider opacity-70" style={{ fontWeight: 600 }}>{label}</span></div>);
}
