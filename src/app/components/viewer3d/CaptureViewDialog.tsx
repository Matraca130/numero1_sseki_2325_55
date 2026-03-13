// ============================================================
// Axon — CaptureViewDialog (Professor: Screenshot -> Flashcard)
//
// Allows the professor to capture the current 3D view and
// create a flashcard with the captured image.
//
// Flow:
//   1. Professor clicks "Capturar Vista" button
//   2. Canvas is rendered to PNG via renderer.domElement.toDataURL()
//   3. PNG is uploaded via uploadThumbnail() (reuses /upload-model-3d)
//   4. Professor fills front/back text for flashcard
//   5. Creates flashcard via POST /flashcards with front_image_url
//
// ZERO new backend endpoints — reuses uploadThumbnail + createFlashcard.
// ============================================================

import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import { Camera, X, Save, Loader2, FileText, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { uploadThumbnail } from '@/app/lib/model3d-api';
import { logger } from '@/app/lib/logger';

interface CaptureViewDialogProps {
  modelId: string;
  modelName: string;
  /** Topic ID for flashcard creation context */
  topicId?: string;
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
}

export function CaptureViewDialog({
  modelId,
  modelName,
  topicId,
  renderer,
  scene,
  camera,
}: CaptureViewDialogProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Flashcard form
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [saving, setSaving] = useState(false);

  const captureView = useCallback(() => {
    if (!renderer || !scene || !camera) {
      toast.error('Visor no listo');
      return;
    }

    // Force a clean render
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    setCapturedDataUrl(dataUrl);
    setCapturedUrl(dataUrl);
    setUploadedUrl(null);
    setFront(`${modelName} — Vista`);
    setBack('');
    setShowDialog(true);
  }, [renderer, scene, camera, modelName]);

  const handleUploadAndSave = useCallback(async () => {
    if (!capturedDataUrl || !front.trim()) return;

    setSaving(true);
    try {
      // Step 1: Upload the captured PNG
      let imageUrl = uploadedUrl;
      if (!imageUrl) {
        setUploading(true);
        const blob = await (await fetch(capturedDataUrl)).blob();
        const file = new File([blob], `capture-${modelId}-${Date.now()}.png`, { type: 'image/png' });
        imageUrl = await uploadThumbnail(file, modelId);
        setUploadedUrl(imageUrl);
        setUploading(false);
      }

      // Step 2: Create flashcard via API
      // Note: We need summary_id and keyword_id for the flashcard API.
      // If not available, we store the capture URL for manual flashcard creation.
      if (topicId) {
        try {
          const { apiCall } = await import('@/app/lib/api');
          // Try to get a summary for this topic
          const summaries = await apiCall<{ items?: Array<{ id: string }> }>(`/summaries?topic_id=${topicId}&limit=1`);
          const summaryId = summaries?.items?.[0]?.id;

          if (summaryId) {
            // Get or create "General" keyword
            const { ensureGeneralKeyword } = await import('@/app/lib/api');
            const keyword = await ensureGeneralKeyword(summaryId);

            // Create flashcard with image
            const { createFlashcard } = await import('@/app/services/flashcardApi');
            await createFlashcard({
              summary_id: summaryId,
              keyword_id: keyword.id,
              front: front.trim(),
              back: back.trim() || `Imagen del modelo 3D: ${modelName}`,
              source: 'manual',
              front_image_url: imageUrl,
            });

            toast.success('Flashcard creada con imagen 3D');
            setShowDialog(false);
            resetForm();
            return;
          }
        } catch (err) {
          logger.warn('CaptureView', 'Could not auto-create flashcard:', err);
        }
      }

      // Fallback: just confirm the image was uploaded
      toast.success('Imagen capturada y guardada');
      // Copy URL to clipboard for manual use
      if (imageUrl) {
        await navigator.clipboard.writeText(imageUrl).catch(() => {});
        toast.info('URL de la imagen copiada al portapapeles');
      }
      setShowDialog(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
      setUploading(false);
    } finally {
      setSaving(false);
    }
  }, [capturedDataUrl, front, back, uploadedUrl, modelId, modelName, topicId]);

  const resetForm = useCallback(() => {
    setCapturedUrl(null);
    setCapturedDataUrl(null);
    setUploadedUrl(null);
    setFront('');
    setBack('');
  }, []);

  const handleClose = useCallback(() => {
    setShowDialog(false);
    resetForm();
  }, [resetForm]);

  const handleRecapture = useCallback(() => {
    setUploadedUrl(null);
    captureView();
  }, [captureView]);

  return (
    <>
      {/* Capture button (always visible in professor mode) */}
      <button
        onClick={captureView}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
        title="Capturar vista actual"
      >
        <Camera size={12} />
        Capturar
      </button>

      {/* Dialog overlay */}
      {showDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl w-96 max-h-[90%] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera size={13} className="text-teal-400" />
                Captura de Vista 3D
              </h4>
              <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Preview */}
            <div className="px-4 py-3 space-y-3">
              {capturedUrl && (
                <div className="relative rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={capturedUrl}
                    alt="Vista capturada"
                    className="w-full h-auto"
                  />
                  <button
                    onClick={handleRecapture}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-300 hover:text-white transition-colors"
                    title="Recapturar"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              )}

              {/* Flashcard fields */}
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">
                    <FileText size={9} className="inline mr-1" />
                    Frente (pregunta)
                  </label>
                  <input
                    type="text"
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    placeholder="Ej: Identifica esta estructura..."
                    className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">
                    <FileText size={9} className="inline mr-1" />
                    Reverso (respuesta)
                  </label>
                  <textarea
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    placeholder="Ej: Es el humero proximal, articulacion glenohumeral..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-[10px] text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadAndSave}
                disabled={!front.trim() || saving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={10} className="animate-spin" />
                    {uploading ? 'Subiendo...' : 'Guardando...'}
                  </>
                ) : (
                  <>
                    <Save size={10} />
                    Crear Flashcard
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}