// ============================================================
// Axon — usePdfIngest Hook (v4.5)
//
// Manages the PDF upload → summary creation flow for professors.
//
// BACKEND ROUTE:
//   POST /ai/ingest-pdf (Fase 7: ingest-pdf.ts)
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  ingestPdf,
  type PdfIngestResponse,
} from '@/app/services/aiService';

// ── Constants ─────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];

// ── Types ─────────────────────────────────────────────────

export type PdfIngestPhase =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'done'
  | 'error';

export interface PdfValidationError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'NO_FILE';
  message: string;
  details?: { maxSize?: string; actualSize?: string; type?: string };
}

// ── Hook ──────────────────────────────────────────────────

export function usePdfIngest() {
  const [phase, setPhase] = useState<PdfIngestPhase>('idle');
  const [result, setResult] = useState<PdfIngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<PdfValidationError | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const uploadingRef = useRef(false);

  // ── Client-side validation ─────────────────────────────

  const validateFile = useCallback((file: File): PdfValidationError | null => {
    if (!file) {
      return {
        code: 'NO_FILE',
        message: 'No se selecciono ningun archivo.',
      };
    }

    // Check MIME type
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);
    const isValidExt = ALLOWED_EXTENSIONS.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isValidMime && !isValidExt) {
      return {
        code: 'INVALID_TYPE',
        message: 'Solo se aceptan archivos PDF.',
        details: { type: file.type || 'desconocido' },
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const maxMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      const actualMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        code: 'FILE_TOO_LARGE',
        message: `El archivo excede el limite de ${maxMB}MB (${actualMB}MB).`,
        details: { maxSize: `${maxMB}MB`, actualSize: `${actualMB}MB` },
      };
    }

    return null; // Valid
  }, []);

  // ── Upload flow ──────────────────────────────────────

  const upload = useCallback(async (
    file: File,
    institutionId: string,
    topicId: string,
    title?: string
  ): Promise<PdfIngestResponse | null> => {
    if (uploadingRef.current) return null;

    // Reset state
    setError(null);
    setValidationError(null);
    setResult(null);
    setFileName(file.name);

    // Phase 1: Validate
    setPhase('validating');
    const valError = validateFile(file);
    if (valError) {
      setValidationError(valError);
      setPhase('error');
      return null;
    }

    // Phase 2: Upload
    setPhase('uploading');
    uploadingRef.current = true;

    try {
      const response = await ingestPdf(
        file,
        institutionId,
        topicId,
        title
      );

      setResult(response);
      setPhase('done');
      return response;
    } catch (err: any) {
      const message = err.message || 'Error al procesar el PDF';
      setError(message);
      setPhase('error');
      return null;
    } finally {
      uploadingRef.current = false;
    }
  }, [validateFile]);

  // ── Reset to upload another ────────────────────────────

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setError(null);
    setValidationError(null);
    setFileName(null);
    uploadingRef.current = false;
  }, []);

  // ── Computed ───────────────────────────────────────────

  const isUploading = phase === 'uploading';
  const isDone = phase === 'done';
  const hasError = phase === 'error';

  return {
    // State
    phase,
    result,
    error,
    validationError,
    fileName,

    // Computed
    isUploading,
    isDone,
    hasError,

    // Actions
    upload,
    reset,
    validateFile,
  };
}
