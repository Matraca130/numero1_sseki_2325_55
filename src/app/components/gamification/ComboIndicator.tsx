// ============================================================
// Axon — ComboIndicator (Correct Answer Streak)
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame } from 'lucide-react';

interface ComboIndicatorProps {
  comboCount: number;
}

export function ComboIndicator({ comboCount }: ComboIndicatorProps) {
  if (comboCount < 3) return null;
  const isHot = comboCount >= 7;
  const isOnFire = comboCount >= 10;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isOnFire ? 'bg-red-500/20 border-red-500/30 text-red-400' : isHot ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'bg-amber-500/15 border-amber-500/25 text-amber-400'}`}
      >
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}>
          <Flame size={14} />
        </motion.div>
        <span className="text-xs tabular-nums" style={{ fontWeight: 700 }}>{comboCount}x</span>
      </motion.div>
    </AnimatePresence>
  );
}
