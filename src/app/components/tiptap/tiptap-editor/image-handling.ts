/**
 * Image upload and insertion logic for TipTapEditor.
 * Handles Supabase Storage upload, drag-drop, and paste.
 */

import type { Editor } from '@tiptap/react';
import { supabase } from '@/app/lib/supabase';
import { toast } from 'sonner';

/**
 * Upload a file to Supabase Storage and return its public URL.
 */
export async function uploadToStorage(file: File, userId: string): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Solo: JPG, PNG, WebP, GIF');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('La imagen excede el tamano maximo de 10MB');
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `summaries/${userId}/${Date.now()}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from('axon-images')
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('[Storage] Upload error:', error);
    throw new Error(`Error al subir imagen: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('axon-images')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Upload an image and insert it into the editor at cursor position.
 */
export async function uploadAndInsertImage(
  file: File,
  editor: Editor,
  userId: string,
): Promise<void> {
  try {
    toast.info('Subiendo imagen...');
    const url = await uploadToStorage(file, userId);
    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: file.name } as any)
      .run();
    const { state } = editor;
    const { from } = state.selection;
    const node = state.doc.nodeAt(from - 1);
    if (node?.type.name === 'image') {
      editor.chain().setNodeSelection(from - 1).run();
      editor.commands.updateAttributes('image', { position: 'center' });
    }
    toast.success('Imagen insertada');
  } catch (err: any) {
    toast.error(err.message || 'Error al subir imagen');
  }
}

/**
 * Handle an image dropped into the editor.
 */
export async function handleDropImage(
  file: File,
  editor: Editor,
  userId: string,
): Promise<void> {
  try {
    toast.info('Subiendo imagen...');
    const url = await uploadToStorage(file, userId);
    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: file.name } as any)
      .run();
    toast.success('Imagen insertada');
  } catch (err: any) {
    toast.error(err.message || 'Error al subir imagen');
  }
}
