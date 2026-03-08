// ============================================================
// SmartGeneratorPanel — Unified AI generation panel
//
// Reusable component for generating flashcards OR quiz questions
// using the smart (BKT-adaptive) system. Shows:
//   - Count selector (5, 10)
//   - Optional summary scoping toggle
//   - Generation progress bar with live stats
//   - Results with subtopic-level targeting info
//   - Mastery reason badges per item
//
// Used by: FlashcardView, QuizView, FlashcardsManager
// Backend: POST /ai/generate-smart (Fase 8A + 8E)
// ============================================================

import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Brain, Target, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import {
  useSmartGeneration,
  type SmartGenerationAction,
  type SmartGeneratedItem,
  type SmartGenerationResult,
} from '@/app/hooks/useSmartGeneration';

// ── Props ─────────────────────────────────────────────────

export interface SmartGeneratorPanelProps {
  /** 'flashcard' or 'quiz_question' */
  action: SmartGenerationAction;
  /** Optional: scope generation to a specific summary */
  summaryId?: string;
  /** Optional: scope to institution */
  institutionId?: string;
  /** Optional: auto-link quiz questions to a quiz */
  quizId?: string;
  /** Called when generation completes with results */
  onComplete?: (result: SmartGenerationResult) => void;
  /** Custom label for the generate button */
  buttonLabel?: string;
  /** Compact mode for embedding in sidebars */
  compact?: boolean;
}

// ── Reason badges (maps backend primary_reason to Spanish) ──

const REASON_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new_concept: {
    label: 'Concepto nuevo',
    color: 'bg-blue-100 text-blue-800',
    icon: <Sparkles className="w-3 h-3" />,
  },
  low_mastery: {
    label: 'Dominio bajo',
    color: 'bg-red-100 text-red-800',
    icon: <Target className="w-3 h-3" />,
  },
  needs_review: {
    label: 'Necesita repaso',
    color: 'bg-orange-100 text-orange-800',
    icon: <Brain className="w-3 h-3" />,
  },
  moderate_mastery: {
    label: 'Dominio moderado',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Zap className="w-3 h-3" />,
  },
  reinforcement: {
    label: 'Refuerzo',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

// ── Count options ─────────────────────────────────────────

const COUNT_OPTIONS = [
  { value: 5, label: '5', desc: 'Rapido' },
  { value: 10, label: '10', desc: 'Completo' },
];

// ── Component ───────────────────────────────────────────

export function SmartGeneratorPanel({
  action,
  summaryId,
  institutionId,
  quizId,
  onComplete,
  buttonLabel,
  compact = false,
}: SmartGeneratorPanelProps) {
  const [count, setCount] = useState(5);
  const [showDetails, setShowDetails] = useState(false);

  const {
    phase,
    progress,
    result,
    error,
    generate,
    reset,
  } = useSmartGeneration();

  const isFlashcard = action === 'flashcard';
  const typeLabel = isFlashcard ? 'flashcards' : 'preguntas';
  const defaultButtonLabel = `Generar ${typeLabel} con IA`;

  const handleGenerate = async () => {
    const genResult = await generate({
      action,
      count,
      summaryId,
      institutionId,
      quizId,
      related: true,
    });
    if (genResult) {
      onComplete?.(genResult);
    }
  };

  // ── Idle state: show generator controls ─────────────────
  if (phase === 'idle') {
    return (
      <div className={`rounded-xl border border-gray-200 ${compact ? 'p-3' : 'p-5'} bg-gradient-to-br from-teal-50/50 to-white`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-teal-100">
            <Sparkles className="w-4 h-4 text-teal-700" />
          </div>
          <span className="text-gray-800" style={{ fontWeight: 600 }}>
            Generacion Inteligente
          </span>
        </div>

        <p className="text-gray-500 mb-4 text-sm">
          {isFlashcard
            ? 'Genera flashcards adaptadas a tus areas debiles usando analisis BKT con granularidad de subtema.'
            : 'Genera preguntas de quiz adaptadas a tu nivel de dominio, enfocadas en subtemas donde mas lo necesitas.'}
        </p>

        {/* Count selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Cantidad:</span>
          <div className="flex gap-1.5">
            {COUNT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCount(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  count === opt.value
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{ fontWeight: count === opt.value ? 600 : 400 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-1">
            {count <= 5 ? 'Rapido (~15s)' : 'Completo (~30s)'}
          </span>
        </div>

        {summaryId && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-teal-700 bg-teal-50 rounded-md px-2.5 py-1.5">
            <Target className="w-3 h-3" />
            <span>Enfocado en este resumen (granularidad subtema)</span>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {buttonLabel || defaultButtonLabel}
        </Button>
      </div>
    );
  }

  // ── Generating state: show progress ─────────────────────
  if (phase === 'generating' && progress) {
    const pct = progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

    return (
      <div className={`rounded-xl border border-teal-200 ${compact ? 'p-3' : 'p-5'} bg-gradient-to-br from-teal-50 to-white`}>
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
          <span className="text-gray-800" style={{ fontWeight: 600 }}>
            Generando {typeLabel}...
          </span>
        </div>

        <Progress value={pct} className="h-2 mb-2" />

        <div className="flex justify-between text-xs text-gray-500">
          <span>{progress.generated} generadas, {progress.failed} errores</span>
          <span>{pct}%</span>
        </div>

        {progress.latestItem && (
          <div className="mt-3 p-2.5 rounded-lg bg-white/80 border border-gray-100 text-sm">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1 text-xs">
              <Target className="w-3 h-3" />
              <span>{progress.latestItem._smart?.target_keyword}</span>
              {progress.latestItem._smart?.target_subtopic && (
                <>
                  <span className="text-gray-300">{'>'}</span>
                  <span>{progress.latestItem._smart.target_subtopic}</span>
                </>
              )}
            </div>
            <p className="text-gray-700 line-clamp-2">
              {progress.latestItem.front || progress.latestItem.question || ''}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className={`rounded-xl border border-red-200 ${compact ? 'p-3' : 'p-5'} bg-red-50`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-red-800" style={{ fontWeight: 600 }}>Error</span>
        </div>
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Button onClick={reset} variant="outline" size="sm">
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  // ── Done state: show results ────────────────────────────
  if (phase === 'done' && result) {
    const { items, errors: genErrors, stats } = result;

    return (
      <div className={`rounded-xl border border-green-200 ${compact ? 'p-3' : 'p-5'} bg-gradient-to-br from-green-50/50 to-white`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-gray-800" style={{ fontWeight: 600 }}>
              {stats.generated} {typeLabel} generadas
            </span>
          </div>
          <Button onClick={reset} variant="ghost" size="sm" className="text-xs">
            Generar mas
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 mb-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {stats.uniqueKeywords} keywords
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" />
            {stats.uniqueSubtopics} subtemas
          </span>
          <span>
            Dominio prom: {Math.round(stats.avgPKnow * 100)}%
          </span>
          <span>
            {(stats.elapsedMs / 1000).toFixed(1)}s
          </span>
        </div>

        {genErrors.length > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 rounded-md px-2.5 py-1.5 mb-3">
            {genErrors.length} generacion(es) fallaron
          </div>
        )}

        {/* Generated items list */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 mb-2 transition-colors"
        >
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showDetails ? 'Ocultar detalles' : 'Ver detalles de targeting'}
        </button>

        {showDetails && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <SmartItemCard key={item.id} item={item} isFlashcard={isFlashcard} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ── Sub-component: item card with smart metadata ────────────

function SmartItemCard({
  item,
  isFlashcard,
}: {
  item: SmartGeneratedItem;
  isFlashcard: boolean;
}) {
  const reason = REASON_CONFIG[item._smart?.primary_reason] || REASON_CONFIG.new_concept;
  const pKnowPct = Math.round((item._smart?.p_know ?? 0) * 100);

  return (
    <div className="p-2.5 rounded-lg bg-white border border-gray-100 text-sm">
      {/* Targeting info */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${reason.color}`}>
          {reason.icon}
          {reason.label}
        </Badge>
        <span className="text-[10px] text-gray-400">
          p_know: {pKnowPct}%
        </span>
        {item._smart?.target_subtopic && (
          <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
            {item._smart.target_subtopic}
          </span>
        )}
      </div>

      {/* Content preview */}
      <div className="text-gray-600 text-xs">
        {isFlashcard ? (
          <div>
            <span className="text-gray-400">F:</span> {item.front?.substring(0, 80)}
            {(item.front?.length || 0) > 80 ? '...' : ''}
          </div>
        ) : (
          <div>
            <span className="text-gray-400">Q:</span> {item.question?.substring(0, 80)}
            {(item.question?.length || 0) > 80 ? '...' : ''}
          </div>
        )}
      </div>

      {/* Keyword path */}
      <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
        <span>{item._smart?.target_keyword || item.keyword_name}</span>
        {item._smart?.target_subtopic && (
          <>
            <span>{'>'}</span>
            <span>{item._smart.target_subtopic}</span>
          </>
        )}
      </div>
    </div>
  );
}
