/**
 * ImagePopover — Position controls for selected images.
 * Shows alignment buttons and delete option.
 */

import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, Trash2, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import type { ImagePosition } from '../extensions/ImageWithPosition';

interface ImagePopoverProps {
  position: ImagePosition;
  onChangePosition: (pos: ImagePosition) => void;
  onDelete: () => void;
}

export function ImagePopover({ position, onChangePosition, onDelete }: ImagePopoverProps) {
  const imgEl = document.querySelector<HTMLImageElement>(
    '.axon-editor-content .tiptap img.ProseMirror-selectednode'
  );
  if (!imgEl) return null;

  const contentEl = document.querySelector('.axon-editor-content');
  if (!contentEl) return null;

  const imgRect = imgEl.getBoundingClientRect();
  const contentRect = contentEl.getBoundingClientRect();
  const top = imgRect.top - contentRect.top - 48;
  const left = imgRect.left - contentRect.left + imgRect.width / 2;

  return (
    <div
      className="absolute z-20 -translate-x-1/2"
      style={{ top: Math.max(8, top), left }}
    >
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1.5">
        <div className="flex items-center gap-1 pr-1.5 border-r border-gray-200 mr-0.5">
          <GripVertical size={12} className="text-gray-300" />
          <span className="text-[9px] text-gray-400">Arrastra</span>
        </div>

        {([
          { value: 'left' as ImagePosition, icon: AlignLeft, title: 'Izquierda' },
          { value: 'center' as ImagePosition, icon: AlignCenter, title: 'Centro' },
          { value: 'right' as ImagePosition, icon: AlignRight, title: 'Derecha' },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChangePosition(opt.value)}
            title={opt.title}
            className={clsx(
              'p-1.5 rounded transition-colors',
              position === opt.value
                ? 'bg-teal-100 text-teal-700'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
          >
            <opt.icon size={14} />
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
        <button
          onClick={onDelete}
          title="Eliminar imagen"
          className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
