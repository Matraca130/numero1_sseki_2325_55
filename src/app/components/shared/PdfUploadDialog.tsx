// ============================================================
// Axon — PdfUploadDialog (v4.5, Fase E-4)
//
// Professor dialog for uploading PDFs to create summaries.
// Features drag-and-drop, client validation, upload progress.
//
// USAGE:
//   <PdfUploadDialog
//     open={showUpload}
//     onOpenChange={setShowUpload}
//     institutionId={institutionId}
//     topicId={topicId}
//     onSuccess={(result) => refreshSummaries()}
//   />
//
// BACKEND: POST /ai/ingest-pdf
// Pipeline: PDF → Gemini extract → summary → Storage → chunking
//
// DEPENDENCIES:
//   - usePdfIngest hook
//   - shadcn Dialog, Button, Input, Progress
//   - design-system tokens
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  FileUp,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { usePdfIngest } from '@/app/hooks/usePdfIngest';
import type { PdfIngestResponse } from '@/app/services/aiService';
import { headingStyle } from '@/app/design-system';

// ── Types ────────────────────────────────────────────────

interface PdfUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  topicId: string;
  onSuccess?: (result: PdfIngestResponse) => void;
}

// ── Component ───────────────────────────────────────────

export function PdfUploadDialog({
  open,
  onOpenChange,
  institutionId,
  topicId,
  onSuccess,
}: PdfUploadDialogProps) {
  const {
    phase, result, error, validationError, fileName,
    isUploading, isDone, hasError,
    upload, reset, validateFile,
  } = usePdfIngest();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File selection ─────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    const valError = validateFile(file);
    if (valError) {
      // Show validation error but don't start upload
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    // Auto-set title from filename (without extension)
    const name = file.name.replace(/\.pdf$/i, '');
    setCustomTitle(name);
  }, [validateFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ── Drag & drop ────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ── Upload ─────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    const response = await upload(
      selectedFile,
      institutionId,
      topicId,
      customTitle.trim() || undefined
    );

    if (response) {
      onSuccess?.(response);
    }
  }, [selectedFile, institutionId, topicId, customTitle, upload, onSuccess]);

  // ── Reset on close ─────────────────────────────

  const handleOpenChange = useCallback((next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        reset();
        setSelectedFile(null);
        setCustomTitle('');
        setIsDragOver(false);
      }, 200);
    }
  }, [onOpenChange, reset]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setCustomTitle('');
    reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle style={headingStyle}>
            Subir PDF
          </DialogTitle>
          <DialogDescription>
            Sube un archivo PDF para crear un resumen automaticamente.
            El texto sera extraido con IA y procesado para estudio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isDone && result ? (
            /* ── Success state ──────────────────── */
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>
                  PDF procesado exitosamente
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <DetailRow label="Titulo" value={result.title} />
                <DetailRow label="Archivo" value={result.source_file_name} />
                <DetailRow label="Palabras" value={result.word_count.toLocaleString()} />
                <DetailRow label="Caracteres" value={result.char_count.toLocaleString()} />
                <DetailRow
                  label="Tokens IA"
                  value={`${result.tokens_used.input.toLocaleString()} in / ${result.tokens_used.output.toLocaleString()} out`}
                />
                <DetailRow
                  label="Chunking"
                  value={result.chunking_status === 'started' ? 'En proceso...' : 'Omitido'}
                />
              </div>

              <Button
                className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                onClick={() => handleOpenChange(false)}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            /* ── Upload form ────────────────────── */
            <>
              {/* Drop zone */}
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-8
                    flex flex-col items-center gap-3 cursor-pointer transition-colors
                    ${isDragOver
                      ? 'border-teal-400 bg-teal-50/50'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDragOver ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <FileUp size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>
                      Arrastra un PDF aqui o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Maximo 10MB — Solo archivos PDF
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                /* Selected file card */
                <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-100">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate" style={{ fontWeight: 500 }}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={removeFile}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              {/* Custom title */}
              {selectedFile && (
                <div className="space-y-2">
                  <Label className="text-sm" style={{ fontWeight: 500 }}>
                    Titulo del resumen
                  </Label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Nombre del resumen..."
                    disabled={isUploading}
                  />
                </div>
              )}

              {/* Validation error */}
              {validationError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{validationError.message}</span>
                </div>
              )}

              {/* API error */}
              {hasError && error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Upload button */}
              {selectedFile && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-1.5" />
                      Procesando PDF con IA...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-1.5" />
                      Subir y procesar
                    </>
                  )}
                </Button>
              )}

              {isUploading && (
                <p className="text-xs text-gray-500 text-center">
                  Esto puede tomar hasta 60 segundos dependiendo del tamano del PDF.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-component ──────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800" style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
