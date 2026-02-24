// ============================================================
// Axon — 3D Model API Client (lib layer)
//
// High-level wrapper over models3dApi.ts service.
// Adds: file upload with validation, progress tracking.
//
// Upload flow:
//   1. Validate format (.glb/.gltf) + size (≤100MB) client-side
//   2. POST /upload-model-3d (multipart/form-data) → { data: { file_url, file_size_bytes, file_format } }
//   3. POST /models-3d { topic_id, title, file_url, file_format, file_size_bytes }
//
// If upload endpoint is unavailable, professor can paste URL manually.
// ============================================================

import { API_BASE, ANON_KEY, getAccessToken } from '@/app/lib/api';
import {
  getModels3D,
  getModel3DById,
  createModel3D,
  updateModel3D,
  deleteModel3D,
  restoreModel3D,
} from '@/app/services/models3dApi';
import type { Model3D } from '@/app/services/models3dApi';

// Re-export CRUD functions as-is
export { getModels3D, getModel3DById, createModel3D, updateModel3D, deleteModel3D, restoreModel3D };
export type { Model3D };

// ── Constants ─────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const WARN_FILE_SIZE_BYTES = 50 * 1024 * 1024;  // 50 MB warning threshold
const ALLOWED_EXTENSIONS = ['.glb', '.gltf'];
const GLB_MAGIC_BYTES = [0x67, 0x6C, 0x54, 0x46]; // "glTF" — first 4 bytes of .glb

// ── Validation ────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validate a 3D model file before upload.
 * Checks extension, size, and magic bytes (for .glb).
 */
export async function validateModelFile(file: File): Promise<ValidationResult> {
  // 1. Check extension
  const name = file.name.toLowerCase();
  const ext = name.substring(name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Formato no soportado: "${ext}". Solo se aceptan archivos .glb y .gltf`,
    };
  }

  // 2. Check size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Archivo demasiado grande: ${formatFileSize(file.size)}. Maximo: ${formatFileSize(MAX_FILE_SIZE_BYTES)}`,
    };
  }

  // 3. Check magic bytes for .glb
  if (ext === '.glb') {
    try {
      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const isGlb = GLB_MAGIC_BYTES.every((b, i) => header[i] === b);
      if (!isGlb) {
        return {
          valid: false,
          error: 'El archivo no es un GLB valido (magic bytes incorrectos)',
        };
      }
    } catch {
      // If we can't read the header, skip magic byte check
    }
  }

  // 4. Size warning
  const warning = file.size > WARN_FILE_SIZE_BYTES
    ? `Archivo grande (${formatFileSize(file.size)}). La carga puede tardar.`
    : undefined;

  return { valid: true, warning };
}

// ── Upload ────────────────────────────────────────────────

export interface UploadProgress {
  phase: 'validating' | 'uploading' | 'saving' | 'done' | 'error';
  percent: number; // 0-100
  message: string;
  error?: string;
}

export interface UploadResult {
  model: Model3D;
  file_url: string;
}

/**
 * Upload a 3D model file to Supabase Storage via the backend,
 * then create the model record.
 *
 * @param file       The .glb/.gltf file
 * @param topicId    Topic to attach the model to
 * @param title      Display title
 * @param onProgress Callback for progress updates
 */
export async function uploadAndCreateModel(
  file: File,
  topicId: string,
  title: string,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  const report = (p: UploadProgress) => onProgress?.(p);

  // ── Phase 1: Validate ──
  report({ phase: 'validating', percent: 0, message: 'Validando archivo...' });
  const validation = await validateModelFile(file);
  if (!validation.valid) {
    const err: UploadProgress = { phase: 'error', percent: 0, message: validation.error!, error: validation.error };
    report(err);
    throw new Error(validation.error);
  }

  // ── Phase 2: Upload to storage ──
  report({ phase: 'uploading', percent: 10, message: 'Subiendo archivo...' });

  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const sanitizedName = sanitizeFilename(file.name);

  const formData = new FormData();
  formData.append('file', file, sanitizedName);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${ANON_KEY}`,
  };
  const token = getAccessToken();
  if (token) {
    headers['X-Access-Token'] = token;
  }
  // NOTE: Do NOT set Content-Type — browser sets it with multipart boundary

  let uploadResponse: { file_url: string; file_size_bytes: number; file_format: string };

  try {
    const xhr = new XMLHttpRequest();
    uploadResponse = await new Promise<typeof uploadResponse>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 80) + 10; // 10-90%
          report({ phase: 'uploading', percent: pct, message: `Subiendo... ${Math.round((e.loaded / e.total) * 100)}%` });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (json?.data) {
              resolve(json.data);
            } else if (json?.file_url) {
              resolve(json);
            } else {
              reject(new Error(json?.error || 'Respuesta inesperada del servidor'));
            }
          } catch {
            reject(new Error('Respuesta no valida del servidor'));
          }
        } else {
          let errMsg = `Error ${xhr.status} al subir archivo`;
          try {
            const json = JSON.parse(xhr.responseText);
            if (json?.error) errMsg = json.error;
          } catch { /* ignore */ }
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Error de red al subir archivo')));
      xhr.addEventListener('abort', () => reject(new Error('Carga cancelada')));

      xhr.open('POST', `${API_BASE}/upload-model-3d`);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.send(formData);
    });
  } catch (err: any) {
    report({ phase: 'error', percent: 0, message: err.message, error: err.message });
    throw err;
  }

  // ── Phase 3: Create model record ──
  report({ phase: 'saving', percent: 92, message: 'Guardando registro...' });

  try {
    const model = await createModel3D({
      topic_id: topicId,
      title,
      file_url: uploadResponse.file_url,
      file_format: uploadResponse.file_format || ext.replace('.', ''),
      file_size_bytes: uploadResponse.file_size_bytes || file.size,
    });

    report({ phase: 'done', percent: 100, message: 'Modelo creado exitosamente' });
    return { model, file_url: uploadResponse.file_url };
  } catch (err: any) {
    report({ phase: 'error', percent: 0, message: err.message, error: err.message });
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────

/** Format bytes to human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Sanitize filename: remove special chars, keep extension */
function sanitizeFilename(name: string): string {
  const ext = name.substring(name.lastIndexOf('.'));
  const base = name.substring(0, name.lastIndexOf('.'));
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
  return `${sanitized || 'model'}${ext.toLowerCase()}`;
}
