// ============================================================
// Axon — KeywordActionsSection (counters + quick actions + AI)
//
// Extracted from KeywordPopup.tsx in Phase 2, Step 7c.
// Self-contained: owns all AI state (aiExplaining, aiExplanation,
// aiChatInput) + handlers + suggestedQuestions memo.
//
// Decision D6-bis: AI state is local here (sole consumer).
// This reduces props from 11 (arch doc) to 3.
//
// Uses apiCall + toast directly for AI calls.
// ============================================================
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Brain, HelpCircle, ChevronRight, Sparkles, Loader2, Send,
} from 'lucide-react';
import clsx from 'clsx';
import { apiCall } from '@/app/lib/api';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// ── Props ─────────────────────────────────────────────────
export interface KeywordActionsSectionProps {
  keyword: SummaryKeyword;
  flashcardCount: number | null;
  quizCount: number | null;
}

// ── Component ─────────────────────────────────────────────
export function KeywordActionsSection({
  keyword,
  flashcardCount,
  quizCount,
}: KeywordActionsSectionProps) {
  // ── Local AI state (D6-bis) ──
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiChatInput, setAiChatInput] = useState('');

  // ── AI handlers ──
  const handleAiQuery = async (question: string) => {
    if (aiExplaining || !question.trim()) return;
    setAiExplaining(true);
    setAiExplanation(null);
    try {
      const conceptText = `${keyword.name}${keyword.definition ? ': ' + keyword.definition : ''}`;
      const result = await apiCall<any>('/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          concept: conceptText,
          context: question,
        }),
      });
      setAiExplanation(result?.explanation || (typeof result === 'string' ? result : JSON.stringify(result)) || 'Sin respuesta de la IA');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al consultar IA');
      setAiExplanation(null);
    } finally {
      setAiExplaining(false);
    }
  };

  const handleAiExplain = () => {
    handleAiQuery('Concepto medico del area de estudio. Explicar de forma clara y concisa para un estudiante.');
  };

  const handleAiChat = () => {
    if (!aiChatInput.trim()) return;
    const q = aiChatInput.trim();
    setAiChatInput('');
    handleAiQuery(q);
  };

  // ── Suggested AI questions ──
  const suggestedQuestions = useMemo(() => [
    `Que es "${keyword.name}" en terminos simples?`,
    `Cual es la importancia clinica de "${keyword.name}"?`,
    `Dame un ejemplo practico de "${keyword.name}"`,
  ], [keyword.name]);

  return (
    <div className="space-y-3">
      {/* Counters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain size={12} className="text-amber-400" />
            <span className="text-[10px] text-zinc-500 uppercase">Flashcards</span>
          </div>
          <span className="text-lg text-zinc-200">
            {flashcardCount === null ? (
              <Loader2 size={14} className="animate-spin text-zinc-600" />
            ) : (
              flashcardCount
            )}
          </span>
        </div>
        <div className="bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1">
            <HelpCircle size={12} className="text-blue-400" />
            <span className="text-[10px] text-zinc-500 uppercase">Preguntas</span>
          </div>
          <span className="text-lg text-zinc-200">
            {quizCount === null ? (
              <Loader2 size={14} className="animate-spin text-zinc-600" />
            ) : (
              quizCount
            )}
          </span>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="space-y-1.5">
        <button
          disabled={flashcardCount === 0}
          className={clsx(
            'w-full flex items-center gap-2 py-2 px-3 rounded-full text-xs transition-all',
            flashcardCount && flashcardCount > 0
              ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50',
          )}
          title={flashcardCount === 0 ? 'No hay flashcards para este keyword' : 'Revisar flashcards'}
        >
          <Brain size={12} />
          <span>Revisar {flashcardCount ?? '...'} flashcards</span>
          <ChevronRight size={10} className="ml-auto" />
        </button>
        <button
          disabled={quizCount === 0}
          className={clsx(
            'w-full flex items-center gap-2 py-2 px-3 rounded-full text-xs transition-all',
            quizCount && quizCount > 0
              ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50',
          )}
          title={quizCount === 0 ? 'No hay preguntas para este keyword' : 'Tomar quiz'}
        >
          <HelpCircle size={12} />
          <span>Tomar {quizCount ?? '...'} preguntas</span>
          <ChevronRight size={10} className="ml-auto" />
        </button>
      </div>

      <div className="border-t border-zinc-800" />

      {/* AI Explain button */}
      <button
        onClick={handleAiExplain}
        disabled={aiExplaining}
        className={clsx(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs transition-all',
          aiExplaining
            ? 'bg-teal-500/10 text-teal-400 cursor-wait'
            : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 active:scale-[0.98]',
        )}
      >
        {aiExplaining ? (
          <><Loader2 size={13} className="animate-spin" /> Explicando...</>
        ) : (
          <><Sparkles size={13} /> Explicar con IA</>
        )}
      </button>

      {/* AI Explanation result */}
      {aiExplanation && (
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={10} className="text-teal-400" />
            <span className="text-[10px] text-teal-400">Explicacion IA</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {typeof aiExplanation === 'string' ? aiExplanation : JSON.stringify(aiExplanation)}
          </p>
        </div>
      )}

      <div className="border-t border-zinc-800" />

      {/* Suggested questions */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <HelpCircle size={10} className="text-blue-400" />
          Preguntas sugeridas
        </p>
        <div className="space-y-1">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleAiQuery(q)}
              disabled={aiExplaining}
              className="w-full text-left text-[11px] text-zinc-400 hover:text-teal-300 px-2.5 py-1.5 rounded-full hover:bg-teal-500/10 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="text-teal-500 mr-1">?</span> {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat input */}
      <div className="flex items-center gap-2">
        <input
          value={aiChatInput}
          onChange={e => setAiChatInput(e.target.value)}
          placeholder={`Pregunta sobre "${keyword.name}"...`}
          className="flex-1 text-xs text-zinc-200 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/50"
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleAiChat(); }
          }}
          disabled={aiExplaining}
        />
        <button
          onClick={handleAiChat}
          disabled={aiExplaining || !aiChatInput.trim()}
          className="text-teal-400 hover:text-teal-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors p-1.5"
          title="Enviar pregunta"
        >
          {aiExplaining ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}