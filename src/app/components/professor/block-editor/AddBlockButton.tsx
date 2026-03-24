import { Plus } from 'lucide-react';
import { useState } from 'react';
import BlockTypeSelector from './BlockTypeSelector';
import type { EduBlockType } from '@/app/services/summariesApi';

interface AddBlockButtonProps {
  afterIndex: number;
  onInsert: (type: EduBlockType, afterIndex: number) => void;
}

export default function AddBlockButton({ afterIndex, onInsert }: AddBlockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group relative flex items-center justify-center py-2">
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed transition-all ${
          isOpen
            ? 'border-violet-400 bg-violet-50 text-violet-600 opacity-100'
            : 'border-gray-300 text-gray-400 opacity-0 group-hover:opacity-100 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600'
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Agregar bloque"
      >
        <Plus className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2">
          <BlockTypeSelector
            onSelect={(type) => {
              onInsert(type, afterIndex);
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
