// ============================================================
// Axon — useQuestionForm Hook
//
// Encapsulates all form state, validation, effects, option
// management, and submit logic for the QuestionFormModal.
//
// Extracted from QuestionFormModal in Phase 5 refactor.
// ============================================================

import { useState, useEffect } from 'react';
import { apiCall, ensureGeneralKeyword } from '@/app/lib/api';
import * as quizApi from '@/app/services/quizApi';
import type {
  QuizQuestion,
  QuestionType,
  CreateQuizQuestionPayload,
  UpdateQuizQuestionPayload,
} from '@/app/services/quizApi';
import { DIFFICULTY_TO_INT, INT_TO_DIFFICULTY } from '@/app/services/quizConstants';
import type { Difficulty } from '@/app/services/quizConstants';
import { toast } from 'sonner';
import { logger } from '@/app/lib/logger';

// ── Local types ───────────────────────────────────────────

interface Subtopic {
  id: string;
  name: string;
  keyword_id: string;
  order_index: number;
}

// ── Params & Return ───────────────────────────────────────

export interface UseQuestionFormParams {
  summaryId: string;
  question: QuizQuestion | null;
  onSaved: () => void;
  quizId?: string;
  keywordRequired: boolean;
}

export interface UseQuestionFormReturn {
  // Form field values
  questionType: QuestionType;
  questionText: string;
  keywordId: string;
  difficulty: Difficulty;
  explanation: string;
  correctAnswer: string;
  options: string[];

  // Simple field setters
  setQuestionType: (v: QuestionType) => void;
  setQuestionText: (v: string) => void;
  setKeywordId: (v: string) => void;
  setDifficulty: (v: Difficulty) => void;
  setExplanation: (v: string) => void;
  setCorrectAnswer: (v: string) => void;

  // MCQ option management
  handleOptionChange: (index: number, value: string) => void;
  addOption: () => void;
  removeOption: (index: number) => void;

  // Subtopic
  subtopics: Subtopic[];
  subtopicId: string;
  setSubtopicId: (v: string) => void;
  loadingSubtopics: boolean;

  // Submit state
  saving: boolean;
  error: string | null;
  handleSubmit: () => Promise<void>;

  // Derived flags
  isEdit: boolean;
  showSubtopicSelector: boolean;
}

// ── Hook ──────────────────────────────────────────────────

export function useQuestionForm({
  summaryId,
  question,
  onSaved,
  quizId,
  keywordRequired,
}: UseQuestionFormParams): UseQuestionFormReturn {
  const isEdit = !!question;
  const showSubtopicSelector = !!quizId;

  // ── Form state ──────────────────────────────────────────
  const [questionType, setQuestionType] = useState<QuestionType>(
    question?.question_type || 'mcq',
  );
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [keywordId, setKeywordId] = useState(question?.keyword_id || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    question?.difficulty != null
      ? (INT_TO_DIFFICULTY[question.difficulty] || 'medium')
      : 'medium',
  );
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || '');
  const [options, setOptions] = useState<string[]>(
    question?.options || ['', '', '', ''],
  );

  // ── Subtopic state (only used when showSubtopicSelector) ─
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subtopicId, setSubtopicId] = useState('');
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Effect: load subtopics when keyword changes ─────────
  useEffect(() => {
    if (!showSubtopicSelector) return;
    setSubtopics([]);
    setSubtopicId('');
    if (!keywordId) return;
    let cancelled = false;
    setLoadingSubtopics(true);
    (async () => {
      try {
        const res = await apiCall<{ items: Subtopic[] } | Subtopic[]>(
          `/subtopics?keyword_id=${keywordId}`,
        );
        const items = Array.isArray(res) ? res : (res.items || []);
        if (!cancelled) setSubtopics(items);
      } catch (err) {
        logger.warn('[QuestionFormModal] Subtopics load error:', err);
        if (!cancelled) setSubtopics([]);
      } finally {
        if (!cancelled) setLoadingSubtopics(false);
      }
    })();
    return () => { cancelled = true; };
  }, [keywordId, showSubtopicSelector]);

  // ── Effect: reset options when type changes ─────────────
  useEffect(() => {
    if (!isEdit) {
      if (questionType === 'mcq') {
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
      } else if (questionType === 'true_false') {
        setOptions([]);
        setCorrectAnswer('true');
      } else {
        setOptions([]);
        setCorrectAnswer('');
      }
    }
  }, [questionType, isEdit]);

  // ── Option handlers ─────────────────────────────────────
  const handleOptionChange = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const next = options.filter((_, i) => i !== index);
      if (options[index] === correctAnswer) setCorrectAnswer('');
      setOptions(next);
    }
  };

  // ── Submit (validation + create/update) ─────────────────
  const handleSubmit = async () => {
    setError(null);

    // ── Validation ──
    if (keywordRequired && !keywordId) {
      setError('La keyword es obligatoria (REQUIRED en la DB)');
      return;
    }
    if (!questionText.trim()) {
      setError('La pregunta es obligatoria');
      return;
    }
    if (!correctAnswer.trim() && questionType !== 'true_false') {
      setError('La respuesta correcta es obligatoria');
      return;
    }
    if (questionType === 'mcq') {
      const validOpts = options.filter(o => o.trim());
      if (validOpts.length < 2) {
        setError('Minimo 2 opciones con texto');
        return;
      }
      if (!validOpts.includes(correctAnswer)) {
        setError('La respuesta correcta debe ser una de las opciones');
        return;
      }
    }

    // ── Persist ──
    setSaving(true);
    try {
      if (isEdit && question) {
        // ── UPDATE ──
        const payload: UpdateQuizQuestionPayload = {
          question_type: questionType,
          question: questionText.trim(),
          correct_answer: correctAnswer.trim(),
          difficulty: DIFFICULTY_TO_INT[difficulty] || 2,
          explanation: explanation.trim() || undefined,
        };
        if (questionType === 'mcq') {
          payload.options = options.filter(o => o.trim());
        } else {
          payload.options = null;
        }
        await quizApi.updateQuizQuestion(question.id, payload);
        toast.success('Pregunta actualizada');
      } else {
        // ── CREATE ──
        let resolvedKeywordId = keywordId;
        if (!resolvedKeywordId && !keywordRequired) {
          const generalKw = await ensureGeneralKeyword(summaryId);
          resolvedKeywordId = generalKw.id;
        }

        const payload: CreateQuizQuestionPayload = {
          name: questionText.trim().substring(0, 80),
          summary_id: summaryId,
          keyword_id: resolvedKeywordId,
          question_type: questionType,
          question: questionText.trim(),
          correct_answer: correctAnswer.trim(),
          difficulty: DIFFICULTY_TO_INT[difficulty] || 2,
          source: 'manual',
        };

        if (explanation.trim()) payload.explanation = explanation.trim();
        if (questionType === 'mcq') {
          payload.options = options.filter(o => o.trim());
        }

        // Subtopic (only when subtopic selector is active)
        if (showSubtopicSelector && subtopicId) {
          payload.subtopic_id = subtopicId;
        }

        if (quizId) {
          // QuizQuestionsEditor path: include quiz_id via raw apiCall
          await apiCall('/quiz-questions', {
            method: 'POST',
            body: JSON.stringify({ ...payload, quiz_id: quizId }),
          });
        } else {
          // ProfessorQuizzesPage path: standard quizApi
          await quizApi.createQuizQuestion(payload);
        }
        toast.success('Pregunta creada');
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return {
    questionType, questionText, keywordId, difficulty, explanation, correctAnswer, options,
    setQuestionType, setQuestionText, setKeywordId, setDifficulty, setExplanation, setCorrectAnswer,
    handleOptionChange, addOption, removeOption,
    subtopics, subtopicId, setSubtopicId, loadingSubtopics,
    saving, error, handleSubmit,
    isEdit, showSubtopicSelector,
  };
}
