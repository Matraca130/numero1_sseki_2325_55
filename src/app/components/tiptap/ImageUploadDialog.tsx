// ============================================================
// Axon — ImageUploadDialog
//
// Dialog for uploading images to Supabase Storage bucket
// `axon-images` under path summaries/{userId}/{filename}.
//
// Supports:
//   - File picker
//   - Drag-and-drop onto dialog
//   - Position selector (left / center / right)
//   - Upload progress indicator
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ImagePlus, Upload, X, Loader2,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import clsx from 'clsx';
import type { ImagePosition } from './extensions/ImageWithPosition';
import { supabase } from '@/app/lib/supabase';

// ── Props ─────────────────────────────────────────────────
interface ImageUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string, position: ImagePosition) => void;
  userId: string;
}

export function ImageUploadDialog({
  open,
  onClose,
  onInsert,
  userId,
}: ImageUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<ImagePosition>('center');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ─────────────────────────────────────────────
  const reset = () => {
    setFile(null);
    setPreview(null);
    setPosition('center');
    setUploading(false);
    setError(null);
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10 MB');
      return;
    }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  // ── Drop handlers ───────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ── Upload to Supabase Storage ──────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `summaries/${userId}/${Date.now()}_${sanitizedName}`;

      // Upload via Supabase JS client (handles auth headers automatically)
      const { data, error: uploadError } = await supabase.storage
        .from('axon-images')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('[Storage] Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      // Get public URL (bucket is PUBLIC for reads)
      const { data: urlData } = supabase.storage
        .from('axon-images')
        .getPublicUrl(data.path);

      onInsert(urlData.publicUrl, position);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ImagePlus size={16} className="text-violet-500" />
              <h3 className="text-sm text-gray-800">Insertar Imagen</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Drop Zone / Preview */}
            {!preview ? (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                )}
              >
                <Upload
                  size={28}
                  className={clsx(
                    'mx-auto mb-3',
                    dragOver ? 'text-violet-500' : 'text-gray-300'
                  )}
                />
                <p className="text-xs text-gray-500 mb-1">
                  Arrastra una imagen aqui o haz click para seleccionar
                </p>
                <p className="text-[10px] text-gray-400">
                  PNG, JPG, GIF, WebP — Max 10 MB
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-52 object-contain rounded-lg border border-gray-200 bg-gray-50"
                />
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white/90 rounded-full border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-white transition-colors"
                >
                  <X size={12} />
                </button>
                <p className="text-[10px] text-gray-400 mt-2 truncate">
                  {file?.name} ({((file?.size ?? 0) / 1024).toFixed(0)} KB)
                </p>
              </div>
            )}

            {/* Position Selector */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">
                Posicion de la imagen
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'left' as ImagePosition, icon: AlignLeft, label: 'Izquierda' },
                  { value: 'center' as ImagePosition, icon: AlignCenter, label: 'Centro' },
                  { value: 'right' as ImagePosition, icon: AlignRight, label: 'Derecha' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPosition(opt.value)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-colors',
                      position === opt.value
                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    <opt.icon size={14} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg transition-colors',
                file && !uploading
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {uploading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={12} />
                  Insertar
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}