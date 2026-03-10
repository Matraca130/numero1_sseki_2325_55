import React from 'react';
import clsx from 'clsx';

const OPTIONS = [
  { value: 5, label: '5 cards' },
  { value: 10, label: '10 cards', recommended: true },
  { value: 15, label: '15 cards' },
] as const;

export interface AdaptiveCountSelectorProps {
  value: number;
  onChange: (count: number) => void;
  disabled?: boolean;
}

export function AdaptiveCountSelector({ value, onChange, disabled = false }: AdaptiveCountSelectorProps) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Cantidad de flashcards a generar">
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'relative px-4 py-2 rounded-xl text-sm transition-all',
              'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none',
              isSelected
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            style={{ fontWeight: isSelected ? 600 : 500 }}
          >
            {opt.label}
            {'recommended' in opt && opt.recommended && (
              <span
                className={clsx(
                  'absolute -top-1.5 -right-1.5 px-1 py-0.5 text-[9px] rounded-full',
                  isSelected ? 'bg-amber-400 text-amber-900' : 'bg-gray-200 text-gray-500',
                )}
                style={{ fontWeight: 700, lineHeight: 1 }}
              >
                \u2605
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
