// ============================================================
// Axon — XPPopup (Animated "+X XP" overlay)
//
// Shows a brief animated popup when XP is earned during review.
// Disappears automatically after animation completes.
// Supports bonus labels ("Flow Zone", "Streak") and combos.
// ============================================================

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Flame } from 'lucide-react';
import type { XPEvent } from '@/app/hooks/useSessionXP';

interface XPPopupProps {
  event: XPEvent | null;
  /** Increments every time a new event fires (to re-trigger animation) */
  eventKey: number;
}

export function XPPopup({ event, eventKey }: XPPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, [eventKey]);

  return (
    <AnimatePresence>
      {visible && event && (
        <motion.div
          key={eventKey}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-2 right-4 pointer-events-none z-50 flex flex-col items-end gap-1"
        >
          {/* Main XP amount */}
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />
            <span
              className="text-amber-400 tabular-nums"
              style={{ fontWeight: 700, fontSize: '1rem' }}
            >
              +{event.xp} XP
            </span>
          </div>

          {/* Bonus label */}
          {event.bonusLabel && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30"
              style={{ fontWeight: 600 }}
            >
              {event.bonusLabel}
            </motion.span>
          )}

          {/* Combo indicator (5+) */}
          {event.comboCount >= 3 && event.isCorrect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="flex items-center gap-1 text-[10px] text-orange-400"
              style={{ fontWeight: 600 }}
            >
              <Flame size={12} />
              <span>{event.comboCount}x combo</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
