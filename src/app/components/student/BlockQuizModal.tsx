// ============================================================
// Axon — Student: BlockQuizModal
//
// Lightweight quiz modal scoped to a single content block.
// Shows one multiple-choice question at a time with immediate
// feedback (correct/incorrect + explanation).
//
// Uses mock questions until the backend endpoint exists.
// Design: teal accent, Georgia headings, Inter body, pill buttons.
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, X, Check, ChevronRight } from 'lucide-react';
import {
  MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER,
  FEEDBACK, BTN_CLOSE,
} from '@/app/services/quizDesignTokens';

// ── Types ────────────────────────────────────────────────

interface MockQuestion {
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

// ── Mock data ────────────────────────────────────────────

const MOCK_QUESTIONS: MockQuestion[] = [
  {
    text: '¿Cuál es la principal característica de la aterosclerosis?',
    options: [
      'Es una enfermedad exclusivamente genética',
      'Es un depósito pasivo de grasa en las arterias',
      'Es un proceso inflamatorio crónico de las arterias',
      'Afecta solo a las venas de gran calibre',
    ],
    correctIndex: 2,
    explanation:
      'La aterosclerosis es un proceso inflamatorio crónico activo, no un simple depósito de grasa.',
  },
  {
    text: '¿Qué tipo de células participan en la formación de la placa ateromatosa?',
    options: [
      'Exclusivamente eritrocitos',
      'Macrófagos y células musculares lisas',
      'Solo plaquetas',
      'Neuronas y astrocitos',
    ],
    correctIndex: 1,
    explanation:
      'Los macrófagos fagocitan lípidos (células espumosas) y las células musculares lisas migran para estabilizar la placa.',
  },
  {
    text: '¿Cuál es el principal factor de riesgo modificable para enfermedades cardiovasculares?',
    options: [
      'Edad avanzada',
      'Sexo masculino',
      'Hipertensión arterial',
      'Antecedentes familiares',
    ],
    correctIndex: 2,
    explanation:
      'La hipertensión arterial es el principal factor de riesgo modificable. Edad, sexo y antecedentes familiares no son modificables.',
  },
];

// ── Component ────────────────────────────────────────────

export function BlockQuizModal({
  blockId: _blockId,
  summaryId: _summaryId,
  isOpen,
  onClose,
}: BlockQuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const questions = MOCK_QUESTIONS;
  const question = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  const isCorrect = selected === question.correctIndex;
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
                <p className="text-[11px] text-zinc-400">
                  Pregunta {currentIndex + 1} de {questions.length}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className={BTN_CLOSE}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
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

            {/* Confirm button — shown when option selected but not confirmed */}
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
