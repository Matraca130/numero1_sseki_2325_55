// ============================================================
// Axon — ModelUploadZone (Professor)
//
// Drag-and-drop file upload zone for .glb/.gltf 3D models.
// Validates format + size client-side, shows progress bar,
// post-upload preview, and re-upload option.
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileCheck, AlertTriangle, X, Loader2, RotateCcw, Box } from 'lucide-react';
import clsx from 'clsx';
import { validateModelFile, formatFileSize } from '@/app/lib/model3d-api';
import type { UploadProgress } from '@/app/lib/model3d-api';

interface ModelUploadZoneProps {
  /** Called when a valid file is selected — parent handles actual upload */
  onFileSelected: (file: File) => void;
  /** Upload progress from parent (driven by uploadAndCreateModel) */
  progress: UploadProgress | null;
  /** Reset to allow new upload */
  onReset: () => void;
  /** Disable interactions */
  disabled?: boolean;
}

export function ModelUploadZone({ onFileSelected, progress, onReset, disabled }: ModelUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = progress?.phase === 'uploading' || progress?.phase === 'saving' || progress?.phase === 'validating';
  const isDone = progress?.phase === 'done';
  const isError = progress?.phase === 'error';

  const handleFile = useCallback(async (file: File) => {
    setValidationError(null);
    setValidationWarning(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);

    const result = await validateModelFile(file);
    if (!result.valid) {
      setValidationError(result.error || 'Archivo no valido');
      return;
    }
    if (result.warning) {
      setValidationWarning(result.warning);
    }

    onFileSelected(file);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, isUploading, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) setIsDragging(true);
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleReset = useCallback(() => {
    setValidationError(null);
    setValidationWarning(null);
    setSelectedFileName(null);
    setSelectedFileSize(0);
    onReset();
  }, [onReset]);

  // ── Done state ──
  if (isDone) {
    return (
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FileCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">{selectedFileName}</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {formatFileSize(selectedFileSize)} · Subido exitosamente
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
          >
            <RotateCcw size={12} />
            Subir otro
          </button>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Error al subir</p>
              <p className="text-xs text-red-600 mt-0.5">{progress?.error || 'Error desconocido'}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            <RotateCcw size={12} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Uploading state ──
  if (isUploading && progress) {
    return (
      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/30 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 size={18} className="text-teal-600 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-teal-800 truncate">{selectedFileName}</p>
            <p className="text-xs text-teal-600 mt-0.5">{progress.message}</p>
          </div>
          <span className="text-xs font-semibold text-teal-700">{progress.percent}%</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-teal-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Default: Drop zone ──
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={clsx(
          'relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-teal-400 bg-teal-50/50 scale-[1.01]'
            : validationError
              ? 'border-red-300 bg-red-50/30'
              : 'border-gray-200 bg-gray-50/50 hover:border-teal-300 hover:bg-teal-50/20',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".glb,.gltf"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center">
          <div className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors',
            isDragging ? 'bg-teal-100' : validationError ? 'bg-red-100' : 'bg-gray-100',
          )}>
            {validationError ? (
              <AlertTriangle size={24} className="text-red-400" />
            ) : (
              <Upload size={24} className={isDragging ? 'text-teal-600' : 'text-gray-400'} />
            )}
          </div>

          {validationError ? (
            <>
              <p className="text-sm text-red-600 font-medium mb-1">{validationError}</p>
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Intentar de nuevo
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-1">
                {isDragging ? (
                  <span className="text-teal-600 font-medium">Suelta el archivo aqui</span>
                ) : (
                  <>
                    <span className="text-teal-600 font-medium">Haz clic para seleccionar</span>{' '}
                    o arrastra un archivo
                  </>
                )}
              </p>
              <p className="text-xs text-gray-400">
                Formatos: .glb, .gltf · Maximo: 100 MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Validation warning */}
      {validationWarning && !validationError && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-700">{validationWarning}</p>
        </div>
      )}
    </div>
  );
}
