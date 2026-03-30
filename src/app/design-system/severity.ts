/**
 * Severity tokens for visual indicators in quizzes and mastery.
 * Used by: quiz result indicators, mastery warnings, performance alerts.
 *
 * Usage: import { SEVERITY } from '@/app/design-system'
 */
export const SEVERITY = {
  mild: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    label: 'Mild',
  },
  moderate: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: 'text-orange-500',
    label: 'Moderate',
  },
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-500',
    label: 'Critical',
  },
} as const;

export type SeverityLevel = keyof typeof SEVERITY;
