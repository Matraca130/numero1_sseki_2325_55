// ============================================================
// Axon — FlashcardImageUpload (Professor Image Upload)
//
// Upload component for flashcard images (front/back).
// Uses POST /storage/upload → constructs public URL.
// Supports drag & drop, click to select, preview, remove.
//
// Bucket: axon-images (public)
// Folder: flashcards/{userId}/{filename}
// Public URL: https://xdnciktarvxyhkrokbng.supabase.co/storage/v1/object/public/axon-images/{path}
//
// Design: Light theme (bg-white, gray borders) for professor panel.
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { apiCall } from '@/app/lib/api';
import {
  ImagePlus, Trash2, Loader2, AlertCircle, Upload, Image as ImageIcon,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────

const SUPABASE_URL = 'https://xdnciktarvxyhkrokbng.supabase.co';
const STORAGE_BUCKET = 'axon-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ── Props ─────────────────────────────────────────────────

interface FlashcardImageUploadProps {
  side: 'front' | 'back';
  currentImageUrl: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  userId: string;
}

// ── Component ─────────────────────────────────────────────

export function FlashcardImageUpload({
  side,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  userId,
}: FlashcardImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = currentImageUrl || previewUrl;

  // ── Validate file ───────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Formato no soportado. Usa JPG, PNG o WebP.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Archivo muy grande (max ${MAX_FILE_SIZE / 1024 / 1024}MB).`;
    }
    return null;
  };

  // ── Upload file ─────────────────────────────────────────
  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      // Simulate progress since we can't track real upload progress with fetch
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 85));
      }, 200);

      // Build FormData (NOT JSON)
const formData = new FormData();
formData.append('file', file);
formData.append('folder', 'flashcards');

const result = await apiCall<{ path: string }>('/storage/upload', {
  method: 'POST',
  body: formData,
  // ⚠️ NO pongas Content-Type — el browser lo pone solo con el boundary
});

      clearInterval(progressInterval);
      setProgress(100);

      // Construct public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${result.path}`;
      onImageUploaded(publicUrl);

      // Cleanup local preview
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    } catch (err: any) {
      console.error('[FlashcardImageUpload] Upload error:', err);
      setError(err.message || 'Error al subir imagen');
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [userId, onImageUploaded]);

  // ── Handle file select ──────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadFile]);

  // ── Drag & drop handlers ────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  // ── Handle remove ───────────────────────────────────────
  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    onImageRemoved();
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        <ImageIcon size={12} />
        Imagen del {side === 'front' ? 'frente' : 'reverso'}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {displayUrl ? (
        /* ── With image ── */
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img
              src={displayUrl}
              alt={`Imagen ${side}`}
              className="w-full max-h-32 object-contain"
              onError={() => setError('No se pudo cargar la imagen')}
            />
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-violet-500" />
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500">{progress}%</span>
            </div>
          )}

          {/* Remove button */}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
            >
              <Trash2 size={12} />
              Quitar imagen
            </button>
          )}
        </div>
      ) : (
        /* ── Dropzone (no image) ── */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
            dragOver
              ? 'border-violet-400 bg-violet-50/30'
              : 'border-gray-300 hover:border-violet-400 hover:bg-violet-50/10'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            dragOver ? 'bg-violet-100' : 'bg-gray-100'
          }`}>
            <ImagePlus size={20} className={dragOver ? 'text-violet-500' : 'text-gray-400'} />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-600">
              {dragOver ? 'Suelta aqui' : 'Agregar imagen'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Drag & drop o click para seleccionar
            </p>
            <p className="text-[10px] text-gray-400">
              JPG, PNG o WebP (max 5MB)
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

export default FlashcardImageUpload;