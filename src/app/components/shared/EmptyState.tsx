// ============================================================
// Axon — EmptyState
// Reusable empty state placeholder for all views.
// Centered layout with icon, title, description, and optional CTA.
// ============================================================
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { motion } from 'motion/react';

export interface EmptyStateProps {
  /** Lucide icon component to display */
  icon?: LucideIcon;
  /** Primary message */
  title: string;
  /** Secondary description text */
  description?: string;
  /** Optional call-to-action button */
  action?: { label: string; onClick: () => void };
  /** Additional CSS classes on the wrapper */
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <Icon size={48} className="text-gray-300 mb-4" strokeWidth={1.5} />

      <h3
        className="font-semibold text-gray-600 mb-1"
        style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}
      >
        {title}
      </h3>

      {description && (
        <p
          className="text-gray-400 max-w-xs"
          style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}
        >
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2 rounded-full bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
          style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
