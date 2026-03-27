import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

/**
 * Compact toggle button that switches between light and dark reader modes.
 * Uses Sun/Moon icons from lucide-react.
 */
export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
      className={`
        inline-flex items-center justify-center
        w-8 h-8 rounded-lg
        transition-colors duration-200
        ${isDark
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
          : 'text-gray-400 hover:text-teal-500 hover:bg-gray-100'
        }
      `}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
