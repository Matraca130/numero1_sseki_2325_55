// ============================================================
// Axon — Student: BlockQuizModal
//
// Lightweight quiz modal scoped to a single content block.
// Shows one multiple-choice question at a time with immediate
// feedback (correct/incorrect + explanation).
//
// Calls POST /ai/generate with type: 'quiz' to fetch real
// questions. Falls back to MOCK_QUESTIONS if the API fails.
// Design: teal accent, Georgia headings, Inter body, pill buttons.
// ============================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, X, Check, ChevronRight, Loader2 } from 'lucide-react';
import { apiCall } from '@/app/lib/api';

// ── Design tokens (inlined from design system) ──────────────

const MODAL_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm';

const MODAL_CARD =
  'bg-white rounded-2xl shadow-2xl border border-gray-200';

const MODAL_HEADER =
  'flex items-center justify-between px-6 py-4 border-b border-gray-100';

const BTN_CLOSE =
  'p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors';

const FEEDBACK = {
  correct: {
    border: 'border-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    textBold: 'text-emerald-700',
  },
  incorrect: {
    border: 'border-rose-300',
    bg: 'bg-rose-50',
    text: 'text-rose-500',
    textBold: 'text-rose-600',
  },
} as const;

// ── Types ────────────────────────────────────────────────

interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface BlockQuizModalProps {
  blockId: string;
  summaryId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ── Mock data (fallback) ────────────────────────────────

const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    text: '¿Cual es la principal caracteristica de la aterosclerosis?',
    options: [
      'Es una enfermedad exclusivamente genetica',
      'Es un deposito pasivo de grasa en las arterias',
      'Es un proceso inflamatorio cronico de las arterias',
      'Afecta solo a las venas de gran calibre',
    ],
    correctIndex: 2,
    explanation:
      'La aterosclerosis es un proceso inflamatorio cronico activo, no un simple deposito de grasa.',
  },
  {
    text: '¿Que tipo de celulas participan en la formacion de la placa ateromatosa?',
    options: [
      'Exclusivamente eritrocitos',
      'Macrofagos y celulas musculares lisas',
      'Solo plaquetas',
      'Neuronas y astrocitos',
    ],
    correctIndex: 1,
    explanation:
      'Los macrofagos fagocitan lipidos (celulas espumosas) y las celulas musculares lisas migran para estabilizar la placa.',
  },
  {
    text: '¿Cual es el principal factor de riesgo modificable para enfermedades cardiovasculares?',
    options: [
      'Edad avanzada',
      'Sexo masculino',
      'Hipertension arterial',
      'Antecedentes familiares',
    ],
    correctIndex: 2,
    explanation:
      'La hipertension arterial es el principal factor de riesgo modificable. Edad, sexo y antecedentes familiares no son modificables.',
  },
];

// ── Helpers ─────────────────────────────────────────────

function parseApiQuestions(data: any): QuizQuestion[] | null {
  try {
    // The AI generate endpoint returns different shapes; try common ones
    const items = data?.questions ?? data?.items ?? data?.quiz ?? (Array.isArray(data) ? data : null);
    if (!Array.isArray(items) || items.length === 0) return null;

    return items.map((q: any) => ({
      text: q.text || q.question || '',
      options: q.options || q.choices || [],
      correctIndex: typeof q.correctIndex === 'number'
        ? q.correctIndex
        : typeof q.correct_index === 'number'
          ? q.correct_index
          : (q.options || q.choices || []).indexOf(q.correct_answer ?? ''),
      explanation: q.explanation || q.rationale || '',
    })).filter((q: QuizQuestion) => q.text && q.options.length >= 2);
  } catch {
    return null;
  }
}

// ── Component ────────────────────────────────────────────

export function BlockQuizModal({
  blockId,
  summaryId,
  isOpen,
  onClose,
}: BlockQuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);

  // Fetch quiz from AI when modal opens with a new blockId
  useEffect(() => {
    if (!isOpen || !blockId || !summaryId) return;
    const key = `${summaryId}-${blockId}`;
    if (fetchedFor === key) return; // Already fetched for this block

    let cancelled = false;
    setLoading(true);
    setFetchedFor(key);

    apiCall('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ summary_id: summaryId, block_id: blockId, type: 'quiz' }),
      timeoutMs: 30_000,
    })
      .then((result: any) => {
        if (cancelled) return;
        const parsed = parseApiQuestions(result);
        if (parsed && parsed.length > 0) {
          setQuestions(parsed);
        } else {
          // API returned but data wasn't parseable — use mocks
          setQuestions(MOCK_QUESTIONS);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // API failed — fallback to mock questions
        setQuestions(MOCK_QUESTIONS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, blockId, summaryId, fetchedFor]);

  const question = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  const isCorrect = selected === question?.correctIndex;
  const isLastQuestion = currentIndex >= questions.length - 1;

  const handleConfirm = useCallback(() => {
    if (selected === null) return;
    setAnswered(true);
  }, [selected]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      onClose();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelected(null);
    setAnswered(false);
  }, [isLastQuestion, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // Reset state when modal reopens
  const handleClose = useCallback(() => {
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setFetchedFor(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const optionLetter = (i: number) => String.fromCharCode(65 + i);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`${MODAL_OVERLAY} p-4`}
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`${MODAL_CARD} w-full max-w-lg overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={MODAL_HEADER}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Brain size={18} className="text-teal-500" />
              </div>
              <div>
                <h3
                  className="text-zinc-900"
                  style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700 }}
                >
                  Quiz del Bloque
                </h3>
                {!loading && (
                  <p className="text-[11px] text-zinc-400">
                    Pregunta {currentIndex + 1} de {questions.length}
                  </p>
                )}
              </div>
            </div>
            <button onClick={handleClose} className={BTN_CLOSE}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Loading state */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={28} className="text-teal-500 animate-spin" />
                <p className="text-zinc-500 font-sans" style={{ fontSize: 13 }}>
                  Generando preguntas...
                </p>
              </div>
            ) : question ? (
              <>
                {/* Question text */}
                <p
                  className="text-zinc-800 font-sans"
                  style={{ fontSize: 14, lineHeight: 1.65 }}
                >
                  {question.text}
                </p>

                {/* Options */}
                <div className="flex flex-col gap-2">
                  {question.options.map((opt, i) => {
                    const isSelected = i === selected;
                    const isCorrectOption = i === question.correctIndex;

                    let borderClass = 'border-zinc-200';
                    let bgClass = 'bg-white';
                    let textClass = 'text-zinc-700';
                    let letterBg = 'bg-transparent';
                    let letterBorder = 'border-zinc-300';
                    let letterText = 'text-zinc-500';

                    if (answered) {
                      if (isCorrectOption) {
                        borderClass = FEEDBACK.correct.border;
                        bgClass = FEEDBACK.correct.bg;
                        textClass = FEEDBACK.correct.text;
                        letterBg = 'bg-emerald-500';
                        letterBorder = 'border-emerald-500';
                        letterText = 'text-white';
                      } else if (isSelected) {
                        borderClass = FEEDBACK.incorrect.border;
                        bgClass = FEEDBACK.incorrect.bg;
                        textClass = FEEDBACK.incorrect.text;
                        letterBg = 'bg-rose-500';
                        letterBorder = 'border-rose-500';
                        letterText = 'text-white';
                      }
                    } else if (isSelected) {
                      borderClass = 'border-teal-400';
                      bgClass = 'bg-teal-50';
                      textClass = 'text-teal-700';
                      letterBorder = 'border-teal-400';
                      letterText = 'text-teal-600';
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => { if (!answered) setSelected(i); }}
                        disabled={answered}
                        className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl ${borderClass} ${bgClass} text-left transition-all ${answered ? 'cursor-default' : 'cursor-pointer hover:border-teal-300'}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-full border-2 ${letterBorder} ${letterBg} ${letterText} flex items-center justify-center shrink-0`}
                          style={{ fontSize: 12, fontWeight: 700 }}
                        >
                          {answered && isCorrectOption ? (
                            <Check size={14} />
                          ) : answered && isSelected ? (
                            <X size={14} />
                          ) : (
                            optionLetter(i)
                          )}
                        </span>
                        <span className={`${textClass} font-sans`} style={{ fontSize: 13 }}>
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Confirm button */}
                {!answered && selected !== null && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleConfirm}
                    className="w-full py-3 rounded-full text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                    style={{ fontSize: 14, fontWeight: 700 }}
                  >
                    Confirmar Respuesta
                  </motion.button>
                )}

                {/* Feedback after answering */}
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border ${isCorrect ? `${FEEDBACK.correct.bg} ${FEEDBACK.correct.border}` : `${FEEDBACK.incorrect.bg} ${FEEDBACK.incorrect.border}`}`}
                  >
                    <p
                      className={isCorrect ? FEEDBACK.correct.textBold : FEEDBACK.incorrect.textBold}
                      style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                    >
                      {isCorrect ? '¡Correcto!' : 'Incorrecto'}
                    </p>
                    <p className="text-zinc-600 font-sans" style={{ fontSize: 12, lineHeight: 1.5 }}>
                      {question.explanation}
                    </p>
                  </motion.div>
                )}

                {/* Next / Close button after feedback */}
                {answered && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleNext}
                    className="w-full py-3 rounded-full text-white bg-teal-600 hover:bg-teal-700 transition-colors inline-flex items-center justify-center gap-2"
                    style={{ fontSize: 14, fontWeight: 700 }}
                  >
                    {isLastQuestion ? 'Cerrar' : (
                      <>
                        Siguiente
                        <ChevronRight size={16} />
                      </>
                    )}
                  </motion.button>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
