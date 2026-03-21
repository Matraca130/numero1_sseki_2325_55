// ============================================================
// Axon — Student Quiz: Answer Detail List
//
// Extracted from QuizResults.tsx (P2-S02) to keep QuizResults
// under the 500-line Architecture Practices limit.
//
// Renders the expandable per-question answer review:
//   - Correct/incorrect icon + badges (type, difficulty, time)
//   - User answer vs correct answer comparison
//   - Explanation block for wrong answers
//   - "Practicar con IA" button per wrong answer
//   - AI Report button per question
//
// Design: matches QuizResults teal/emerald/rose color scheme.
// ============================================================

import React from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { SavedAnswer } from '@/app/components/student/quiz-types';
import {
  QUESTION_TYPE_LABELS_SHORT,
  DIFFICULTY_LABELS,
  normalizeDifficulty,
  normalizeQuestionType,
} from '@/app/services/quizConstants';
import type { Difficulty } from '@/app/services/quizConstants';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { CheckCircle2, XCircle, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { AiReportButton } from '@/app/components/shared/AiReportButton';

// ── Props ────────────────────────────────────────────────

interface QuizAnswerDetailProps {
  questions: QuizQuestion[];
  savedAnswers: Record<number, SavedAnswer>;
  keywordMap?: Record<string, string>;
  onPractice: (target: {
    summaryId: string;
    keywordId: string;
    keywordName: string;
    wrongAnswer: string;
    originalQuestion: string;
  }) => void;
}

// ── Component ────────────────────────────────────────────

export const QuizAnswerDetail = React.memo(function QuizAnswerDetail({
  questions,
  savedAnswers,
  keywordMap,
  onPractice,
}: QuizAnswerDetailProps) {
  return (
    <div className="space-y-3 mb-8">
      {questions.map((q, idx) => {
        const sa = savedAnswers[idx];
        const answered = sa?.answered;
        const correct = sa?.correct;
        const userAnswer = sa?.answer || '(sin respuesta)';
        const diffKey: Difficulty = normalizeDifficulty(q.difficulty);
        const questionTypeKey = normalizeQuestionType(q.question_type);

        return (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={clsx(
              'rounded-2xl border px-5 py-4 bg-white shadow-sm',
              answered && correct ? 'border-emerald-200' :
              answered && !correct ? 'border-rose-200' : 'border-zinc-200'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {answered && correct ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : answered && !correct ? (
                  <XCircle size={16} className="text-rose-500" />
                ) : (
                  <AlertCircle size={16} className="text-gray-300" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 600 }}>#{idx + 1}</span>
                  <span className="text-[9px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200" style={{ fontWeight: 600 }}>
                    {QUESTION_TYPE_LABELS_SHORT[questionTypeKey]}
                  </span>
                  <span className={clsx(
                    'text-[9px] px-1.5 py-0.5 rounded border',
                    diffKey === 'easy' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                    diffKey === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                    'text-red-600 bg-red-50 border-red-200'
                  )} style={{ fontWeight: 600 }}>
                    {DIFFICULTY_LABELS[diffKey]}
                  </span>
                  {sa?.timeTakenMs && (
                    <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                      <Clock size={9} /> {(sa.timeTakenMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p className="text-[12px] text-gray-800 mb-2" style={{ lineHeight: '1.5' }}>{q.question}</p>

                {/* Answer comparison */}
                {answered && (
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 w-[70px]" style={{ fontWeight: 600 }}>Tu resp:</span>
                      <span className={clsx('text-[11px]', correct ? 'text-emerald-700' : 'text-rose-600')} style={{ fontWeight: 500 }}>
                        {q.question_type === 'true_false' ? (userAnswer === 'true' ? 'Verdadero' : 'Falso') : userAnswer}
                      </span>
                    </div>
                    {!correct && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 w-[70px]" style={{ fontWeight: 600 }}>Correcta:</span>
                        <span className="text-[11px] text-emerald-700" style={{ fontWeight: 600 }}>
                          {q.question_type === 'true_false' ? (q.correct_answer === 'true' ? 'Verdadero' : 'Falso') : q.correct_answer}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && answered && !correct && (
                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700" style={{ lineHeight: '1.5' }}>
                    {q.explanation}
                  </div>
                )}

                {/* Practice with AI button */}
                {answered && !correct && q.summary_id && (
                  <button
                    onClick={() => onPractice({
                      summaryId: q.summary_id,
                      keywordId: q.keyword_id,
                      keywordName: keywordMap?.[q.keyword_id] || 'Concepto',
                      wrongAnswer: userAnswer,
                      originalQuestion: q.question,
                    })}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] text-teal-600 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    <Sparkles size={10} /> Practicar este error con IA
                  </button>
                )}

                {/* AI Report button */}
                <AiReportButton contentId={q.id} contentType="quiz_question" source={q.source} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
