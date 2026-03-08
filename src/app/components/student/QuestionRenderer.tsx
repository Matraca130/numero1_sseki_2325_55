// ============================================================
// Axon — Student Quiz: QuestionRenderer
//
// Renders the question content (type badge, question text,
// and answer UI) for all question_type variants:
//   mcq | true_false | fill_blank | open
//
// Extracted from QuizTaker in Phase 3 refactor.
// ============================================================

import React from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import { QUESTION_TYPE_LABELS } from '@/app/services/quizConstants';
import { CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { FeedbackBlock } from '@/app/components/student/FeedbackBlock';
import { LETTERS } from '@/app/lib/quiz-utils';

// ── Props ────────────────────────────────────────────────

export interface QuestionRendererProps {
  question: QuizQuestion;
  questionIndex: number;
  isReviewing: boolean;
  showResult: boolean;
  isCorrectResult: boolean;
  // MCQ
  selectedAnswer: string | null;
  onSelectOption: (option: string) => void;
  // True/False
  tfAnswer: string | null;
  onSelectTF: (val: string) => void;
  // Open / Fill Blank
  textAnswer: string;
  onChangeText: (text: string) => void;
  onSubmitText: () => void;
}

// ── Main Component ───────────────────────────────────────

export const QuestionRenderer = React.memo(function QuestionRenderer({
  question,
  questionIndex,
  isReviewing,
  showResult,
  isCorrectResult,
  selectedAnswer,
  onSelectOption,
  tfAnswer,
  onSelectTF,
  textAnswer,
  onChangeText,
  onSubmitText,
}: QuestionRendererProps) {
  return (
    <>
      {/* Type badge */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded-full border text-teal-700 bg-teal-50 border-teal-200" style={{ fontWeight: 600 }}>
          {QUESTION_TYPE_LABELS[question.question_type]}
        </span>
        {isReviewing && (
          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200" style={{ fontWeight: 600 }}>
            Respondida
          </span>
        )}
      </div>

      {/* Question text */}
      <div className="flex gap-4 mb-8">
        <span className="text-gray-400 text-lg shrink-0" style={{ fontWeight: 600 }}>{questionIndex + 1}.</span>
        <h3 className="text-lg text-gray-800" style={{ lineHeight: '1.6' }}>{question.question}</h3>
      </div>

      {/* ── MCQ Options ── */}
      {question.question_type === 'mcq' && question.options && (
        <MCQOptions
          options={question.options}
          correctAnswer={question.correct_answer}
          explanation={question.explanation}
          selectedAnswer={selectedAnswer}
          showResult={showResult}
          isReviewing={isReviewing}
          onSelectOption={onSelectOption}
        />
      )}

      {/* ── True/False ── */}
      {question.question_type === 'true_false' && (
        <TrueFalseOptions
          correctAnswer={question.correct_answer}
          explanation={question.explanation}
          tfAnswer={tfAnswer}
          showResult={showResult}
          isReviewing={isReviewing}
          onSelectTF={onSelectTF}
        />
      )}

      {/* ── Open / Fill Blank ── */}
      {(question.question_type === 'open' || question.question_type === 'fill_blank') && (
        <OpenInput
          questionType={question.question_type}
          correctAnswer={question.correct_answer}
          explanation={question.explanation}
          textAnswer={textAnswer}
          showResult={showResult}
          isCorrectResult={isCorrectResult}
          isReviewing={isReviewing}
          onChangeText={onChangeText}
          onSubmitText={onSubmitText}
        />
      )}
    </>
  );
});

// ── MCQ Options ──────────────────────────────────────────

interface MCQOptionsProps {
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  selectedAnswer: string | null;
  showResult: boolean;
  isReviewing: boolean;
  onSelectOption: (option: string) => void;
}

function MCQOptions({
  options,
  correctAnswer,
  explanation,
  selectedAnswer,
  showResult,
  isReviewing,
  onSelectOption,
}: MCQOptionsProps) {
  return (
    <div className="space-y-3 mb-6" role="radiogroup" aria-label="Opciones de respuesta">
      {options.map((option, oi) => {
        const isSelected = selectedAnswer === option;
        const isCorrectOption = option === correctAnswer;
        const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
        const wasCorrect = showResult && isCorrectOption;

        return (
          <button
            key={oi}
            onClick={() => !isReviewing && onSelectOption(option)}
            disabled={isReviewing}
            role="radio"
            aria-checked={isSelected}
            aria-label={`Opcion ${LETTERS[oi]}: ${option}`}
            className={clsx(
              'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
              !showResult && !isSelected && 'border-gray-200 hover:border-gray-300 bg-white',
              !showResult && isSelected && 'border-teal-500 bg-teal-50/30',
              wasCorrect && 'border-emerald-400 bg-emerald-50',
              wasSelectedWrong && 'border-rose-300 bg-rose-50',
              showResult && !isCorrectOption && !isSelected && 'border-gray-200 bg-white opacity-50'
            )}
          >
            <div className="px-5 py-4 flex items-start gap-3">
              <span className={clsx(
                'text-sm shrink-0 mt-0.5',
                wasCorrect ? 'text-emerald-600' : wasSelectedWrong ? 'text-rose-500' : isSelected ? 'text-teal-600' : 'text-gray-400'
              )} style={{ fontWeight: 600 }}>
                {LETTERS[oi]}.
              </span>
              <span className={clsx(
                'text-sm',
                wasCorrect ? 'text-gray-800' : wasSelectedWrong ? 'text-gray-700' : isSelected ? 'text-gray-800' : 'text-gray-600'
              )}>
                {option}
              </span>
            </div>

            {wasSelectedWrong && (
              <FeedbackBlock correct={false} explanation={explanation} correctAnswer={correctAnswer} />
            )}
            {wasCorrect && showResult && (
              <FeedbackBlock correct={true} explanation={explanation} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── True/False Options ───────────────────────────────────

interface TrueFalseOptionsProps {
  correctAnswer: string;
  explanation?: string | null;
  tfAnswer: string | null;
  showResult: boolean;
  isReviewing: boolean;
  onSelectTF: (val: string) => void;
}

function TrueFalseOptions({
  correctAnswer,
  explanation,
  tfAnswer,
  showResult,
  isReviewing,
  onSelectTF,
}: TrueFalseOptionsProps) {
  return (
    <div className="space-y-3 mb-6" role="radiogroup" aria-label="Verdadero o Falso">
      {['true', 'false'].map(val => {
        const label = val === 'true' ? 'Verdadero' : 'Falso';
        const icon = val === 'true' ? <CheckCircle2 size={20} /> : <XCircle size={20} />;
        const isSelected = tfAnswer === val;
        const isCorrectOption = val === correctAnswer;
        const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
        const wasCorrect = showResult && isCorrectOption;

        return (
          <button
            key={val}
            onClick={() => !isReviewing && onSelectTF(val)}
            disabled={isReviewing}
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            className={clsx(
              'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
              !showResult && !isSelected && 'border-gray-200 hover:border-gray-300 bg-white',
              !showResult && isSelected && 'border-teal-500 bg-teal-50/30',
              wasCorrect && 'border-emerald-400 bg-emerald-50',
              wasSelectedWrong && 'border-rose-300 bg-rose-50',
              showResult && !isCorrectOption && !isSelected && 'border-gray-200 bg-white opacity-50'
            )}
          >
            <div className="px-5 py-4 flex items-center gap-3">
              <span className={clsx(
                'shrink-0',
                wasCorrect ? 'text-emerald-600' : wasSelectedWrong ? 'text-rose-500' : isSelected ? 'text-teal-600' : 'text-gray-400'
              )}>
                {icon}
              </span>
              <span className={clsx(
                'text-base',
                wasCorrect ? 'text-gray-800' : wasSelectedWrong ? 'text-gray-700' : isSelected ? 'text-gray-800' : 'text-gray-600'
              )} style={{ fontWeight: 600 }}>
                {label}
              </span>
            </div>
            {wasSelectedWrong && explanation && (
              <FeedbackBlock correct={false} explanation={explanation} />
            )}
            {wasCorrect && showResult && explanation && (
              <FeedbackBlock correct={true} explanation={explanation} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Open / Fill Blank Input ──────────────────────────────

interface OpenInputProps {
  questionType: 'open' | 'fill_blank';
  correctAnswer: string;
  explanation?: string | null;
  textAnswer: string;
  showResult: boolean;
  isCorrectResult: boolean;
  isReviewing: boolean;
  onChangeText: (text: string) => void;
  onSubmitText: () => void;
}

function OpenInput({
  questionType,
  correctAnswer,
  explanation,
  textAnswer,
  showResult,
  isCorrectResult,
  isReviewing,
  onChangeText,
  onSubmitText,
}: OpenInputProps) {
  return (
    <div className="mb-6">
      <div className={clsx(
        'rounded-xl border-2 overflow-hidden transition-all',
        showResult && isCorrectResult && 'border-emerald-400 bg-emerald-50',
        showResult && !isCorrectResult && 'border-rose-300 bg-rose-50',
        !showResult && 'border-gray-200 bg-white'
      )}>
        <textarea
          value={textAnswer}
          onChange={e => onChangeText(e.target.value)}
          disabled={isReviewing}
          placeholder={questionType === 'fill_blank' ? 'Completa el espacio...' : 'Escribe tu respuesta...'}
          className="w-full px-5 py-4 text-sm text-gray-800 bg-transparent resize-none outline-none placeholder:text-gray-400 min-h-[100px]"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isReviewing) {
              e.preventDefault();
              onSubmitText();
            }
          }}
        />
        {showResult && (
          <div className="px-5 pb-4">
            {isCorrectResult ? (
              <FeedbackBlock correct={true} explanation={explanation} />
            ) : (
              <FeedbackBlock correct={false} explanation={explanation} correctAnswer={correctAnswer} inline />
            )}
          </div>
        )}
      </div>
    </div>
  );
}