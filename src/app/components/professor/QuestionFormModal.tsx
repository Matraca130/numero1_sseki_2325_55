// ============================================================
// Axon — Shared: QuestionFormModal (DRY extraction)
//
// Unified create/edit modal for quiz questions.
// Used by BOTH ProfessorQuizzesPage and QuizQuestionsEditor.
//
// Behavior varies via optional props:
//   - quizId       → if set, sends quiz_id in POST + shows subtopic selector
//   - keywordRequired → if true, keyword is mandatory (error if empty)
//                       if false, falls back to "General" keyword
//                       defaults to !!quizId
//
// Phase 5 refactor: logic extracted to useQuestionForm hook,
// answer renderers extracted to AnswerEditor component.
// ============================================================

import type { QuizQuestion, QuestionType } from '@/app/services/quizApi';
import {
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from '@/app/services/quizConstants';
import type { Difficulty } from '@/app/services/quizConstants';
import { useQuestionForm } from './useQuestionForm';
import { AnswerEditor } from './AnswerEditor';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Plus, Pencil, X, Check,
  AlertCircle, Loader2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

export interface QuestionFormModalProps {
  summaryId: string;
  question: QuizQuestion | null;
  keywords: Array<{ id: string; term?: string; name?: string }>;
  onClose: () => void;
  onSaved: () => void;
  /** If provided, quiz_id is sent in POST + subtopic selector is shown */
  quizId?: string;
  /** If true, keyword is required (error if empty). Defaults to !!quizId */
  keywordRequired?: boolean;
}

// ── Component ─────────────────────────────────────────────

export function QuestionFormModal({
  summaryId,
  question,
  keywords,
  onClose,
  onSaved,
  quizId,
  keywordRequired: keywordRequiredProp,
}: QuestionFormModalProps) {
  const keywordRequired = keywordRequiredProp ?? !!quizId;

  // ── Hook (all form state + logic) ───────────────────────
  const form = useQuestionForm({
    summaryId,
    question,
    onSaved,
    quizId,
    keywordRequired,
  });

  // ── Derived labels ──────────────────────────────────────
  const headerSubtitle = form.isEdit
    ? (quizId ? 'Modifica la pregunta' : 'Completa los campos y guarda')
    : (quizId ? 'Vinculada al quiz: selecciona keyword y subtopic' : 'Completa los campos y guarda');

  const keywordLabel = keywordRequired
    ? <> Keyword * <span className="text-red-400" style={{ fontWeight: 400 }}>(obligatoria)</span></>
    : <> Keyword <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional — si no eliges, se usara "General")</span></>;

  const keywordPlaceholder = keywordRequired
    ? '-- Seleccionar keyword --'
    : '-- Sin keyword (se usara "General") --';

  // ── Render ──────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              {form.isEdit ? <Pencil size={16} className="text-teal-600" /> : <Plus size={16} className="text-teal-600" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                {form.isEdit ? 'Editar pregunta' : 'Nueva pregunta'}
              </h3>
              <p className="text-[10px] text-gray-400">{headerSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Error */}
          {form.error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle size={14} />
              {form.error}
            </div>
          )}

          {/* Row: Type + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Tipo de pregunta *</label>
              <select
                value={form.questionType}
                onChange={e => form.setQuestionType(e.target.value as QuestionType)}
                disabled={form.isEdit}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Dificultad *</label>
              <div className="flex gap-1.5">
                {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => form.setDifficulty(k)}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-[11px] border transition-all',
                      form.difficulty === k
                        ? DIFFICULTY_COLORS[k] + ' shadow-sm'
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100',
                    )}
                    style={{ fontWeight: form.difficulty === k ? 700 : 500 }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keyword + optional Subtopic */}
          {form.showSubtopicSelector ? (
            // ── Two-column: Keyword + Subtopic (QuizQuestionsEditor mode) ──
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
                  {keywordLabel}
                </label>
                <select
                  value={form.keywordId}
                  onChange={e => form.setKeywordId(e.target.value)}
                  disabled={form.isEdit}
                  className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{keywordPlaceholder}</option>
                  {keywords.map(kw => (
                    <option key={kw.id} value={kw.id}>{kw.term || kw.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
                  Subtopic <span className="text-gray-400" style={{ fontWeight: 400 }}>
                    (opcional{!form.keywordId ? ' — elige keyword primero' : ''})
                  </span>
                </label>
                {form.loadingSubtopics ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400">
                    <Loader2 size={12} className="animate-spin" />Cargando...
                  </div>
                ) : (
                  <select
                    value={form.subtopicId}
                    onChange={e => form.setSubtopicId(e.target.value)}
                    disabled={!form.keywordId || form.isEdit || form.subtopics.length === 0}
                    className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!form.keywordId
                        ? '-- Elige keyword primero --'
                        : form.subtopics.length === 0
                        ? '-- Sin subtopics --'
                        : '-- Sin subtopic --'}
                    </option>
                    {form.subtopics.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            // ── Single-column: Keyword only (ProfessorQuizzesPage mode) ──
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
                {keywordLabel}
              </label>
              <select
                value={form.keywordId}
                onChange={e => form.setKeywordId(e.target.value)}
                disabled={form.isEdit}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{keywordPlaceholder}</option>
                {keywords.map(kw => (
                  <option key={kw.id} value={kw.id}>{kw.term || kw.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Backend info banner (only when quizId is present and creating) */}
          {quizId && !form.isEdit && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px]">
              <Check size={12} className="shrink-0 mt-0.5" />
              <span><strong>Backend listo:</strong> quiz_id y subtopic_id son aceptados por el backend en createFields.</span>
            </div>
          )}

          {/* Question text */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Pregunta *</label>
            <textarea
              value={form.questionText}
              onChange={e => form.setQuestionText(e.target.value)}
              placeholder="Escribe la pregunta aqui..."
              rows={3}
              className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
            />
          </div>

          {/* ── Answer Editor (MCQ / TF / Open / Fill) ── */}
          <AnswerEditor
            questionType={form.questionType}
            correctAnswer={form.correctAnswer}
            options={form.options}
            optionIds={form.optionIds}
            onCorrectAnswerChange={form.setCorrectAnswer}
            onOptionChange={form.handleOptionChange}
            onAddOption={form.addOption}
            onRemoveOption={form.removeOption}
          />

          {/* Explanation */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Explicacion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional, se muestra al alumno despues de responder)</span>
            </label>
            <textarea
              value={form.explanation}
              onChange={e => form.setExplanation(e.target.value)}
              placeholder="Por que esta es la respuesta correcta..."
              rows={2}
              className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
            style={{ fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={form.handleSubmit}
            disabled={form.saving}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-full text-[12px] text-white transition-all shadow-sm',
              form.saving
                ? 'bg-[#2a8c7a]/60 cursor-wait'
                : 'bg-[#2a8c7a] hover:bg-[#244e47] active:scale-[0.97]',
            )}
            style={{ fontWeight: 600 }}
          >
            {form.saving ? (
              <><Loader2 size={14} className="animate-spin" /> Guardando...</>
            ) : (
              <><Check size={14} /> {form.isEdit ? 'Guardar cambios' : 'Crear pregunta'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default QuestionFormModal;
