// ============================================================
// Axon — ReportContentButton (v4.5, Fase E-1)
//
// Small reusable widget for reporting AI-generated content.
// Renders as a flag icon button that opens a dialog with
// reason selector + optional description field.
//
// USAGE:
//   <ReportContentButton
//     contentType="flashcard"
//     contentId={card.id}
//   />
//
// BACKEND: POST /ai/report → creates AiContentReport row
// UNIQUE CONSTRAINT: (content_type, content_id, reported_by)
//   → Shows friendly message on duplicate report attempt.
//
// DEPENDENCIES:
//   - aiService (reportContent, ReportReason, ReportContentType)
//   - shadcn Dialog, Select, Button, Textarea
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Flag, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import {
  reportContent,
  type ReportReason,
  type ReportContentType,
} from '@/app/services/aiService';

// ── Reason labels (Spanish) ──────────────────────────────

const REASON_OPTIONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'incorrect',     label: 'Incorrecto',    description: 'La informacion es factualmente incorrecta' },
  { value: 'low_quality',   label: 'Baja calidad',  description: 'Contenido confuso, mal redactado o incompleto' },
  { value: 'irrelevant',    label: 'Irrelevante',   description: 'No esta relacionado con el tema de estudio' },
  { value: 'inappropriate', label: 'Inapropiado',   description: 'Contenido ofensivo o inadecuado' },
  { value: 'other',         label: 'Otro',          description: 'Otra razon no listada' },
];

// ── Types ────────────────────────────────────────────────

type SubmitPhase = 'idle' | 'submitting' | 'success' | 'error';

interface ReportContentButtonProps {
  /** Type of AI content: 'flashcard' or 'quiz_question' */
  contentType: ReportContentType;
  /** UUID of the content item */
  contentId: string;
  /** Visual variant: icon-only (default) or text */
  variant?: 'icon' | 'text';
  /** Optional size */
  size?: 'sm' | 'md';
  /** Optional className override */
  className?: string;
}

// ── Component ────────────────────────────────────────────

export function ReportContentButton({
  contentType,
  contentId,
  variant = 'icon',
  size = 'sm',
  className = '',
}: ReportContentButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const resetForm = useCallback(() => {
    setReason('');
    setDescription('');
    setPhase('idle');
    setErrorMsg('');
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      // Delay reset so closing animation finishes
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(resetForm, 200);
    }
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!reason) return;

    setPhase('submitting');
    setErrorMsg('');

    try {
      await reportContent({
        contentType,
        contentId,
        reason,
        description: description.trim() || undefined,
      });
      setPhase('success');
      // Auto-close after success
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => handleOpenChange(false), 1500);
    } catch (err: any) {
      setPhase('error');
      setErrorMsg(err.message || 'Error al enviar reporte');
    }
  }, [contentType, contentId, reason, description, handleOpenChange]);

  const contentTypeLabel = contentType === 'flashcard' ? 'flashcard' : 'pregunta';
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <>
      {/* Trigger button */}
      {variant === 'icon' ? (
        <button
          onClick={() => setOpen(true)}
          className={`p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors ${className}`}
          title={`Reportar ${contentTypeLabel}`}
          aria-label={`Reportar ${contentTypeLabel}`}
        >
          <Flag size={iconSize} />
        </button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className={`text-gray-500 hover:text-orange-500 gap-1.5 ${className}`}
        >
          <Flag size={iconSize} />
          Reportar
        </Button>
      )}

      {/* Report dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontWeight: 600 }}>
              Reportar {contentTypeLabel}
            </DialogTitle>
            <DialogDescription>
              Ayudanos a mejorar el contenido generado por IA.
              Tu reporte sera revisado por un moderador.
            </DialogDescription>
          </DialogHeader>

          {phase === 'success' ? (
            /* Success state */
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>
                Reporte enviado correctamente
              </p>
              <p className="text-xs text-gray-500 text-center">
                Gracias por ayudar a mejorar la calidad del contenido.
              </p>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-4 py-2">
              {/* Reason selector */}
              <div className="space-y-2">
                <Label className="text-sm" style={{ fontWeight: 500 }}>
                  Motivo del reporte *
                </Label>
                <Select
                  value={reason}
                  onValueChange={(v) => setReason(v as ReportReason)}
                  disabled={phase === 'submitting'}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reason && (
                  <p className="text-xs text-gray-500">
                    {REASON_OPTIONS.find(o => o.value === reason)?.description}
                  </p>
                )}
              </div>

              {/* Description (optional) */}
              <div className="space-y-2">
                <Label className="text-sm" style={{ fontWeight: 500 }}>
                  Descripcion (opcional)
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  placeholder="Describe el problema con mas detalle..."
                  rows={3}
                  disabled={phase === 'submitting'}
                  className="resize-none"
                />
                <p className="text-xs text-gray-400 text-right">
                  {description.length}/2000
                </p>
              </div>

              {/* Error message */}
              {phase === 'error' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {phase !== 'success' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={phase === 'submitting'}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || phase === 'submitting'}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                {phase === 'submitting' ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-1.5" />
                    Enviando...
                  </>
                ) : (
                  'Enviar reporte'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
