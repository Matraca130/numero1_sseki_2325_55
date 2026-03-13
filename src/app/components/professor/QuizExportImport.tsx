// ============================================================
// Axon — Professor: Quiz Export/Import Modal (P8 Feature)
//
// Agent: EXPORTER
// Export quiz questions to JSON, import from JSON file.
//
// Export schema is portable (no internal IDs):
//   { version, title, questions: [{ question, question_type,
//     correct_answer, options, explanation, difficulty }] }
//
// Import: validates schema, creates questions via API.
// Design: purple accent, tabbed modal.
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, CreateQuizQuestionPayload } from '@/app/services/quizApi';
import { QUESTION_TYPE_LABELS, normalizeDifficulty, normalizeQuestionType } from '@/app/services/quizConstants';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Download, Upload, X, Check, AlertCircle, Loader2,
  FileJson, ClipboardCopy, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER, BTN_CLOSE, BANNER_ERROR, BANNER_SUCCESS } from '@/app/services/quizDesignTokens';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';

// ── Export Schema ────────────────────────────────────────

interface ExportedQuestion {
  question: string;
  question_type: string;
  correct_answer: string;
  options: string[] | null;
  explanation: string | null;
  difficulty: string;
}

interface ExportSchema {
  version: '1.0';
  title: string;
  exported_at: string;
  total_questions: number;
  questions: ExportedQuestion[];
}

// ── Props ────────────────────────────────────────────────

interface QuizExportImportProps {
  quizTitle: string;
  quizId: string;
  summaryId: string;
  questions: QuizQuestion[];
  keywordId: string; // default keyword for imports
  onClose: () => void;
  onImported: () => void;
}

// ── Component ────────────────────────────────────────────

export function QuizExportImport({
  quizTitle, quizId, summaryId, questions,
  keywordId, onClose, onImported,
}: QuizExportImportProps) {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<ExportedQuestion[] | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ─────────────────────────────────────────────
  const exportData: ExportSchema = {
    version: '1.0',
    title: quizTitle,
    exported_at: new Date().toISOString(),
    total_questions: questions.length,
    questions: questions.map(q => ({
      question: q.question,
      question_type: q.question_type,
      correct_answer: q.correct_answer,
      options: q.options,
      explanation: q.explanation,
      difficulty: normalizeDifficulty(q.difficulty),
    })),
  };

  const exportJson = JSON.stringify(exportData, null, 2);

  const handleDownload = useCallback(() => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-${quizTitle.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado');
  }, [exportJson, quizTitle]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copiado al portapapeles');
    });
  }, [exportJson]);

  // ── Import ─────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setPreviewQuestions(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.questions || !Array.isArray(data.questions)) {
          setImportError('Formato invalido: falta el campo "questions"');
          return;
        }
        // Validate each question minimally
        const valid = data.questions.filter((q: any) => q.question && q.correct_answer);
        if (valid.length === 0) {
          setImportError('No se encontraron preguntas validas en el archivo');
          return;
        }
        setPreviewQuestions(valid);
      } catch {
        setImportError('Error al parsear JSON. Verifica el formato del archivo.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(async () => {
    if (!previewQuestions) return;
    setImporting(true);
    setImportError(null);
    let success = 0;
    let failed = 0;

    for (const q of previewQuestions) {
      try {
        const payload: CreateQuizQuestionPayload = {
          summary_id: summaryId,
          keyword_id: keywordId,
          quiz_id: quizId,
          question_type: normalizeQuestionType(q.question_type),
          question: q.question,
          correct_answer: q.correct_answer,
          options: q.options || undefined,
          explanation: q.explanation || undefined,
          difficulty: ({ easy: 1, medium: 2, hard: 3 } as Record<string, number>)[q.difficulty] || 2,
          source: 'manual',
        };
        await quizApi.createQuizQuestion(payload);
        success++;
      } catch (err) {
        logger.warn('[Import] Question failed:', getErrorMsg(err));
        failed++;
      }
    }

    setImporting(false);
    setImportResult({ success, failed });
    if (success > 0) {
      toast.success(`${success} preguntas importadas`);
      onImported();
    }
  }, [previewQuestions, summaryId, keywordId, quizId, onImported]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={MODAL_OVERLAY}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className={`${MODAL_CARD} w-full max-w-[560px] max-h-[80vh] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileJson size={17} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>Exportar / Importar</h3>
              <p className="text-[10px] text-gray-400 truncate max-w-[300px]">{quizTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className={BTN_CLOSE}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            onClick={() => setTab('export')}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 text-[12px] border-b-2 transition-colors',
              tab === 'export' ? 'text-purple-600 border-purple-500' : 'text-gray-400 border-transparent hover:text-gray-600',
            )}
            style={{ fontWeight: 600 }}
          >
            <Download size={13} /> Exportar
          </button>
          <button
            onClick={() => setTab('import')}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 text-[12px] border-b-2 transition-colors',
              tab === 'import' ? 'text-purple-600 border-purple-500' : 'text-gray-400 border-transparent hover:text-gray-600',
            )}
            style={{ fontWeight: 600 }}
          >
            <Upload size={13} /> Importar
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'export' ? (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-500">
                {questions.length} pregunta{questions.length !== 1 ? 's' : ''} seran exportadas en formato JSON portable.
              </p>
              {/* JSON preview */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 max-h-[250px] overflow-y-auto">
                <pre className="text-[10px] text-zinc-600 whitespace-pre-wrap break-all" style={{ fontFamily: 'monospace' }}>
                  {exportJson.substring(0, 2000)}{exportJson.length > 2000 ? '\n...' : ''}
                </pre>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-[12px] hover:bg-purple-700 active:scale-[0.97] transition-all shadow-sm"
                  style={{ fontWeight: 600 }}
                >
                  <Download size={14} /> Descargar .json
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-2 text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-lg text-[12px] hover:bg-zinc-50 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  {copied ? <><Check size={14} className="text-emerald-500" /> Copiado</> : <><ClipboardCopy size={14} /> Copiar</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-500">
                Selecciona un archivo JSON con preguntas. Se crearan como preguntas nuevas en este quiz.
              </p>

              {importError && (
                <div className={BANNER_ERROR}>
                  <AlertCircle size={14} />
                  {importError}
                </div>
              )}

              {importResult && (
                <div className={importResult.failed > 0 ? BANNER_ERROR : BANNER_SUCCESS}>
                  {importResult.failed > 0 ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  <span>{importResult.success} importadas, {importResult.failed} fallidas</span>
                </div>
              )}

              {/* File picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-400 hover:border-purple-400 hover:text-purple-500 transition-colors cursor-pointer"
                style={{ fontWeight: 600 }}
              >
                <Upload size={18} />
                <span className="text-[12px]">Seleccionar archivo .json</span>
              </button>

              {/* Preview */}
              {previewQuestions && (
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-500" style={{ fontWeight: 600 }}>
                    Vista previa: {previewQuestions.length} preguntas detectadas
                  </p>
                  <div className="max-h-[180px] overflow-y-auto space-y-1 custom-scrollbar-light">
                    {previewQuestions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px]">
                        <span className="text-zinc-400 shrink-0" style={{ fontWeight: 600 }}>#{i + 1}</span>
                        <span className="text-zinc-600 truncate flex-1">{q.question}</span>
                        <span className="text-[9px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded shrink-0" style={{ fontWeight: 600 }}>
                          {QUESTION_TYPE_LABELS[normalizeQuestionType(q.question_type)] || q.question_type}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-[12px] hover:bg-purple-700 active:scale-[0.97] transition-all shadow-sm disabled:bg-purple-400"
                    style={{ fontWeight: 600 }}
                  >
                    {importing ? (
                      <><Loader2 size={14} className="animate-spin" /> Importando...</>
                    ) : (
                      <><Check size={14} /> Importar {previewQuestions.length} preguntas</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}