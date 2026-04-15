import { motion, useReducedMotion } from 'motion/react';
import type { Zap } from 'lucide-react';

export function StatPill({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
      initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-white" style={{ fontWeight: 700 }}>
          {value}
        </p>
        <p className="text-[10px] text-white/60">{label}</p>
      </div>
    </motion.div>
  );
}

export default StatPill;
