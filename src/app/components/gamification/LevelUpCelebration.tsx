// ============================================================
// Axon — Level Up Celebration (STUB)
//
// Minimal stub to unblock quiz build after PR #63 merge.
// Shows a simple level-up overlay with dismiss.
//
// Consumed by:
//   - QuizResults.tsx (direct import)
//   - QuizTaker.tsx (via barrel index.ts)
//
// TODO: Replace with premium celebration with confetti (Sprint G5).
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';

interface LevelUpCelebrationProps {
  newLevel: number;
  previousLevel: number;
  show: boolean;
  onClose: () => void;
}

export function LevelUpCelebration({ newLevel, previousLevel, show, onClose }: LevelUpCelebrationProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)',
              border: '2px solid #5eead4',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Sparkles size={40} className="text-white" />
            </div>

            <h2 className="text-2xl text-teal-900 mb-2" style={{ fontWeight: 800 }}>
              Nivel {newLevel}!
            </h2>
            <p className="text-sm text-teal-600 mb-6">
              Subiste del nivel {previousLevel} al {newLevel}
            </p>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-white text-sm transition-colors"
              style={{ fontWeight: 700, background: '#0d9488' }}
            >
              Continuar
            </button>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-teal-200/50 transition-colors"
              aria-label="Cerrar celebracion"
            >
              <X size={16} className="text-teal-600" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
