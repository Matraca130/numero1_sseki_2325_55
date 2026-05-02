/**
 * AXON v4.4 — Design Kit: Feedback components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, PartyPopper, type LucideIcon } from "lucide-react";
import { tokens } from "./dk-tokens";

/* ═══════════════════════════════════════════════════════════════════════
   7. FEEDBACK — Toasts, celebraciones, mastery
   ═══════════════════════════════════════════════════════════════════════ */

/** Toast de XP */
export function XpToast({ amount, show }: { amount: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-20 left-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-full shadow-xl shadow-amber-500/30"
          initial={{ y: -20, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: -30, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Zap className="w-4 h-4" />
          <span className="text-sm" style={{ fontWeight: 700 }}>+{amount} XP</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Confetti — particulas de celebracion al completar */
export function Confetti({ show }: { show: boolean }) {
  // Memoize all per-particle randoms so framer-motion sees stable targets.
  // Without this, every parent re-render generated fresh randoms, interrupting
  // the in-flight animation and causing visible jumps mid-confetti.
  // Confetti returns null when !show, so unmount + remount yields a fresh set.
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ["#10b981", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#3b82f6"][i % 6],
        delay: Math.random() * 0.5,
        size: 5 + Math.random() * 7,
        rotate: 360 + Math.random() * 360,
        driftX: (Math.random() - 0.5) * 80,
        duration: 1.5 + Math.random(),
      })),
    [],
  );

  if (!show) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: "-10px", width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 300, opacity: 0, rotate: p.rotate, x: p.driftX }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/** CompletionCard — card de celebracion */
export function CompletionCard({
  title,
  subtitle,
  xpEarned,
  showConfetti = true,
  actions = [],
}: {
  title: string;
  subtitle?: string;
  xpEarned?: number;
  showConfetti?: boolean;
  actions?: { label: string; icon: LucideIcon; onClick: () => void; variant?: "primary" | "secondary" }[];
}) {
  return (
    <motion.div
      className="mt-4 bg-emerald-100 border-2 border-emerald-400 rounded-xl p-6 text-center relative overflow-hidden"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      {showConfetti && <Confetti show />}
      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}>
        <PartyPopper className="w-10 h-10 text-emerald-700 mx-auto mb-3" />
      </motion.div>
      <motion.p className="text-base text-emerald-900 mb-1" style={{ fontWeight: 800 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>{title}</motion.p>
      {subtitle && <motion.p className="text-sm text-emerald-700 mb-2" style={{ fontWeight: 500 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>{subtitle}</motion.p>}
      {xpEarned && (
        <motion.div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-amber-900 rounded-full mb-4 shadow-md shadow-amber-400/30" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.6 }}>
          <Zap className="w-4 h-4" /><span className="text-sm" style={{ fontWeight: 700 }}>+{xpEarned} XP ganados</span>
        </motion.div>
      )}
      {actions.length > 0 && (
        <motion.div className="flex items-center justify-center gap-3" initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
          {actions.map((action) => (
            <motion.button key={action.label} onClick={action.onClick} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm cursor-pointer ${action.variant === "secondary" ? "bg-white border-2 border-emerald-400 text-emerald-800 hover:bg-emerald-50" : "bg-emerald-700 text-white hover:bg-emerald-800 shadow-lg shadow-emerald-700/25"}`} style={{ fontWeight: 600 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <action.icon className="w-4 h-4" />{action.label}
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

/** MasteryBadge — pill de mastery coloreada para keywords (Delta scale). */
export function MasteryBadge({
  level,
  label,
}: {
  level: "gray" | "red" | "yellow" | "green" | "blue";
  label?: string;
}) {
  const m = tokens.mastery[level] ?? tokens.mastery.gray;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded ${m.bg} ${m.text} border ${m.border}`} style={{ fontWeight: 600 }}>
      {label || m.label}
    </span>
  );
}
