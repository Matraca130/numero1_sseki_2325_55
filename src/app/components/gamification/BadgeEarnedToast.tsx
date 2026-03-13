// ============================================================
// Axon — Badge Earned Toast (STUB)
//
// Minimal stub to unblock quiz build after PR #63 merge.
// Shows earned badge names in a simple notification.
//
// Consumed by:
//   - QuizResults.tsx (direct import)
//   - QuizTaker.tsx (via barrel index.ts)
//
// TODO: Replace with premium animated toast (Sprint G5).
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, X } from 'lucide-react';
import type { BadgeWithEarnedStatus } from '@/app/types/gamification';

interface BadgeEarnedToastProps {
  badges: BadgeWithEarnedStatus[];
  onDismiss: () => void;
}

export function BadgeEarnedToast({ badges, onDismiss }: BadgeEarnedToastProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm"
      >
        <div
          className="rounded-2xl p-4 shadow-xl border"
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderColor: '#fbbf24',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
              <Award size={20} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-900" style={{ fontWeight: 700 }}>
                {badges.length === 1 ? 'Badge ganado!' : `${badges.length} badges ganados!`}
              </p>
              {badges.map((b) => (
                <p key={b.id} className="text-xs text-amber-700 mt-0.5 truncate">
                  {b.name}
                </p>
              ))}
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-amber-200/50 transition-colors"
              aria-label="Cerrar notificacion"
            >
              <X size={14} className="text-amber-600" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
