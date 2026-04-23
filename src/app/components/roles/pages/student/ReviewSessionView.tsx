// ============================================================
// Axon — ReviewSessionView (FSRS-based Spaced Repetition)
//
// DIFERENCIA CON FlashcardReviewer (EV-4B):
// - FlashcardReviewer: "Revisar TODAS las flashcards de un summary" (manual)
// - ReviewSessionView: "Revisar solo las que TOCAN HOY segun FSRS" (algoritmico)
//
// Flow:
// 1. GET /study-queue → returns cards + FSRS data in 1 request (GAP 5 FIX)
// 2. POST /study-sessions → create session
// 3. Review cards with flip + grade 1-5
// 4. grade=1 → re-insert at end of queue
// 5. queueReview (sync, 0 POSTs) per card
// 6. Session end:
//    a. submitBatch → 1 POST /review-batch
//    b. closeStudySession → 1 POST
//    c. postSessionAnalytics → 2 POSTs (daily-activities + student-stats)
//
// v4.4.4 — Migrated to useReviewBatch
// v4.4.5 — grade=1 re-enqueue FIX
// Backend: FLAT routes via studySessionApi + flashcardApi + apiCall.
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { postSessionAnalytics } from '@/app/lib/sessionAnalytics';
import { getStudyQueue } from '@/app/lib/studyQueueApi';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import * as sessionApi from '@/app/services/studySessionApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import { FlashcardCard } from '@/app/components/student/FlashcardCard';
import { useReviewBatch, retryPendingBatches } from '@/app/hooks/useReviewBatch';
import {
  Loader2, X, CheckCircle,
  Trophy, BarChart3, ChevronRight, Clock, Calendar,
  Play, AlertTriangle, Stethoscope,
} from 'lucide-react';
import { RATINGS } from '@/app/hooks/flashcard-types';
import { ReportContentButton } from '@/app/components/shared/ReportContentButton';
import { useSessionXP } from '@/app/hooks/useSessionXP';
import { XPPopup } from '@/app/components/gamification/XPPopup';
import { ComboIndicator } from '@/app/components/gamification/ComboIndicator';
import { SessionXPSummary } from '@/app/components/gamification/SessionXPSummary';
import { LevelProgressBar } from '@/app/components/gamification/LevelProgressBar';
import { useAuth } from '@/app/context/AuthContext';
import * as gamificationApi from '@/app/services/gamificationApi';
import { useStudyPlanBridge } from '@/app/hooks/useStudyPlanBridge';
import { gradients } from '@/app/design-system';

interface ReviewQueueItem { card: FlashcardItem; fsrsState: StudyQueueItem; }
interface ReviewSessionViewProps { onClose?: () => void; masteryMap?: Map<string, { p_know: number }>; }
type ReviewPhase = 'loading' | 'idle' | 'reviewing' | 'finished';

export function ReviewSessionView({ onClose, masteryMap }: ReviewSessionViewProps) {
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [totalDueCount, setTotalDueCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || '';
  const { state: xpState, initSession: initXP, recordReview: recordXP, endSession: endXP } = useSessionXP();
  const [xpEventKey, setXpEventKey] = useState(0);
  const [sessionXPResult, setSessionXPResult] = useState<{ actualXP: number; newLevel: number; leveledUp: boolean } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [grades, setGrades] = useState<number[]>([]);
  const sessionStartRef = useRef<Date | null>(null);
  const gradesRef = useRef<number[]>([]);
  const cardStartTime = useRef<number>(Date.now());
  const { queueReview, submitBatch, reset: batchReset } = useReviewBatch();
  const { markSessionComplete } = useStudyPlanBridge();

  useEffect(() => { retryPendingBatches(); }, []);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (phase === 'reviewing' && !timerRef.current) { timerRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000); }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [phase]);
  const stopTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }, []);
  const formattedTime = useMemo(() => { const m = Math.floor(elapsedSeconds / 60); const s = elapsedSeconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; }, [elapsedSeconds]);

  // Load due cards
  useEffect(() => {
    let cancelled = false;
    async function loadDueCards() {
      try {
        const response = await getStudyQueue({ limit: 100 });
        if (cancelled) return;
        const dueItems = response.queue;
        if (dueItems.length === 0) { setTotalDueCount(0); setQueue([]); setPhase('idle'); return; }
        const items: ReviewQueueItem[] = dueItems.map(sq => ({ card: { id: sq.flashcard_id, front: sq.front, back: sq.back, front_image_url: sq.front_image_url, back_image_url: sq.back_image_url, summary_id: sq.summary_id, keyword_id: sq.keyword_id, subtopic_id: sq.subtopic_id, is_active: true, deleted_at: null } as FlashcardItem, fsrsState: sq }));
        setQueue(items); setTotalDueCount(response.meta.total_in_queue); setPhase('idle');
      } catch (err: unknown) {
        console.error('[ReviewSession] Load error:', err);
        if (!cancelled) { setLoadError(err instanceof Error ? err.message : 'Error al cargar repasos'); setPhase('idle'); }
      }
    }
    loadDueCards();
    return () => { cancelled = true; };
  }, []);

  const currentItem = queue[currentIdx] || null;
  const reviewedCount = grades.length;

  const startSession = useCallback(async () => {
    try {
      const session = await sessionApi.createStudySession({ session_type: 'flashcard' });
      setSessionId(session.id); sessionStartRef.current = new Date(); cardStartTime.current = Date.now();
      setCurrentIdx(0); setIsFlipped(false); setGrades([]); gradesRef.current = []; setElapsedSeconds(0);
      batchReset(); setPhase('reviewing'); initXP(institutionId);
    } catch (err: unknown) { console.error('[ReviewSession] Session create error:', err); }
  }, [batchReset, initXP, institutionId]);

  const handleGrade = useCallback((grade: number) => {
    if (!sessionId || !currentItem) return;
    const responseTimeMs = Date.now() - cardStartTime.current;
    const masteryEntry = masteryMap?.get(currentItem.card.id);
    const reviewResult = queueReview({ card: currentItem.card, grade, responseTimeMs, currentPKnow: masteryEntry?.p_know ?? currentItem.fsrsState.p_know ?? 0 });
    const newGrades = [...gradesRef.current, grade]; gradesRef.current = newGrades; setGrades(newGrades);
    if (grade === 1) { setQueue(prev => [...prev, { card: currentItem.card, fsrsState: currentItem.fsrsState }]); }
    const updatedQueueLength = grade === 1 ? queue.length + 1 : queue.length;
    if (currentIdx + 1 < updatedQueueLength) {
      setCurrentIdx(currentIdx + 1); setIsFlipped(false); cardStartTime.current = Date.now();
      recordXP(grade); setXpEventKey(prev => prev + 1);
    } else {
      stopTimer(); setPhase('finished'); recordXP(grade); setXpEventKey(prev => prev + 1);
      const sid = sessionId; const startTime = sessionStartRef.current;
      (async () => {
        await submitBatch(sid);
        const now = new Date(); const durationSeconds = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
        const correctReviews = newGrades.filter(g => g >= 3).length;
        try { await sessionApi.closeStudySession(sid, { completed_at: now.toISOString(), total_reviews: newGrades.length, correct_reviews: correctReviews }); } catch (err) { console.error('[ReviewSession] Session close error:', err); }
        await postSessionAnalytics({ totalReviews: newGrades.length, correctReviews, durationSeconds });
        try { const xpResult = await endXP(institutionId); setSessionXPResult(xpResult); } catch { /* XP reconciliation failed */ }
        gamificationApi.checkBadges(institutionId).catch(() => {});
        markSessionComplete('flashcard');
      })();
    }
  }, [sessionId, currentItem, currentIdx, queue, queueReview, submitBatch, stopTimer, masteryMap, recordXP, endXP, institutionId, markSessionComplete]);

  // Keyboard shortcuts — MUST be declared AFTER handleGrade, otherwise the
  // deps array reads `handleGrade` from the Temporal Dead Zone and throws
  // ReferenceError on every render (#452).
  useEffect(() => {
    if (phase !== 'reviewing') return;
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); if (!isFlipped) setIsFlipped(true); }
      else if (isFlipped && e.key >= '1' && e.key <= '5') { e.preventDefault(); handleGrade(parseInt(e.key, 10)); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isFlipped, handleGrade]);

  const gradeDistribution = useMemo(() => { const dist = [0, 0, 0, 0, 0]; for (const g of gradesRef.current) { if (g >= 1 && g <= 5) dist[g - 1]++; } return dist; }, [grades]);
  const correctPercentage = useMemo(() => { if (grades.length === 0) return 0; return Math.round((grades.filter(g => g >= 3).length / grades.length) * 100); }, [grades]);
  const nextDueEstimate = useMemo(() => { if (grades.length === 0) return ''; const hasAgain = grades.some(g => g === 1); if (hasAgain) return 'pronto (algunas tarjetas necesitan repaso)'; return 'manana o despues'; }, [grades]);

  // PHASE: LOADING
  if (phase === 'loading') {
    return (<div className="flex flex-col items-center justify-center h-full bg-[#F0F2F5]"><Loader2 size={32} className="animate-spin text-[#2a8c7a] mb-4" /><p className="text-sm text-gray-500">Buscando flashcards pendientes...</p></div>);
  }

  // PHASE: IDLE
  if (phase === 'idle') {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#F0F2F5] px-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4"><X size={28} className="text-red-400" /></div>
          <h3 className="font-bold text-gray-800 mb-2">Error al cargar</h3>
          <p className="text-sm text-gray-500 text-center max-w-md mb-4">{loadError}</p>
          {onClose && (<button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Volver</button>)}
        </div>
      );
    }
    if (totalDueCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#F0F2F5] px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6"><CheckCircle size={36} className="text-emerald-500" /></motion.div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Todo al dia!</h3>
          <p className="text-sm text-gray-500 max-w-md text-center mb-2">No hay repasos pendientes. Vuelve manana!</p>
          <p className="text-xs text-gray-400 mb-8">Las flashcards se programan automaticamente segun tu rendimiento</p>
          {onClose && (<button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B3B36] text-white font-semibold hover:bg-[#244e47] transition-all">Volver al dashboard<ChevronRight size={16} /></button>)}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F0F2F5] px-4">
        <div className={`w-20 h-20 rounded-2xl ${gradients.tealIconBg.tw} border border-[#2a8c7a]/20 flex items-center justify-center mb-6`}><Calendar size={36} className="text-[#2a8c7a]" /></div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Repaso del dia</h3>
        <p className="text-sm text-gray-500 max-w-md text-center mb-1">{totalDueCount} flashcard{totalDueCount !== 1 ? 's' : ''} para repasar hoy</p>
        <p className="text-xs text-gray-400 mb-8">Basado en el algoritmo FSRS de repeticion espaciada</p>
        <button onClick={startSession} className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#1B3B36] text-white font-semibold hover:bg-[#244e47] transition-all shadow-lg shadow-[#1B3B36]/20"><Play size={18} />Comenzar repaso</button>
        {onClose && (<button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">Cancelar</button>)}
      </div>
    );
  }

  // PHASE: REVIEWING
  if (phase === 'reviewing' && currentItem) {
    const progressPercent = (reviewedCount / Math.max(queue.length, 1)) * 100;
    const correctSoFar = grades.filter(g => g >= 3).length;
    const accuracyPct = reviewedCount > 0 ? Math.round((correctSoFar / reviewedCount) * 100) : 0;
    return (
      <div className="flex flex-col h-full min-h-0 bg-[#F0F2F5] relative">
        <XPPopup event={xpState.lastEvent} eventKey={xpEventKey} />
        <div className="shrink-0 px-5 py-3 flex items-center justify-between">
          <button onClick={() => { if (confirm('Salir del repaso? El progreso se perdera.')) { stopTimer(); onClose?.(); } }} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all"><X size={20} /></button>
          <div className="flex items-center gap-4">
            <ComboIndicator comboCount={xpState.comboCount} />
            {reviewedCount > 0 && (<span className={`text-[10px] px-2 py-0.5 rounded-full ${accuracyPct >= 80 ? 'bg-emerald-500/15 text-emerald-600' : accuracyPct >= 50 ? 'bg-amber-500/15 text-amber-600' : 'bg-red-500/15 text-red-600'}`} style={{ fontWeight: 600 }}>{accuracyPct}%</span>)}
            <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{reviewedCount + 1}/{queue.length}</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><Clock size={12} />{formattedTime}</span>
          </div>
          <div className="flex items-center gap-2">
            {xpState.loaded && <LevelProgressBar totalXP={xpState.baselineXP + xpState.totalSessionXP} currentLevel={xpState.currentLevel} compact />}
            <ReportContentButton contentType="flashcard" contentId={currentItem.card.id} />
          </div>
        </div>
        <div className="shrink-0 px-5 pb-4">
          {(currentItem.fsrsState.is_leech || currentItem.fsrsState.clinical_priority > 0) && (
            <div className="flex items-center gap-2 mb-2">
              {currentItem.fsrsState.is_leech && (<span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20" style={{ fontWeight: 600 }}><AlertTriangle size={10} />Leech — {currentItem.fsrsState.consecutive_lapses} fallos seguidos</span>)}
              {currentItem.fsrsState.clinical_priority > 0 && (<span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20" style={{ fontWeight: 600 }}><Stethoscope size={10} />Prioridad clinica: {Math.round(currentItem.fsrsState.clinical_priority * 100)}%</span>)}
            </div>
          )}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><motion.div className={`h-full ${gradients.progress.tw} rounded-full`} initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} /></div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={`${currentItem.card.id}-${currentIdx}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="w-full">
              <FlashcardCard front={currentItem.card.front} back={currentItem.card.back} frontImageUrl={currentItem.card.front_image_url} backImageUrl={currentItem.card.back_image_url} keywordName={null} isFlipped={isFlipped} onFlip={() => { if (!isFlipped) setIsFlipped(true); }} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="shrink-0 px-5 pb-6 pt-4">
          <AnimatePresence>
            {isFlipped && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.2 }} className="flex items-center justify-center gap-2">{RATINGS.map((g) => (<button key={g.value} onClick={() => handleGrade(g.value)} className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-white font-semibold transition-all ${g.color} ${g.hover} shadow-lg`}><span className="text-sm">{g.label}</span><span className="text-[10px] opacity-70">{g.value}</span></button>))}</motion.div>)}
          </AnimatePresence>
          {!isFlipped && (<div className="text-center"><p className="text-xs text-gray-400">Toca la tarjeta o presiona espacio para ver la respuesta</p></div>)}
        </div>
      </div>
    );
  }

  // PHASE: FINISHED
  if (phase === 'finished') {
    const minutes = Math.floor(elapsedSeconds / 60); const seconds = elapsedSeconds % 60;
    const maxGradeCount = Math.max(...gradeDistribution, 1);
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#F0F2F5] min-h-full overflow-y-auto">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }} className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center mb-6"><Trophy size={36} className="text-amber-400" /></motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-2xl font-bold text-gray-900 mb-2">Repaso completado!</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm text-gray-500 mb-8">{grades.length} tarjeta{grades.length !== 1 ? 's' : ''} revisada{grades.length !== 1 ? 's' : ''} en {minutes > 0 ? `${minutes}m ` : ''}{seconds}s</motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-[#2a8c7a]">{grades.length}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Revisadas</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-emerald-500">{correctPercentage}%</p><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Correctas</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-amber-500">{minutes > 0 ? `${minutes}m` : `${seconds}s`}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Tiempo</p></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full max-w-sm bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4"><BarChart3 size={14} className="text-gray-400" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distribucion de calidad</span></div>
          <div className="space-y-2.5">
            {RATINGS.map((g, idx) => (<div key={g.value} className="flex items-center gap-3"><span className="text-xs text-gray-500 w-16 shrink-0">{g.label}</span><div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden"><motion.div className={`h-full rounded-full ${g.color}`} initial={{ width: 0 }} animate={{ width: `${(gradeDistribution[idx] / maxGradeCount) * 100}%` }} transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }} /></div><span className="text-xs font-semibold text-gray-700 w-6 text-right">{gradeDistribution[idx]}</span></div>))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="flex items-center gap-2 text-xs text-gray-400 mb-8"><Calendar size={12} /><span>Proxima revision: {nextDueEstimate}</span></motion.div>

        {xpState.loaded && (<div className="mb-8"><SessionXPSummary state={xpState} actualXP={sessionXPResult?.actualXP} /></div>)}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center gap-3">
          {onClose && (<button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B3B36] text-white font-semibold hover:bg-[#244e47] transition-all">Volver al dashboard<ChevronRight size={16} /></button>)}
        </motion.div>
      </div>
    );
  }

  return null;
}

export default ReviewSessionView;
