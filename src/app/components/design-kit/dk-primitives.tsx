/**
 * AXON v4.4 — Design Kit: Primitive components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Flame, Zap, CheckCircle2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   3. PRIMITIVOS — Componentes atomicos reutilizables
   ═══════════════════════════════════════════════════════════════════════ */

/** Barra de progreso animada con soporte dark mode */
export function ProgressBar({
  value,
  color = "bg-teal-500",
  className = "",
  animated = false,
  dark = false,
}: {
  value: number;
  color?: string;
  className?: string;
  animated?: boolean;
  dark?: boolean;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <div className={`h-2 ${dark ? "bg-white/10" : "bg-zinc-200"} rounded-full overflow-hidden ${className}`}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={animated && !shouldReduce ? { width: 0 } : false}
        animate={{ width: `${Math.max(value * 100, 0)}%` }}
        transition={
          animated && !shouldReduce
            ? { duration: 1, ease: "easeOut", delay: 0.3 }
            : { duration: shouldReduce ? 0 : 0.4 }
        }
      />
    </div>
  );
}

/** Anillo de progreso circular (para secciones en StudyPlan) */
export function ProgressRing({
  value,
  size = 40,
  stroke = 3.5,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const filled = value === 1;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e4e4e7" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={filled ? "#10b981" : "#14b8a6"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - value) }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {filled ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.5 }}>
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          </motion.div>
        ) : (
          <span className="text-[10px] text-zinc-700" style={{ fontWeight: 700 }}>
            {Math.round(value * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

/** Avatar circular del usuario */
export function UserAvatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-6 h-6 text-[10px]", md: "w-8 h-8 text-xs", lg: "w-11 h-11 text-sm" };
  return (
    <div
      className={`${sizes[size]} bg-teal-600 text-white rounded-full flex items-center justify-center`}
      style={{ fontWeight: 600 }}
    >
      {initials}
    </div>
  );
}

/** Badge de racha (streak) con llama animada */
export function StreakBadge({ days }: { days: number }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full"
      whileHover={shouldReduce ? undefined : { scale: 1.05 }}
    >
      <motion.div
        animate={shouldReduce ? undefined : { rotate: [-5, 5, -5], scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Flame className="w-4 h-4 text-orange-500" />
      </motion.div>
      <span className="text-xs text-orange-700" style={{ fontWeight: 700 }}>
        {days} dias
      </span>
    </motion.div>
  );
}

/** Contador de XP con animacion de conteo */
export function XpCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (shouldReduce) {
      setDisplayValue(value);
      return;
    }
    let current = 0;
    const step = Math.ceil(value / 30);
    const interval = setInterval(() => {
      current += step;
      if (current >= value) {
        current = value;
        clearInterval(interval);
      }
      setDisplayValue(current);
    }, 30);
    return () => clearInterval(interval);
  }, [value, shouldReduce]);

  return (
    <motion.div
      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-full"
      initial={shouldReduce ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
    >
      <Zap className="w-3.5 h-3.5 text-amber-600" />
      <span className="text-xs text-amber-800" style={{ fontWeight: 700 }}>
        {displayValue} XP
      </span>
    </motion.div>
  );
}
