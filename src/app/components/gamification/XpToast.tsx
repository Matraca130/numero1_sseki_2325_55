// ============================================================
// Axon v4.4 — XP Toast Notification (Premium)
//
// Sprint G1→G3 AUDIT: Premium upgrade with:
//   - Glass morphism background with blur
//   - Multi-particle sparkle animation
//   - Smooth spring physics on entrance
//   - Subtle ring glow behind amount
//   - Haptic-style pulse animation
//
// Props:
//   xpDelta — Amount of XP gained (0 = hidden)
// ============================================================

import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface XpToastProps {
  xpDelta: number;
}

export const XpToast = React.memo(function XpToast({ xpDelta }: XpToastProps) {
  const isVisible = xpDelta > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`xp-toast-${xpDelta}-${Date.now()}`}
          initial={{ opacity: 0, y: -30, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          className="fixed top-5 right-5 z-[9999] flex items-center gap-2.5 pl-3.5 pr-4.5 py-3 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(254,243,199,0.95) 0%, rgba(253,230,138,0.95) 100%)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 40px -8px rgba(245,158,11,0.25), 0 0 0 1px rgba(245,158,11,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          {/* Sparkle icon with rotation */}
          <motion.div
            animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <Sparkles size={18} className="text-amber-600" />
          </motion.div>

          {/* XP amount with emphasised entry */}
          <div className="flex items-baseline gap-1">
            <motion.span
              className="text-amber-900 tabular-nums"
              style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}
              animate={{ scale: [0.6, 1.15, 1] }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              +{xpDelta}
            </motion.span>
            <motion.span
              className="text-amber-700 text-xs"
              style={{ fontWeight: 600 }}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              XP
            </motion.span>
          </div>

          {/* Subtle glow pulse behind toast */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ border: '1.5px solid rgba(245,158,11,0.2)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});
