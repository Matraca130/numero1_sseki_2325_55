// ============================================================
// PreGenerateButton — Queue bulk AI flashcard pre-generation
//
// Calls POST /ai/pre-generate to queue background generation
// of flashcards for a summary. Professor can click once and
// the backend handles async generation.
//
// Features:
//   - Count selector (3 or 5)
//   - Loading state with spinner
//   - Success/error feedback via toast
//   - Cooldown to prevent spam (matches backend 20 req/hr limit)
//
// BACKEND: POST /ai/pre-generate
// DEPENDENCIES: aiService.preGenerate(), sonner toast
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Zap, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { preGenerate } from '@/app/services/aiService';

interface PreGenerateButtonProps {
  summaryId: string;
  /** Called after successful pre-generation to refresh card list */
  onComplete?: () => void;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

type Phase = 'idle' | 'generating' | 'cooldown' | 'done';

export function PreGenerateButton({
  summaryId,
  onComplete,
  compact = false,
}: PreGenerateButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState<3 | 5>(3);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const handleGenerate = useCallback(async () => {
    if (phase !== 'idle' || !summaryId) return;

    setPhase('generating');
    try {
      await preGenerate({
        summaryId,
        action: 'flashcard',
        count,
      });

      toast.success(
        `Pre-generacion iniciada: ${count} flashcards en cola`,
        { description: 'El backend generara las flashcards en segundo plano.' }
      );

      setPhase('done');

      // Brief "done" state then cooldown
      scheduleTimer(() => {
        setPhase('cooldown');
        // Cooldown: 30s between pre-gen requests (rate limit is 20/hr ≈ 3min)
        scheduleTimer(() => setPhase('idle'), 30_000);
      }, 2000);

      onComplete?.();
    } catch (err: any) {
      console.error('[PreGenerateButton] Error:', err);

      const isRateLimit = err?.message?.includes('rate') || err?.message?.includes('limit');
      if (isRateLimit) {
        toast.error('Limite de IA alcanzado', {
          description: 'Espera unos minutos antes de generar mas contenido.',
        });
        setPhase('cooldown');
        scheduleTimer(() => setPhase('idle'), 60_000);
      } else {
        toast.error(err.message || 'Error al pre-generar flashcards');
        setPhase('idle');
      }
    }
  }, [phase, summaryId, count, onComplete, scheduleTimer]);

  const isDisabled = phase !== 'idle';

  if (compact) {
    return (
      <button
        onClick={handleGenerate}
        disabled={isDisabled}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${
          phase === 'generating'
            ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-wait'
            : phase === 'cooldown'
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : phase === 'done'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'border-amber-200 text-amber-600 hover:bg-amber-50 font-medium'
        } disabled:opacity-60`}
        title="Pre-generar flashcards en segundo plano"
      >
        {phase === 'generating' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : phase === 'cooldown' ? (
          <Clock size={14} />
        ) : phase === 'done' ? (
          <CheckCircle2 size={14} />
        ) : (
          <Zap size={14} />
        )}
        {phase === 'generating' ? 'Generando...' : phase === 'cooldown' ? 'Espera...' : phase === 'done' ? 'Listo!' : 'Pre-generar'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Count selector */}
      <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg border border-gray-200 p-0.5">
        {([3, 5] as const).map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            disabled={isDisabled}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
              count === n
                ? 'bg-white text-amber-600 shadow-sm border border-amber-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ fontWeight: count === n ? 600 : 400 }}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isDisabled}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm transition-all ${
          phase === 'generating'
            ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-wait'
            : phase === 'cooldown'
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : phase === 'done'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'border-amber-200 text-amber-600 hover:bg-amber-50'
        } disabled:opacity-60`}
        style={{ fontWeight: 500 }}
      >
        {phase === 'generating' ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Generando {count}...
          </>
        ) : phase === 'cooldown' ? (
          <>
            <Clock size={14} />
            Espera...
          </>
        ) : phase === 'done' ? (
          <>
            <CheckCircle2 size={14} />
            Enviado!
          </>
        ) : (
          <>
            <Zap size={14} />
            Pre-generar {count}
          </>
        )}
      </button>
    </div>
  );
}