/**
 * Constants for SummaryDetailView keyword management.
 * Priority config and selector options.
 */

export const KW_PRIORITY_CONFIG: Record<number, { border: string; dot: string; label: string }> = {
  0: { border: 'border-l-gray-200', dot: 'bg-gray-300', label: '' },
  1: { border: 'border-l-emerald-400', dot: 'bg-emerald-400', label: 'Baja' },
  2: { border: 'border-l-amber-400', dot: 'bg-amber-400', label: 'Media' },
  3: { border: 'border-l-red-400', dot: 'bg-red-400', label: 'Alta' },
};

export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Baja', active: 'bg-emerald-50 border-emerald-300 text-emerald-700', idle: 'bg-white border-gray-200 text-gray-400', dot: 'bg-emerald-400' },
  { value: 2, label: 'Media', active: 'bg-amber-50 border-amber-300 text-amber-700', idle: 'bg-white border-gray-200 text-gray-400', dot: 'bg-amber-400' },
  { value: 3, label: 'Alta', active: 'bg-red-50 border-red-300 text-red-700', idle: 'bg-white border-gray-200 text-gray-400', dot: 'bg-red-400' },
] as const;
