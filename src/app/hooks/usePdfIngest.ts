// ============================================================
// Axon — usePdfIngest Hook (v4.5)
//
// PDF upload → summary creation flow for professors.
// BACKEND: POST /ai/ingest-pdf
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { ingestPdf, type PdfIngestResponse } from '@/app/services/aiService';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];

export type PdfIngestPhase = 'idle' | 'validating' | 'uploading' | 'done' | 'error';

export interface PdfValidationError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'NO_FILE';
  message: string;
  details?: { maxSize?: string; actualSize?: string; type?: string };
}

export function usePdfIngest() {
  const [phase, setPhase] = useState<PdfIngestPhase>('idle');
  const [result, setResult] = useState<PdfIngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<PdfValidationError | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const uploadingRef = useRef(false);

  const validateFile = useCallback((file: File): PdfValidationError | null => {
    if (!file) return { code: 'NO_FILE', message: 'No se selecciono ningun archivo.' };
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);
    const isValidExt = ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isValidMime && !isValidExt) {
      return { code: 'INVALID_TYPE', message: 'Solo se aceptan archivos PDF.', details: { type: file.type || 'desconocido' } };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const maxMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      const actualMB = (file.size / (1024 * 1024)).toFixed(1);
      return { code: 'FILE_TOO_LARGE', message: `El archivo excede el limite de ${maxMB}MB (${actualMB}MB).`, details: { maxSize: `${maxMB}MB`, actualSize: `${actualMB}MB` } };
    }
    return null;
  }, []);

  const upload = useCallback(async (
    file: File, institutionId: string, topicId: string, title?: string
  ): Promise<PdfIngestResponse | null> => {
    if (uploadingRef.current) return null;
    setError(null); setValidationError(null); setResult(null); setFileName(file.name);
    setPhase('validating');
    const valError = validateFile(file);
    if (valError) { setValidationError(valError); setPhase('error'); return null; }
    setPhase('uploading');
    uploadingRef.current = true;
    try {
      const response = await ingestPdf(file, institutionId, topicId, title);
      setResult(response); setPhase('done'); return response;
    } catch (err: any) {
      setError(err.message || 'Error al procesar el PDF'); setPhase('error'); return null;
    } finally { uploadingRef.current = false; }
  }, [validateFile]);

  const reset = useCallback(() => {
    setPhase('idle'); setResult(null); setError(null); setValidationError(null); setFileName(null);
    uploadingRef.current = false;
  }, []);

  return { phase, result, error, validationError, fileName, isUploading: phase === 'uploading', isDone: phase === 'done', hasError: phase === 'error', upload, reset, validateFile };
}
