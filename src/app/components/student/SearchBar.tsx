import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number;
  onClose: () => void;
}

export function SearchBar({ query, onQueryChange, resultCount, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 bg-white border-b border-gray-200 rounded-t-xl">
      <Search className="h-4 w-4 text-gray-400 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Buscar en el resumen..."
        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
      />
      {query && (
        <span className="text-xs text-gray-400 shrink-0">
          {resultCount} resultado{resultCount !== 1 ? 's' : ''}
        </span>
      )}
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
