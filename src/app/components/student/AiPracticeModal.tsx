// ============================================================
// Axon — Student: AI Practice Modal
//
// Shown when a student clicks "Practicar este error con IA"
// on a wrong answer in QuizResults.
//
// Flow:
//   1. Student clicks button → modal opens with loading state
//   2. Calls aiGenerate({ action: 'quiz_question', summary_id, keyword_id, wrong_answer })
//   3. Backend generates a question targeting the specific misconception
//   4. Modal shows the generated question for self-practice
//   5. Student can reveal the answer → sees correct_answer + explanation
//
// DECISION LOG:
//   D1: Self-practice only — does NOT record attempts/reviews/BKT.
//   D2: No answer validation — the student reveals the answer manually.
//   D3: Show the wrong_answer that triggered the generation.
//   D4: Modal (not inline) because the results page is already dense.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, X, Loader2, AlertTriangle,
  Eye, EyeOff, BookOpen,
} from 'lucide-react';
import { logger } from '@/app/lib/logger';
import * as aiApi from '@/app/services/aiApi';

// ── Props ─────────────────────────────────────────────────

interface AiPracticeModalProps {
  summaryId: string;
  keywordId: string;
  keywordName: string;
  wrongAnswer: string;
  originalQuestion: string;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────

export function AiPracticeModal({
  summaryId,
  keywordId,
  keywordName,
  wrongAnswer,
  originalQuestion,
  onClose,
}: AiPracticeModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestion, setGeneratedQuestion] = useState<string>('');
  const [generatedAnswer, setGeneratedAnswer] = useState<string>('');
  const [generatedExplanation, setGeneratedExplanation] = useState<string>('');
  const [generatedOptions, setGeneratedOptions] = useState<string[] | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // ── Generate on mount ───────────────────────────────────
  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.aiGenerate({
        action: 'quiz_question',
        summary_id: summaryId,
        keyword_id: keywordId,
        wrong_answer: wrongAnswer,
      });

      if (aiApi.isAiQuizResult(result)) {
        setGeneratedQuestion(result.question);
        setGeneratedAnswer(result.correct_answer);
        setGeneratedExplanation(result.explanation || '');
        setGeneratedOptions(result.options || null);
      } else {
        setError('El backend devolvio un tipo inesperado (flashcard en vez de quiz).');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('[AiPracticeModal] Generation failed:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [summaryId, keywordId, wrongAnswer]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-[13px] text-violet-900" style={{ fontWeight: 700 }}>
                Practica con IA
              </h3>
              <p className="text-[10px] text-violet-400">
                Pregunta generada para reforzar: {keywordName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-violet-400 hover:text-violet-600 hover:bg-violet-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {/* Context: what you got wrong */}
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
            <p className="text-[10px] text-rose-500 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>
              Tu error anterior
            </p>
            <p className="text-[11px] text-rose-700 mb-1" style={{ lineHeight: '1.5' }}>
              Pregunta: {originalQuestion}
            </p>
            <p className="text-[11px] text-rose-600">
              Tu respuesta: <span style={{ fontWeight: 600 }}>{wrongAnswer}</span>
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={24} className="animate-spin text-violet-500" />
              <p className="text-[12px] text-violet-500">
                Gemini esta generando una pregunta de practica...
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 mb-4">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px]" style={{ fontWeight: 600 }}>Error al generar</p>
                <p className="text-[11px] mt-0.5 opacity-80">{error}</p>
              </div>
            </div>
          )}

          {/* Generated question */}
          {!loading && !error && generatedQuestion && (
            <div className="space-y-4">
              {/* Question */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen size={12} className="text-violet-500" />
                  <p className="text-[10px] text-violet-500 uppercase tracking-wider" style={{ fontWeight: 700 }}>
                    Pregunta de practica
                  </p>
                </div>
                <p className="text-[13px] text-gray-800" style={{ lineHeight: '1.6' }}>
                  {generatedQuestion}
                </p>
              </div>

              {/* Options (if MCQ) */}
              {generatedOptions && generatedOptions.length > 0 && (
                <div className="space-y-1.5">
                  {generatedOptions.map((opt, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-lg border text-[12px] transition-all ${
                        showAnswer && opt === generatedAnswer
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-[#F0F2F5] border-gray-200 text-gray-600'
                      }`}
                      style={{ fontWeight: showAnswer && opt === generatedAnswer ? 600 : 400 }}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              )}

              {/* Reveal button */}
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="flex items-center gap-2 text-[12px] text-violet-600 hover:text-violet-800 transition-colors mx-auto px-4 py-2 rounded-xl hover:bg-violet-50"
                style={{ fontWeight: 600 }}
              >
                {showAnswer ? <EyeOff size={14} /> : <Eye size={14} />}
                {showAnswer ? 'Ocultar respuesta' : 'Revelar respuesta'}
              </button>

              {/* Answer + Explanation */}
              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden space-y-2"
                >
                  <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>
                      Respuesta correcta
                    </p>
                    <p className="text-[12px] text-emerald-700" style={{ fontWeight: 600 }}>
                      {generatedAnswer}
                    </p>
                  </div>
                  {generatedExplanation && (
                    <div className="px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>
                        Explicacion
                      </p>
                      <p className="text-[12px] text-blue-700" style={{ lineHeight: '1.5' }}>
                        {generatedExplanation}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Retry button on error */}
          {error && !loading && (
            <button
              onClick={generate}
              className="flex items-center gap-2 text-[12px] text-violet-600 hover:text-violet-800 transition-colors mx-auto px-4 py-2 rounded-xl hover:bg-violet-50"
              style={{ fontWeight: 600 }}
            >
              <Sparkles size={14} />
              Reintentar
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-[#F0F2F5]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            style={{ fontWeight: 600 }}
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
