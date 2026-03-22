// ============================================================
// @deprecated — Phase 14: This file was replaced by:
//   /student/QuizResults.tsx (unified results with keyword grouping,
//   BKT notice, review button, and design-kit imports)
//
// QuizView.tsx now uses QuizTaker → QuizResults instead of this file.
// Keep in repo for historical reference.
// Delete on next code cleanup if no hidden consumers.
// ============================================================

// ============================================================
// Axon — Quiz Results Screen (extracted from QuizSession)
//
// Shows score circle, stats, performance message, and actions.
// ============================================================

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Trophy, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronLeft, RotateCw, Target,
} from 'lucide-react';

// ── Inlined from design-kit (file not in repo) ──────────

const focusRing = "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none";

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#10b981', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'][i % 6],
    delay: Math.random() * 0.5,
    size: 5 + Math.random() * 7,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: '-10px', width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 300, opacity: 0, rotate: 360 + Math.random() * 360, x: (Math.random() - 0.5) * 80 }}
          transition={{ duration: 1.5 + Math.random(), delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────

interface QuizResultsScreenProps {
  score: number;
  total: number;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  durationSec: number;
  onReview: () => void;
  onBack: () => void;
  onRestart: () => void;
}

// ── Component ────────────────────────────────────────────

export const QuizResultsScreen = React.memo(function QuizResultsScreen({
  score,
  total,
  correctCount,
  wrongCount,
  answeredCount,
  durationSec,
  onReview,
  onBack,
  onRestart,
}: QuizResultsScreenProps) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;

  const performanceColor = pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const performanceMsg = pct >= 80
    ? 'Excelente resultado!'
    : pct >= 60
    ? 'Buen trabajo, sigue practicando!'
    : pct >= 40
    ? 'Puedes mejorar. Revisa los temas debiles.'
    : 'Necesitas repasar este tema.';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-y-auto bg-zinc-50">
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-2xl">

          {/* Trophy + Title */}
          <div className="text-center mb-8 relative">
            {pct >= 70 && <Confetti show />}

            <motion.div
              className={clsx(
                'w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl',
                pct >= 70 ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/30' :
                pct >= 40 ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25' :
                'bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-500/25'
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <Trophy size={44} className="text-white" />
            </motion.div>
            <h2 className="text-[clamp(1.25rem,2.5vw,1.5rem)] text-zinc-900 mb-2" style={{ fontWeight: 700 }}>
              {pct >= 80 ? 'Excelente!' : pct >= 60 ? 'Buen trabajo!' : 'Quiz completado'}
            </h2>
            <p className="text-sm text-zinc-500 mb-1">Quiz completado</p>
            <p className="text-sm text-zinc-400 flex items-center justify-center gap-2">
              <Clock size={14} /> {minutes}m {seconds}s
            </p>
          </div>

          {/* Score Circle */}
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative w-48 h-48"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="84" stroke="#e4e4e7" strokeWidth="12" fill="none" />
                <motion.circle
                  cx="96" cy="96" r="84"
                  stroke={performanceColor}
                  strokeWidth="12" fill="none" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 84}
                  initial={{ strokeDashoffset: 2 * Math.PI * 84 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 84 * (1 - pct / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-[clamp(1.75rem,3.5vw,2.25rem)] text-zinc-900"
                  style={{ fontWeight: 700 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  {pct.toFixed(0)}%
                </motion.span>
                <span className="text-xs text-zinc-400 uppercase tracking-wider mt-1" style={{ fontWeight: 700 }}>
                  {score}/{total}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Summary Stats */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm" style={{ fontWeight: 600 }}>
              <CheckCircle2 size={16} /> {correctCount} correctas
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-500 text-sm" style={{ fontWeight: 600 }}>
              <XCircle size={16} /> {wrongCount} incorrectas
            </div>
            {answeredCount < total && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-400 text-sm" style={{ fontWeight: 600 }}>
                <AlertCircle size={16} /> {total - answeredCount} sin respuesta
              </div>
            )}
          </motion.div>
          <p className="text-center text-sm text-zinc-500 mb-8">{performanceMsg}</p>

          {/* Review button */}
          <button
            onClick={onReview}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 transition-colors mb-6 mx-auto px-4 py-2 rounded-xl hover:bg-teal-50"
            style={{ fontWeight: 600 }}
          >
            <Target size={14} />
            Revisar respuestas
          </button>

          {/* Action buttons */}
          <div className="flex gap-4 justify-center pt-4 pb-8">
            <motion.button
              onClick={onBack}
              className={`px-6 py-3 rounded-xl text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 bg-white hover:shadow-md transition-all ${focusRing}`}
              style={{ fontWeight: 700 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} />
                Volver
              </div>
            </motion.button>
            <motion.button
              onClick={onRestart}
              className={`px-8 py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/25 transition-all inline-flex items-center gap-3 ${focusRing}`}
              style={{ fontWeight: 700 }}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <RotateCw size={18} /> Repetir quiz
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});