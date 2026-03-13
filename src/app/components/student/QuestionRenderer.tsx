// ============================================================
// Axon — Student Quiz: QuestionRenderer
//
// Renders the question content (type badge, question text,
// and answer UI) for all question_type variants:
//   mcq | true_false | fill_blank | open
//
// Extracted from QuizTaker in Phase 3 refactor.
// M-3: Per-type renderers extracted to renderers/ directory.
// Q-A11Y: Added aria-live feedback, semantic heading, question landmark
// ============================================================

import React from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import { QUESTION_TYPE_LABELS } from '@/app/services/quizConstants';
import { McqRenderer } from '@/app/components/student/renderers/McqRenderer';
import { TrueFalseRenderer } from '@/app/components/student/renderers/TrueFalseRenderer';
import { OpenRenderer } from '@/app/components/student/renderers/OpenRenderer';

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
    <section
      aria-label={`Pregunta ${questionIndex + 1}`}
      aria-roledescription="pregunta de quiz"
    >
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
        <h3 className="text-lg text-gray-800" id={`question-${questionIndex}`} style={{ lineHeight: '1.6' }}>{question.question}</h3>
      </div>

      {/* ── MCQ Options ── */}
      {question.question_type === 'mcq' && question.options && (
        <McqRenderer
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
        <TrueFalseRenderer
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
        <OpenRenderer
          questionType={question.question_type}
          correctAnswer={question.correct_answer}
          explanation={question.explanation}
          textAnswer={textAnswer}
          showResult={showResult}
          isCorrectResult={isCorrectResult}
          isReviewing={isReviewing}
          onChangeText={onChangeText}
          onSubmitText={onSubmitText}
          questionIndex={questionIndex}
        />
      )}

      {/* Q-A11Y: Screen reader live region for answer feedback */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {showResult && (isCorrectResult ? 'Respuesta correcta' : 'Respuesta incorrecta')}
      </div>
    </section>
  );
});
