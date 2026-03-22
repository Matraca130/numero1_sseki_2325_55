// ============================================================
// Axon — Professor: AI Generate Panel
//
// Modal panel for generating quiz questions via AI.
// Supports two modes:
//   1. MANUAL (POST /ai/generate): professor picks keyword → 1 question
//   2. BULK (POST /ai/pre-generate): fills coverage gaps → up to 5 questions
//
// P3-S02: Generation logic extracted to useAiGenerate hook.
//
// Design: teal accent overlay panel (not full modal — D5).
// ============================================================

import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, Wand2, X, Loader2, AlertTriangle,
  CheckCircle2, Zap, Hash,
} from 'lucide-react';
import { QuizErrorBoundary } from '@/app/components/shared/QuizErrorBoundary';
import type { KeywordRef } from '@/app/types/platform';
import { useAiGenerate } from '@/app/components/professor/useAiGenerate';

// ── Props ─────────────────────────────────────────────────

interface AiGeneratePanelProps {
  quizId: string;
  summaryId: string;
  keywords: KeywordRef[];
  onClose: () => void;
  onGenerated: () => void;
}

// ── Component ─────────────────────────────────────────────

export function AiGeneratePanel({
  quizId,
  summaryId,
  keywords,
  onClose,
  onGenerated,
}: AiGeneratePanelProps) {
  // P3-S02: All state + logic extracted to hook
  const gen = useAiGenerate(quizId, summaryId, keywords, onGenerated);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="mx-5 mt-3 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-lg shadow-teal-900/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-teal-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-[13px] text-teal-900" style={{ fontWeight: 700 }}>
              Generar con IA
            </h3>
            <p className="text-[10px] text-teal-400">
              Gemini genera preguntas basadas en el contenido del resumen
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={gen.isProcessing}
          className="p-1.5 rounded-lg text-teal-400 hover:text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-50"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            onClick={() => gen.setMode('manual')}
            disabled={gen.isProcessing}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] border transition-all ${
              gen.mode === 'manual'
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                : 'bg-white text-teal-600 border-teal-200 hover:border-teal-300'
            }`}
            style={{ fontWeight: 600 }}
          >
            <Wand2 size={13} />
            1 pregunta por keyword
          </button>
          <button
            onClick={() => gen.setMode('bulk')}
            disabled={gen.isProcessing}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] border transition-all ${
              gen.mode === 'bulk'
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                : 'bg-white text-teal-600 border-teal-200 hover:border-teal-300'
            }`}
            style={{ fontWeight: 600 }}
          >
            <Zap size={13} />
            Llenar quiz (bulk)
          </button>
        </div>

        {/* Mode-specific controls */}
        {gen.mode === 'manual' ? (
          <div>
            <label
              className="text-[10px] text-teal-500 uppercase tracking-wider mb-1 block"
              style={{ fontWeight: 700 }}
            >
              Keyword objetivo
            </label>
            <select
              value={gen.selectedKeywordId}
              onChange={e => gen.setSelectedKeywordId(e.target.value)}
              disabled={gen.isProcessing}
              className="w-full text-[12px] border border-teal-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-50"
            >
              {keywords.length === 0 && (
                <option value="">Sin keywords disponibles</option>
              )}
              {keywords.map(kw => (
                <option key={kw.id} value={kw.id}>
                  {kw.term || kw.name || kw.id.substring(0, 8)}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-teal-400 mt-1">
              Gemini usara el contenido del resumen + BKT + notas del profesor
              para generar la pregunta
            </p>
          </div>
        ) : (
          <div>
            <label
              className="text-[10px] text-teal-500 uppercase tracking-wider mb-1 block"
              style={{ fontWeight: 700 }}
            >
              Cantidad de preguntas
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-teal-200 rounded-xl overflow-hidden">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => gen.setCount(n)}
                    disabled={gen.isProcessing}
                    className={`w-9 h-9 flex items-center justify-center text-[12px] transition-all ${
                      gen.count === n
                        ? 'bg-teal-600 text-white'
                        : 'text-teal-600 hover:bg-teal-50'
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-teal-400">
                <Hash size={10} />
                <span>Prioriza keywords con menos cobertura AI</span>
              </div>
            </div>
            <p className="text-[10px] text-teal-400 mt-1">
              El backend selecciona los keywords con MENOS preguntas AI
              existentes y genera secuencialmente
            </p>
          </div>
        )}

        {/* Generation status */}
        {gen.genState.status !== 'idle' && (
          <div
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-[11px] ${
              gen.genState.status === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : gen.genState.status === 'done'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-teal-50 border-teal-200 text-teal-700'
            }`}
          >
            {gen.isProcessing && (
              <Loader2 size={14} className="animate-spin shrink-0 mt-0.5" />
            )}
            {gen.genState.status === 'error' && (
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            )}
            {gen.genState.status === 'done' && (
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            )}
            <div>
              <p style={{ fontWeight: 600 }}>{gen.genState.message}</p>
              {gen.genState.status === 'done' && gen.genState.generatedCount != null && (
                <p className="text-[10px] mt-0.5 opacity-80">
                  {gen.genState.generatedCount} generada{gen.genState.generatedCount !== 1 ? 's' : ''}
                  {gen.genState.failedCount
                    ? ` \u00b7 ${gen.genState.failedCount} fallida${gen.genState.failedCount !== 1 ? 's' : ''}`
                    : ''}
                </p>
              )}
              {gen.genState.errorDetail && (
                <p className="text-[10px] mt-0.5 opacity-80">
                  {gen.genState.errorDetail}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={gen.handleGenerate}
          disabled={
            gen.isProcessing ||
            (gen.mode === 'manual' && !gen.selectedKeywordId) ||
            keywords.length === 0
          }
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all shadow-lg shadow-teal-600/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          style={{ fontWeight: 600 }}
        >
          {gen.isProcessing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              {gen.mode === 'manual'
                ? 'Generar 1 pregunta'
                : `Generar ${gen.count} pregunta${gen.count !== 1 ? 's' : ''}`}
            </>
          )}
        </button>

        {/* Keywords info */}
        {keywords.length === 0 && (
          <p className="text-[10px] text-amber-600 text-center">
            Este resumen no tiene keywords. Agrega keywords primero para
            poder generar preguntas con IA.
          </p>
        )}
      </div>
    </motion.div>
  );
}