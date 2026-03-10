// ============================================================
// Axon — Shared: QuestionFormModal (DRY extraction)
//
// Unified create/edit modal for quiz questions.
// Phase 5 refactor: logic extracted to useQuestionForm hook,
// answer renderers extracted to AnswerEditor component.
// ============================================================

import type { QuizQuestion, QuestionType } from '@/app/services/quizApi';
import type { KeywordRef } from '@/app/types/platform';
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
import { MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER, MODAL_FOOTER, BTN_PRIMARY, BTN_GHOST, BTN_CLOSE, INPUT_BASE, TEXTAREA_BASE, LABEL, BANNER_ERROR, BANNER_SUCCESS, PROFESSOR_COLORS } from '@/app/services/quizDesignTokens';
import {
  Plus, Pencil, X, Check,
  AlertCircle, Loader2,
} from 'lucide-react';

export interface QuestionFormModalProps {
  summaryId: string;
  question: QuizQuestion | null;
  keywords: KeywordRef[];
  onClose: () => void;
  onSaved: () => void;
  quizId?: string;
  keywordRequired?: boolean;
}

export function QuestionFormModal({
  summaryId, question, keywords, onClose, onSaved, quizId,
  keywordRequired: keywordRequiredProp,
}: QuestionFormModalProps) {
  const keywordRequired = keywordRequiredProp ?? !!quizId;

  const form = useQuestionForm({
    summaryId, question, onSaved, quizId, keywordRequired,
  });

  const headerSubtitle = form.isEdit
    ? (quizId ? 'Modifica la pregunta' : 'Completa los campos y guarda')
    : (quizId ? 'Vinculada al quiz: selecciona keyword y subtopic' : 'Completa los campos y guarda');

  const keywordLabel = keywordRequired
    ? <> Keyword * <span className="text-red-400" style={{ fontWeight: 400 }}>(obligatoria)</span></>
    : <> Keyword <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional — si no eliges, se usara "General")</span></>;

  const keywordPlaceholder = keywordRequired
    ? '-- Seleccionar keyword --'
    : '-- Sin keyword (se usara "General") --';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={MODAL_OVERLAY} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()} className={`${MODAL_CARD} w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden`}>
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              {form.isEdit ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{form.isEdit ? 'Editar pregunta' : 'Nueva pregunta'}</h3>
              <p className="text-[10px] text-gray-400">{headerSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className={BTN_CLOSE}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {form.error && (<div className={BANNER_ERROR}><AlertCircle size={14} />{form.error}</div>)}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} style={{ fontWeight: 600 }}>Tipo de pregunta *</label>
              <select value={form.questionType} onChange={e => form.setQuestionType(e.target.value as QuestionType)} disabled={form.isEdit} className={`${INPUT_BASE} ${PROFESSOR_COLORS.ring}`}>
                {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
            <div>
              <label className={LABEL} style={{ fontWeight: 600 }}>Dificultad *</label>
              <div className="flex gap-1.5">
                {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (
                  <button key={k} onClick={() => form.setDifficulty(k)} className={clsx('flex-1 py-2 rounded-lg text-[11px] border transition-all', form.difficulty === k ? DIFFICULTY_COLORS[k] + ' shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100')} style={{ fontWeight: form.difficulty === k ? 700 : 500 }}>{v}</button>
                ))}
              </div>
            </div>
          </div>

          {form.showSubtopicSelector ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL} style={{ fontWeight: 600 }}>{keywordLabel}</label>
                <select value={form.keywordId} onChange={e => form.setKeywordId(e.target.value)} disabled={form.isEdit} className={`${INPUT_BASE} ${PROFESSOR_COLORS.ring}`}>
                  <option value="">{keywordPlaceholder}</option>
                  {keywords.map(kw => (<option key={kw.id} value={kw.id}>{kw.term || kw.name}</option>))}
                </select>
              </div>
              <div>
                <label className={LABEL} style={{ fontWeight: 600 }}>Subtopic <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional{!form.keywordId ? ' — elige keyword primero' : ''})</span></label>
                {form.loadingSubtopics ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400"><Loader2 size={12} className="animate-spin" />Cargando...</div>
                ) : (
                  <select value={form.subtopicId} onChange={e => form.setSubtopicId(e.target.value)} disabled={!form.keywordId || form.isEdit || form.subtopics.length === 0} className={`${INPUT_BASE} ${PROFESSOR_COLORS.ring}`}>
                    <option value="">{!form.keywordId ? '-- Elige keyword primero --' : form.subtopics.length === 0 ? '-- Sin subtopics --' : '-- Sin subtopic --'}</option>
                    {form.subtopics.map(st => (<option key={st.id} value={st.id}>{st.name}</option>))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className={LABEL} style={{ fontWeight: 600 }}>{keywordLabel}</label>
              <select value={form.keywordId} onChange={e => form.setKeywordId(e.target.value)} disabled={form.isEdit} className={`${INPUT_BASE} ${PROFESSOR_COLORS.ring}`}>
                <option value="">{keywordPlaceholder}</option>
                {keywords.map(kw => (<option key={kw.id} value={kw.id}>{kw.term || kw.name}</option>))}
              </select>
            </div>
          )}

          {quizId && !form.isEdit && (
            <div className={BANNER_SUCCESS}>
              <Check size={12} className="shrink-0 mt-0.5" />
              <span><strong>Backend listo:</strong> quiz_id y subtopic_id son aceptados por el backend en createFields.</span>
            </div>
          )}

          <div>
            <label className={LABEL} style={{ fontWeight: 600 }}>Pregunta *</label>
            <textarea value={form.questionText} onChange={e => form.setQuestionText(e.target.value)} placeholder="Escribe la pregunta aqui..." rows={3} className={`${TEXTAREA_BASE} ${PROFESSOR_COLORS.ring}`} />
          </div>

          <AnswerEditor questionType={form.questionType} correctAnswer={form.correctAnswer} options={form.options} onCorrectAnswerChange={form.setCorrectAnswer} onOptionChange={form.handleOptionChange} onAddOption={form.addOption} onRemoveOption={form.removeOption} />

          <div>
            <label className={LABEL} style={{ fontWeight: 600 }}>Explicacion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional, se muestra al alumno despues de responder)</span></label>
            <textarea value={form.explanation} onChange={e => form.setExplanation(e.target.value)} placeholder="Por que esta es la respuesta correcta..." rows={2} className={`${TEXTAREA_BASE} ${PROFESSOR_COLORS.ring}`} />
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <button onClick={onClose} className={BTN_GHOST} style={{ fontWeight: 500 }}>Cancelar</button>
          <button onClick={form.handleSubmit} disabled={form.saving} className={clsx(BTN_PRIMARY, form.saving ? PROFESSOR_COLORS.primaryDisabled : `${PROFESSOR_COLORS.primary} ${PROFESSOR_COLORS.primaryHover} active:scale-[0.97]`)} style={{ fontWeight: 600 }}>
            {form.saving ? (<><Loader2 size={14} className="animate-spin" /> Guardando...</>) : (<><Check size={14} /> {form.isEdit ? 'Guardar cambios' : 'Crear pregunta'}</>)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
