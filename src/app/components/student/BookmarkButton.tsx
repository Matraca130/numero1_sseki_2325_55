import { Bookmark, BookmarkCheck } from 'lucide-react';

interface BookmarkButtonProps {
  blockId: string;
  isBookmarked: boolean;
  onToggle: () => void;
}

export default function BookmarkButton({ blockId, isBookmarked, onToggle }: BookmarkButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={isBookmarked ? 'Quitar marcador' : 'Guardar bloque'}
      aria-label={
        isBookmarked
          ? 'Quitar marcador de este bloque'
          : 'Guardar este bloque como marcador'
      }
      aria-pressed={isBookmarked}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg
        transition-colors duration-150
        ${isBookmarked
          ? 'text-teal-500 hover:text-teal-600'
          : 'text-gray-400 hover:text-gray-500'
        }
      `}
    >
      {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
    </button>
  );
}
