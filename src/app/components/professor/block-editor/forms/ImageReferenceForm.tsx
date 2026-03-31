import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, X, ImagePlus } from 'lucide-react';
import { apiCall, API_BASE } from '@/app/lib/api';
import ResizableImage from '../ResizableImage';
import { type BlockFormProps, inputClass } from './shared';

const SUPABASE_URL = API_BASE.replace('/functions/v1/server', '');
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageReferenceForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const imageUrl = c.image_url as string | undefined;

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload handler ──────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Formato no soportado. Usa JPG, PNG, WebP o GIF.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Imagen muy grande (max 5MB)');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'summaries');

        const result = await apiCall<{ path: string }>('/storage/upload', {
          method: 'POST',
          body: formData,
        });

        const path = result?.path;
        if (!path) {
          throw new Error('Upload succeeded but no path returned');
        }

        const publicUrl = `${STORAGE_BASE}/${path}`;
        onChange('image_url', publicUrl);
        toast.success('Imagen subida');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al subir imagen';
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  // ── File input handler ──────────────────────────────────

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleUpload],
  );

  // ── Drag & drop ─────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleUpload(file);
    },
    [handleUpload],
  );

  // ── Remove image ────────────────────────────────────────

  const handleRemove = useCallback(() => {
    onChange('image_url', '');
  }, [onChange]);

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload area / Preview */}
      {imageUrl ? (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Vista previa
          </label>
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <ResizableImage
              src={imageUrl}
              alt={(c.caption as string) || 'Imagen de referencia'}
              width={(c.image_width as number) || 300}
              height={(c.image_height as number) || 200}
              onResize={(w, h) => {
                onChange('image_width', w);
                onChange('image_height', h);
              }}
            />
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-violet-500" />
              </div>
            )}
          </div>
          {!uploading && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all"
              >
                <Upload size={12} />
                Cambiar imagen
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
              >
                <X size={12} />
                Quitar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Imagen
          </label>
          {uploading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50/30">
              <Loader2 size={24} className="animate-spin text-violet-500" />
              <p className="text-xs text-violet-600 font-medium">
                Subiendo imagen...
              </p>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
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
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  dragOver ? 'bg-violet-100' : 'bg-gray-100'
                }`}
              >
                <ImagePlus
                  size={20}
                  className={dragOver ? 'text-violet-500' : 'text-gray-400'}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-gray-600">
                  {dragOver ? 'Suelta aqui' : 'Subir imagen'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Drag & drop o click para seleccionar
                </p>
                <p className="text-[10px] text-gray-400">
                  JPG, PNG, WebP o GIF (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL fallback input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          O pega una URL
        </label>
        <input
          type="url"
          className={inputClass}
          value={(c.image_url as string) ?? ''}
          onChange={(e) => onChange('image_url', e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Descripción
        </label>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={(c.description as string) ?? ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Descripción de la imagen..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Pie de imagen
        </label>
        <input
          type="text"
          className={inputClass}
          value={(c.caption as string) ?? ''}
          onChange={(e) => onChange('caption', e.target.value)}
          placeholder="Texto debajo de la imagen"
        />
      </div>
    </div>
  );
}
