// ============================================================
// Axon — FlashcardReviewer (Student Review Session)
//
// Receives summaryId. Full review flow:
// 1. Load active flashcards for summary
// 2. Start study session (POST /study-sessions)
// 3. Flip cards, grade 1-5, queue reviews locally (zero POSTs)
// 4. At session end: submit ALL reviews in ONE batch POST
// 5. Close session with stats
//
// v4.4.4 — Migrated to useReviewBatch:
//   Previously used persistCardReview (3×N POSTs per session)
//   + submitReview (1×N POSTs). Now uses queueReview (sync,
//   zero network) during session and submitBatch (1 POST) at end.
//   Total: N×4 POSTs → 2 POSTs (batch + close).
//
//   Intra-session BKT accumulation (Fase 2) now works
//   automatically via useReviewBatch's sessionBktRef.
//
// Supports all 6 card types (text, text_image, image_text,
// image_image, text_both, cloze).
// Cloze cards: grade after all blanks revealed (not after flip).
// Image preloading for next card.
// Stats breakdown by card type.
//
// States: idle → reviewing → finished
// Used in SummaryView (EV-2) or standalone.
// Backend: FLAT routes via studySessionApi + flashcardApi.
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiCall } from '@/app/lib/api';
import { postSessionAnalytics } from '@/app/lib/sessionAnalytics';
import * as flashcardApi from '@/app/services/flashcardApi';
import * as sessionApi from '@/app/services/studySessionApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import { FlashcardCard } from './FlashcardCard';
import { detectCardType } from '@/app/lib/flashcard-utils';
import type { CardType } from '@/app/lib/flashcard-utils';
import { FlashcardImageZoom } from './FlashcardImageZoom';
import { useReviewBatch, retryPendingBatches } from '@/app/hooks/useReviewBatch';
import {
  CreditCard, Play, Loader2, X, RotateCcw,
  Trophy, BarChart3, ChevronRight, Type, Image as ImageIcon,
  TextCursorInput, Stethoscope,
} from 'lucide-react';
import { RATINGS } from '@/app/hooks/flashcard-types';
import { ReportContentButton } from '@/app/components/shared/ReportContentButton';
import { SkeletonCard } from '@/app/components/shared/SkeletonCard';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { useSessionXP } from '@/app/hooks/useSessionXP';
import { XPPopup } from '@/app/components/gamification/XPPopup';
import { ComboIndicator } from '@/app/components/gamification/ComboIndicator';
import { SessionXPSummary } from '@/app/components/gamification/SessionXPSummary';
import { LevelProgressBar } from '@/app/components/gamification/LevelProgressBar';
import { useAuth } from '@/app/context/AuthContext';
import * as gamificationApi from '@/app/services/gamificationApi';
import { useStudyPlanBridge } from '@/app/hooks/useStudyPlanBridge';
import { gradients } from '@/app/design-system';

// ── Props ─────────────────────────────────────────────────────

interface FlashcardReviewerProps {
  summaryId: string;
  onClose?: () => void;
  masteryMap?: Map<string, { p_know: number }>;
}

type ReviewPhase = 'idle' | 'reviewing' | 'finished';

export function FlashcardReviewer(props: FlashcardReviewerProps) {
  return (
    <ErrorBoundary variant="section" retry={props.onClose}>
      <FlashcardReviewerInner {...props} />
    </ErrorBoundary>
  );
}

function FlashcardReviewerInner({ summaryId, onClose, masteryMap }: FlashcardReviewerProps) {
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || '';
  const { state: xpState, initSession: initXP, recordReview: recordXP, endSession: endXP, reset: resetXP } = useSessionXP();
  const [xpEventKey, setXpEventKey] = useState(0);
  const [sessionXPResult, setSessionXPResult] = useState<{ actualXP: number; newLevel: number; leveledUp: boolean } | null>(null);
  const [phase, setPhase] = useState<ReviewPhase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [grades, setGrades] = useState<number[]>([]);
  const sessionStartRef = useRef<Date | null>(null);
  const gradesRef = useRef<number[]>([]);
  const cardStartTime = useRef<number>(Date.now());
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [clozeReady, setClozeReady] = useState(false);
  const { queueReview, submitBatch, reset: batchReset } = useReviewBatch();
  const { markSessionComplete } = useStudyPlanBridge();

  useEffect(() => { retryPendingBatches(); }, []);

  const currentCard = flashcards[currentIndex] || null;
  const totalCards = flashcards.length;
  const reviewedCount = grades.length;

  const currentCardType = useMemo(() => {
    if (!currentCard) return 'text' as CardType;
    return detectCardType(currentCard.front, currentCard.back);
  }, [currentCard]);

  const isClozeCard = currentCardType === 'cloze';

  useEffect(() => { setClozeReady(false); }, [currentIndex]);

  // Image preloading for next card
  useEffect(() => {
    if (phase !== 'reviewing') return;
    const nextCard = flashcards[currentIndex + 1];
    if (!nextCard) return;
    const urls: string[] = [];
    if (nextCard.front_image_url) urls.push(nextCard.front_image_url);
    if (nextCard.back_image_url) urls.push(nextCard.back_image_url);
    const imgRegex = /!\[img\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(nextCard.front)) !== null) urls.push(match[1]);
    while ((match = imgRegex.exec(nextCard.back)) !== null) urls.push(match[1]);
    for (const url of urls) { const img = new Image(); img.src = url; }
  }, [phase, currentIndex, flashcards]);

  // Load flashcards + keywords
  useEffect(() => {
    if (!summaryId) return;
    setLoading(true);
    Promise.all([
      flashcardApi.getFlashcards(summaryId, undefined, { limit: 200 }),
      apiCall<any>(`/keywords?summary_id=${summaryId}`),
    ])
      .then(([fcResult, kwResult]) => {
        const fcItems = Array.isArray(fcResult) ? fcResult : fcResult.items || [];
        const active = fcItems.filter((c: FlashcardItem) => c.is_active && !c.deleted_at);
        setFlashcards(active);
        const kwItems = Array.isArray(kwResult) ? kwResult : kwResult?.items || [];
        setKeywords(kwItems);
      })
      .catch(err => { console.error('[FlashcardReviewer] Load error:', err); setFlashcards([]); setKeywords([]); })
      .finally(() => setLoading(false));
  }, [summaryId]);

  const keywordMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const kw of keywords) map.set(kw.id, kw.name || kw.term);
    return map;
  }, [keywords]);

  const keywordPriorityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const kw of keywords) {
      if (kw.clinical_priority && kw.clinical_priority > 0) map.set(kw.id, kw.clinical_priority);
    }
    return map;
  }, [keywords]);

  const startReview = useCallback(async () => {
    try {
      const session = await sessionApi.createStudySession({ session_type: 'flashcard' });
      setSessionId(session.id);
      sessionStartRef.current = new Date();
      cardStartTime.current = Date.now();
      setCurrentIndex(0); setIsFlipped(false); setGrades([]); gradesRef.current = [];
      batchReset(); setPhase('reviewing'); initXP(institutionId);
    } catch (err: unknown) { console.error('[FlashcardReviewer] Session create error:', err); }
  }, [batchReset, initXP, institutionId]);

  const handleGrade = useCallback((grade: number) => {
    if (!sessionId || !currentCard) return;
    const responseTimeMs = Date.now() - cardStartTime.current;
    const masteryEntry = masteryMap?.get(currentCard.id);
    queueReview({ card: currentCard, grade, responseTimeMs, currentPKnow: masteryEntry?.p_know });
    const newGrades = [...gradesRef.current, grade];
    gradesRef.current = newGrades;
    setGrades(newGrades);

    if (currentIndex + 1 < totalCards) {
      setCurrentIndex(currentIndex + 1); setIsFlipped(false); cardStartTime.current = Date.now();
      recordXP(grade); setXpEventKey(prev => prev + 1);
    } else {
      setPhase('finished'); recordXP(grade); setXpEventKey(prev => prev + 1);
      const sid = sessionId; const startTime = sessionStartRef.current;
      (async () => {
        await submitBatch(sid);
        const now = new Date(); const correctReviews = newGrades.filter(g => g >= 3).length;
        try { await sessionApi.closeStudySession(sid, { completed_at: now.toISOString(), total_reviews: totalCards, correct_reviews: correctReviews }); } catch (err) { console.error('[FlashcardReviewer] Session close error:', err); }
        const durationSeconds = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
        await postSessionAnalytics({ totalReviews: totalCards, correctReviews, durationSeconds });
        try { const xpResult = await endXP(institutionId); setSessionXPResult(xpResult); } catch { /* XP reconciliation failed */ }
        gamificationApi.checkBadges(institutionId).catch(() => {});
        markSessionComplete('flashcard');
      })();
    }
  }, [sessionId, currentCard, currentIndex, totalCards, queueReview, submitBatch, masteryMap, recordXP, endXP, institutionId, markSessionComplete]);

  useEffect(() => {
    if (phase !== 'reviewing') return;
    const handler = (e: KeyboardEvent) => {
      if (zoomImageUrl) return;
      if (e.key === ' ') { e.preventDefault(); if (!isFlipped) setIsFlipped(true); }
      if (e.key === 'Enter' && !isClozeCard) { e.preventDefault(); if (!isFlipped) setIsFlipped(true); }
      if (e.key === 'Tab' && isClozeCard && !isFlipped) { e.preventDefault(); setClozeReady(true); setIsFlipped(true); }
      if (isFlipped) { const num = parseInt(e.key); if (num >= 1 && num <= 5) { e.preventDefault(); handleGrade(num); } }
      if ((e.key === 'z' || e.key === 'Z') && currentCard) {
        const imgRegex = /!\[img\]\(([^)]+)\)/;
        const side = isFlipped ? currentCard.back : currentCard.front;
        const match = side.match(imgRegex);
        if (match) { e.preventDefault(); setZoomImageUrl(match[1]); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, isFlipped, handleGrade, zoomImageUrl, isClozeCard, currentCard]);

  const restartReview = useCallback(() => {
    setPhase('idle'); setSessionId(null); setCurrentIndex(0); setIsFlipped(false);
    setGrades([]); gradesRef.current = []; sessionStartRef.current = null;
    batchReset(); resetXP();
  }, [batchReset, resetXP]);

  const gradeDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    for (const g of grades) { if (g >= 1 && g <= 5) dist[g - 1]++; }
    return dist;
  }, [grades]);

  const correctPercentage = useMemo(() => {
    if (grades.length === 0) return 0;
    return Math.round((grades.filter(g => g >= 3).length / grades.length) * 100);
  }, [grades]);

  const cardTypeDistribution = useMemo(() => {
    const dist: { [key in CardType]: number } = { text: 0, text_image: 0, image_text: 0, image_image: 0, text_both: 0, cloze: 0 };
    for (const card of flashcards) { const type = detectCardType(card.front, card.back); if (type in dist) dist[type]++; }
    return dist;
  }, [flashcards]);

  const totalCardTypes = Object.values(cardTypeDistribution).reduce((sum, count) => sum + count, 0);

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (<div className="px-4 py-8"><SkeletonCard variant="content" count={1} /></div>);
  }

  // ── No flashcards ─────────────────────────────────────────────────
  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4"><CreditCard size={28} className="text-gray-400" /></div>
        <h3 className="font-bold text-gray-800 mb-1">Sin flashcards</h3>
        <p className="text-sm text-gray-500 max-w-md">Este resumen aun no tiene flashcards activas para revisar.</p>
        {onClose && (<button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Volver</button>)}
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: IDLE — Show card count + start
  // ══════════════════════════════════════════
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className={`w-20 h-20 rounded-2xl ${gradients.tealIconBg.tw} border border-[#2a8c7a]/20 flex items-center justify-center mb-6`}><CreditCard size={36} className="text-[#2a8c7a]" /></div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Revision de Flashcards</h3>
        <p className="text-sm text-gray-500 max-w-md mb-1">{totalCards} flashcard{totalCards !== 1 ? 's' : ''} disponible{totalCards !== 1 ? 's' : ''} para revisar</p>
        <p className="text-xs text-gray-400 mb-8">Voltea cada tarjeta y califica que tan bien recordaste la respuesta</p>
        <button onClick={startReview} className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#1B3B36] text-white font-semibold hover:bg-[#244e47] transition-all shadow-lg shadow-[#1B3B36]/20"><Play size={18} />Iniciar revision</button>
        {onClose && (<button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">Cancelar</button>)}
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: REVIEWING — Flip cards + grade
  // ══════════════════════════════════════════
  if (phase === 'reviewing' && currentCard) {
    const progressPercent = (reviewedCount / totalCards) * 100;
    return (
      <div className="flex flex-col h-full min-h-0 bg-[#F0F2F5] relative">
        <XPPopup event={xpState.lastEvent} eventKey={xpEventKey} />
        <div className="shrink-0 px-5 py-3 flex items-center justify-between">
          <button onClick={() => { if (confirm('Salir de la revision? El progreso se perdera.')) { restartReview(); onClose?.(); } }} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all"><X size={20} /></button>
          <div className="flex items-center gap-3">
            <ComboIndicator comboCount={xpState.comboCount} />
            <span className="text-sm font-semibold text-gray-700">{reviewedCount + 1}/{totalCards}</span>
          </div>
          <div className="flex items-center gap-2">
            {xpState.loaded && <LevelProgressBar totalXP={xpState.baselineXP + xpState.totalSessionXP} currentLevel={xpState.currentLevel} compact />}
            <ReportContentButton contentType="flashcard" contentId={currentCard.id} />
          </div>
        </div>
        <div className="shrink-0 px-5 pb-4">
          {currentCard && keywordPriorityMap.get(currentCard.keyword_id) != null && (
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20" style={{ fontWeight: 600 }}><Stethoscope size={10} />Prioridad clinica: {Math.round((keywordPriorityMap.get(currentCard.keyword_id) || 0) * 100)}%</span>
            </div>
          )}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div className={`h-full ${gradients.progress.tw} rounded-full`} initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentCard.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="w-full">
              <FlashcardCard front={currentCard.front} back={currentCard.back} frontImageUrl={currentCard.front_image_url} backImageUrl={currentCard.back_image_url} keywordName={keywordMap.get(currentCard.keyword_id) || null} isFlipped={isFlipped} onFlip={() => { if (!isFlipped) setIsFlipped(true); }} onImageZoom={(url) => setZoomImageUrl(url)} onClozeComplete={() => { setClozeReady(true); setIsFlipped(true); }} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="shrink-0 px-5 pb-6 pt-4">
          <AnimatePresence>
            {isFlipped && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.2 }} className="flex items-center justify-center gap-3">
                {RATINGS.map((g) => (<button key={g.value} onClick={() => handleGrade(g.value)} className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-white font-semibold transition-all ${g.color} ${g.hover} shadow-lg`}><span className="text-sm">{g.label}</span><span className="text-[10px] opacity-70">{g.value}</span></button>))}
              </motion.div>
            )}
          </AnimatePresence>
          {!isFlipped && (<div className="text-center"><p className="text-xs text-gray-400">Toca la tarjeta o presiona espacio para ver la respuesta</p></div>)}
        </div>
        <FlashcardImageZoom imageUrl={zoomImageUrl} onClose={() => setZoomImageUrl(null)} />
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: FINISHED — Summary screen
  // ══════════════════════════════════════════
  if (phase === 'finished') {
    const durationSeconds = sessionStartRef.current ? Math.round((new Date().getTime() - sessionStartRef.current.getTime()) / 1000) : 0;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const maxGradeCount = Math.max(...gradeDistribution, 1);

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#F0F2F5] min-h-full">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }} className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center mb-6"><Trophy size={36} className="text-amber-400" /></motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-2xl font-bold text-gray-900 mb-2">Revision completada!</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm text-gray-500 mb-8">Revisaste {totalCards} flashcard{totalCards !== 1 ? 's' : ''} en {minutes > 0 ? `${minutes}m ` : ''}{seconds}s</motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-[#2a8c7a]">{totalCards}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Revisadas</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-emerald-500">{correctPercentage}%</p><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Correctas</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-amber-500">{minutes > 0 ? `${minutes}m` : `${seconds}s`}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Tiempo</p></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full max-w-sm bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-4"><BarChart3 size={14} className="text-gray-400" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distribucion de calidad</span></div>
          <div className="space-y-2.5">
            {RATINGS.map((g, idx) => (<div key={g.value} className="flex items-center gap-3"><span className="text-xs text-gray-500 w-16 shrink-0">{g.label}</span><div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden"><motion.div className={`h-full rounded-full ${g.color}`} initial={{ width: 0 }} animate={{ width: `${(gradeDistribution[idx] / maxGradeCount) * 100}%` }} transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }} /></div><span className="text-xs font-semibold text-gray-700 w-6 text-right">{gradeDistribution[idx]}</span></div>))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="w-full max-w-sm bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-4"><BarChart3 size={14} className="text-gray-400" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Por tipo de tarjeta</span></div>
          <div className="space-y-2.5">
            {([{ type: 'text' as CardType, label: 'Texto', color: 'bg-[#2a8c7a]', icon: <Type size={12} /> }, { type: 'text_image' as CardType, label: 'Txt\u2192Img', color: 'bg-[#0d9488]', icon: <Type size={12} /> }, { type: 'image_text' as CardType, label: 'Img\u2192Txt', color: 'bg-sky-500', icon: <ImageIcon size={12} /> }, { type: 'image_image' as CardType, label: 'Img\u2192Img', color: 'bg-[#1B3B36]', icon: <ImageIcon size={12} /> }, { type: 'text_both' as CardType, label: 'Mixto', color: 'bg-[#2dd4a8]', icon: <Type size={12} /> }, { type: 'cloze' as CardType, label: 'Cloze', color: 'bg-[#5cbdaa]', icon: <TextCursorInput size={12} /> }]).filter(item => cardTypeDistribution[item.type] > 0).map((item, idx) => { const count = cardTypeDistribution[item.type]; return (<div key={item.type} className="flex items-center gap-3"><span className="text-xs text-gray-500 w-16 shrink-0 flex items-center gap-1">{item.icon}{item.label}</span><div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden"><motion.div className={`h-full rounded-full ${item.color}`} initial={{ width: 0 }} animate={{ width: `${(count / Math.max(totalCardTypes, 1)) * 100}%` }} transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }} /></div><span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span></div>); })}
          </div>
        </motion.div>

        {xpState.loaded && (<div className="mb-8"><SessionXPSummary state={xpState} actualXP={sessionXPResult?.actualXP} /></div>)}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center gap-3">
          <button onClick={restartReview} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all border border-gray-200"><RotateCcw size={16} />Repetir</button>
          {onClose && (<button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B3B36] text-white font-semibold hover:bg-[#244e47] transition-all">Continuar<ChevronRight size={16} /></button>)}
        </motion.div>
      </div>
    );
  }

  return null;
}

export default FlashcardReviewer;
