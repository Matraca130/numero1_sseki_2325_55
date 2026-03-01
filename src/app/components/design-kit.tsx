/**
 * AXON v4.4 — DESIGN KIT PORTABLE
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Menu,
  Bell,
  Flame,
  Zap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Play,
  Clock,
  BookOpen,
  CheckCircle2,
  Circle,
  X,
  List,
  Lightbulb,
  Video,
  Star,
  PartyPopper,
  Layers,
  ArrowRight,
  Sparkles,
  Eye,
  type LucideIcon,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   1. TOKENS
   ═══════════════════════════════════════════════════════════════════ */

export const tokens = {
  bg: {
    page: "bg-zinc-50",
    card: "bg-white",
    hero: "bg-gradient-to-br from-teal-800 via-teal-900 to-teal-950",
    cardDark: "bg-white/[0.07] backdrop-blur-md",
    sidebar: "bg-white",
  },
  border: {
    default: "border-zinc-200",
    card: "border border-zinc-200",
    cardHover: "hover:border-zinc-300",
    dark: "border-white/[0.07]",
    active: "border-teal-300",
    success: "border-emerald-300",
    amber: "border-amber-400/15",
    amberHover: "hover:border-amber-400/30",
  },
  radius: {
    card: "rounded-2xl",
    button: "rounded-xl",
    pill: "rounded-full",
    small: "rounded-lg",
  },
  shadow: {
    card: "shadow-sm",
    cardHover: "hover:shadow-xl hover:shadow-zinc-900/5",
    button: "shadow-lg shadow-teal-600/25",
    amber: "shadow-xl shadow-amber-500/25",
    amberHover: "hover:shadow-amber-500/40",
  },
  status: {
    completed: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", accent: "bg-emerald-500" },
    inProgress: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", accent: "bg-teal-500" },
    notStarted: { bg: "bg-zinc-100", text: "text-zinc-500", border: "border-zinc-200", accent: "bg-zinc-300" },
  },
  mastery: {
    new: { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-300", label: "Nuevo" },
    learning: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Aprendiendo" },
    reviewing: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", label: "Repasando" },
    known: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", label: "Conocido" },
    mastered: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300", label: "Dominado" },
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════
   2. UTILIDADES
   ═══════════════════════════════════════════════════════════════════ */

export const focusRing = "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none";

export function useFadeUp() {
  const shouldReduce = useReducedMotion();
  return useCallback(
    (delay: number) =>
      shouldReduce
        ? {}
        : {
            initial: { y: 20, opacity: 0 } as const,
            animate: { y: 0, opacity: 1 } as const,
            transition: { duration: 0.5, delay },
          },
    [shouldReduce]
  );
}

export { useReducedMotion as useReducedMotionSafe } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════
   3. PRIMITIVOS
   ═══════════════════════════════════════════════════════════════════ */

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
      <div className="absolute inset-0 flex items-center justify-center">
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

/* ═══════════════════════════════════════════════════════════════════
   4. NAVEGACION
   ═══════════════════════════════════════════════════════════════════ */

export function Breadcrumb({
  items,
  onItemClick,
  className = "",
}: {
  items: string[];
  onItemClick?: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-zinc-500 ${className}`}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-400" />}
          {onItemClick && i < items.length - 1 ? (
            <button
              onClick={() => onItemClick(i)}
              className={`hover:text-zinc-800 cursor-pointer ${focusRing} rounded px-1`}
              style={{ fontWeight: 500 }}
            >
              {item}
            </button>
          ) : (
            <span
              className={i === items.length - 1 ? "text-zinc-800" : ""}
              style={i === items.length - 1 ? { fontWeight: 600 } : { fontWeight: 500 }}
            >
              {item}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   5. LAYOUTS
   ═══════════════════════════════════════════════════════════════════ */

export function HeroSection({ children }: { children: ReactNode }) {
  const shouldReduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-800 via-teal-900 to-teal-950" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(153,246,228,0.8) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      {!shouldReduce && (
        <>
          <motion.div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-400/15 blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, 15, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}

export function ContentCard({
  children,
  accentColor,
  onClick,
  className = "",
  status,
}: {
  children: ReactNode;
  accentColor?: string;
  onClick?: () => void;
  className?: string;
  status?: "completed" | "in-progress" | "not-started";
}) {
  const shouldReduce = useReducedMotion();
  const borderClass = status
    ? status === "completed"
      ? "border-2 border-emerald-300 hover:border-emerald-400"
      : status === "in-progress"
        ? "border-2 border-teal-300 hover:border-teal-400 hover:shadow-lg"
        : "border-2 border-zinc-200 hover:border-zinc-400 hover:shadow-md"
    : `border ${tokens.border.default} ${tokens.border.cardHover}`;

  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      onClick={onClick}
      className={`bg-white ${borderClass} rounded-2xl p-5 text-left ${tokens.shadow.cardHover} transition-all relative overflow-hidden group ${onClick ? `cursor-pointer ${focusRing}` : ""} ${className}`}
      whileHover={shouldReduce ? undefined : { y: onClick ? -4 : 0 }}
    >
      {accentColor && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
      )}
      {status === "completed" && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />}
      {status === "in-progress" && <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />}

      {children}

      {onClick && (
        <motion.div className="absolute bottom-4 right-4 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-4 h-4 text-zinc-600" />
        </motion.div>
      )}
    </Wrapper>
  );
}

export function StatCard({
  label,
  value,
  sub,
  Icon,
  accent = "text-teal-300",
  delay = 0,
}: {
  label: string;
  value: string;
  sub: string;
  Icon: LucideIcon;
  accent?: string;
  delay?: number;
}) {
  const fadeUp = useFadeUp();
  return (
    <motion.div
      className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.07] rounded-xl px-4 py-3.5"
      {...fadeUp(delay)}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <span className="text-[11px] text-zinc-400" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <p className="text-xl text-white tracking-tight" style={{ fontWeight: 700 }}>{value}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5" style={{ fontWeight: 400 }}>{sub}</p>
    </motion.div>
  );
}

export function SectionHeader({
  icon,
  iconBg = "bg-zinc-900",
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500" style={{ fontWeight: 400 }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function ContinueReadingCard({
  title,
  breadcrumbItems,
  currentPage,
  totalPages,
  estimatedMinutes,
  lastReadAt,
  onClick,
}: {
  title: string;
  breadcrumbItems: string[];
  currentPage: number;
  totalPages: number;
  estimatedMinutes: number;
  lastReadAt: string;
  onClick?: () => void;
}) {
  const shouldReduce = useReducedMotion();
  const fadeUp = useFadeUp();
  const progress = currentPage / totalPages;

  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left mt-8 bg-white/[0.07] backdrop-blur-md border border-amber-400/15 rounded-2xl p-6 hover:bg-white/[0.12] hover:border-amber-400/30 transition-all group cursor-pointer relative overflow-hidden ${focusRing}`}
      {...fadeUp(0.4)}
      whileHover={shouldReduce ? undefined : { y: -3 }}
    >
      <div className="flex items-start gap-6 pl-4">
        <div className="absolute left-2.5 top-5 bottom-5 flex flex-col items-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => {
            const isRead = i < currentPage;
            const isCurrent = i === currentPage - 1;
            return (
              <motion.div
                key={i}
                className={`w-1.5 flex-1 rounded-full ${
                  isRead ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" : "bg-white/10"
                }`}
                initial={shouldReduce ? false : { scaleY: 0 }}
                animate={{
                  scaleY: 1,
                  opacity: isCurrent && !shouldReduce ? [0.6, 1, 0.6] : 1,
                }}
                transition={{
                  scaleY: { delay: 0.5 + i * 0.08, duration: 0.3 },
                  opacity: isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined,
                }}
                style={{ originY: 0 }}
              />
            );
          })}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span
              className="text-xs text-amber-200 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/20"
              style={{ fontWeight: 600 }}
            >
              Continuar leyendo
            </span>
            <span className="text-xs text-zinc-400 ml-auto">{lastReadAt}</span>
          </div>

          <h2 className="text-lg text-white mb-1.5 tracking-tight" style={{ fontWeight: 700 }}>
            {title}
          </h2>

          <Breadcrumb items={breadcrumbItems} className="mb-5 text-zinc-400" />

          <div className="flex items-center gap-5">
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-zinc-300" style={{ fontWeight: 500 }}>
                  Pagina {currentPage} de {totalPages}
                </span>
                <span className="text-amber-400" style={{ fontWeight: 700 }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <ProgressBar
                value={progress}
                color="bg-gradient-to-r from-amber-400 to-amber-500"
                className="h-2"
                animated
                dark
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-400" style={{ fontWeight: 500 }}>
              <Clock className="w-3.5 h-3.5" />
              ~{estimatedMinutes} min
            </div>
          </div>
        </div>

        <motion.div
          className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow"
          whileHover={shouldReduce ? undefined : { scale: 1.08, rotate: 3 }}
          whileTap={shouldReduce ? undefined : { scale: 0.95 }}
        >
          <ArrowRight className="w-7 h-7 text-white" />
        </motion.div>
      </div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   6. VIDEO
   ═══════════════════════════════════════════════════════════════════ */

export function VideoThumbnail({
  title,
  thumbnailUrl,
  duration,
  watchedPercent = 0,
  onClick,
}: {
  title: string;
  thumbnailUrl: string;
  duration: string;
  watchedPercent?: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      className="flex gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer group/video transition-colors"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
        <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/video:bg-black/40 transition-colors">
          <motion.div
            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.15 }}
          >
            <Play className="w-3.5 h-3.5 text-zinc-900 ml-0.5" />
          </motion.div>
        </div>
        <span
          className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[10px] rounded"
          style={{ fontWeight: 600 }}
        >
          {duration}
        </span>
        {watchedPercent > 0 && watchedPercent < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
            <div className="h-full bg-red-500" style={{ width: `${watchedPercent}%` }} />
          </div>
        )}
        {watchedPercent === 100 && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-xs text-zinc-900 leading-snug line-clamp-2" style={{ fontWeight: 600 }}>
          {title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {watchedPercent === 100 ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 600 }}>
              <Eye className="w-3 h-3" /> Visto
            </span>
          ) : watchedPercent > 0 ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 600 }}>
              <Clock className="w-3 h-3" /> {watchedPercent}% visto
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500" style={{ fontWeight: 500 }}>{duration}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function VideoBanner({
  title,
  duration,
  subtitle,
  onPlay,
  onDismiss,
}: {
  title: string;
  duration: string;
  subtitle?: string;
  onPlay?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="bg-violet-700 px-8">
      <div className="max-w-2xl mx-auto py-3 flex items-center gap-4">
        <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate" style={{ fontWeight: 600 }}>
            Video disponible: {title}
          </p>
          {subtitle && (
            <p className="text-xs text-violet-200" style={{ fontWeight: 500 }}>
              {duration} · {subtitle}
            </p>
          )}
        </div>
        <motion.button
          onClick={onPlay}
          className="flex items-center gap-2 px-4 py-2 bg-white text-violet-800 rounded-lg text-sm cursor-pointer shadow-md hover:bg-violet-50 shrink-0"
          style={{ fontWeight: 700 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play className="w-4 h-4" />
          Ver video
        </motion.button>
        {onDismiss && (
          <button onClick={onDismiss} className="p-1 hover:bg-white/10 rounded cursor-pointer">
            <X className="w-4 h-4 text-violet-200" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   7. FEEDBACK
   ═══════════════════════════════════════════════════════════════════ */

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
          <span className="text-xs opacity-90">Pagina completada!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ["#10b981", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#3b82f6"][i % 6],
    delay: Math.random() * 0.5,
    size: 5 + Math.random() * 7,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: "-10px", width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 300, opacity: 0, rotate: 360 + Math.random() * 360, x: (Math.random() - 0.5) * 80 }}
          transition={{ duration: 1.5 + Math.random(), delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

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
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
      >
        <PartyPopper className="w-10 h-10 text-emerald-700 mx-auto mb-3" />
      </motion.div>
      <motion.p className="text-base text-emerald-900 mb-1" style={{ fontWeight: 800 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
        {title}
      </motion.p>
      {subtitle && (
        <motion.p className="text-sm text-emerald-700 mb-2" style={{ fontWeight: 500 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          {subtitle}
        </motion.p>
      )}
      {xpEarned && (
        <motion.div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-amber-900 rounded-full mb-4 shadow-md shadow-amber-400/30"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.6 }}
        >
          <Zap className="w-4 h-4" />
          <span className="text-sm" style={{ fontWeight: 700 }}>+{xpEarned} XP ganados</span>
        </motion.div>
      )}
      {actions.length > 0 && (
        <motion.div className="flex items-center justify-center gap-3" initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
          {actions.map((action) => (
            <motion.button
              key={action.label}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm cursor-pointer ${
                action.variant === "secondary"
                  ? "bg-white border-2 border-emerald-400 text-emerald-800 hover:bg-emerald-50"
                  : "bg-emerald-700 text-white hover:bg-emerald-800 shadow-lg shadow-emerald-700/25"
              }`}
              style={{ fontWeight: 600 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export function MasteryBadge({
  level,
  label,
}: {
  level: "new" | "learning" | "reviewing" | "known" | "mastered";
  label?: string;
}) {
  const m = tokens.mastery[level];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded ${m.bg} ${m.text} border ${m.border}`}
      style={{ fontWeight: 600 }}
    >
      {label || m.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   8. SIDEBAR
   ═══════════════════════════════════════════════════════════════════ */

export function CollapsibleSidebar({
  isOpen,
  children,
  width = 288,
  side = "left",
}: {
  isOpen: boolean;
  children: ReactNode;
  width?: number;
  side?: "left" | "right";
}) {
  const borderSide = side === "left" ? "border-r" : "border-l";
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className={`${borderSide} border-zinc-300 bg-white flex flex-col shrink-0 overflow-hidden`}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   9. READER
   ═══════════════════════════════════════════════════════════════════ */

export function PageDots({
  total,
  current,
  onPageClick,
}: {
  total: number;
  current: number;
  onPageClick: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="navigation" aria-label="Paginas del resumen">
      {Array.from({ length: total }, (_, i) => (
        <motion.button
          key={i}
          onClick={() => onPageClick(i)}
          aria-label={`Ir a pagina ${i + 1}`}
          aria-current={i === current ? "page" : undefined}
          className={`rounded-full transition-all cursor-pointer ${focusRing} ${
            i === current
              ? "bg-teal-600 w-8 h-3"
              : i < current
                ? "bg-teal-400 w-3 h-3 hover:bg-teal-500"
                : "bg-zinc-300 w-3 h-3 hover:bg-zinc-400"
          }`}
          layout
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.3 }}
        />
      ))}
    </div>
  );
}

export function PageNavigation({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onPageClick,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPageClick: (index: number) => void;
}) {
  return (
    <div className="mt-10 pt-6 border-t border-zinc-300">
      <div className="flex items-center justify-between">
        <motion.button
          onClick={onPrev}
          disabled={currentPage === 0}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${
            currentPage === 0
              ? "text-zinc-300 cursor-default"
              : "text-zinc-700 hover:bg-zinc-200 border border-zinc-300"
          }`}
          style={{ fontWeight: 500 }}
          whileHover={currentPage > 0 ? { x: -3 } : undefined}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </motion.button>

        <PageDots total={totalPages} current={currentPage} onPageClick={onPageClick} />

        <motion.button
          onClick={onNext}
          disabled={currentPage === totalPages - 1}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${
            currentPage === totalPages - 1
              ? "text-zinc-300 cursor-default"
              : "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/25"
          }`}
          style={{ fontWeight: 600 }}
          whileHover={currentPage < totalPages - 1 ? { scale: 1.03, x: 3 } : undefined}
          whileTap={currentPage < totalPages - 1 ? { scale: 0.97 } : undefined}
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

export function KeywordPill({
  name,
  definition,
  mastery = "new",
  delay = 0,
}: {
  name: string;
  definition?: string;
  mastery?: "new" | "learning" | "reviewing" | "known" | "mastered";
  delay?: number;
}) {
  const m = tokens.mastery[mastery];
  return (
    <motion.button
      className={`px-3 py-1.5 rounded-lg text-xs border ${m.bg} ${m.text} ${m.border} cursor-pointer`}
      title={definition}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      style={{ fontWeight: 600 }}
    >
      {name}
    </motion.button>
  );
}

export const proseClasses = `prose prose-zinc max-w-none
  [&_h2]:text-xl [&_h2]:text-zinc-900 [&_h2]:mb-4 [&_h2]:mt-0
  [&_h3]:text-base [&_h3]:text-zinc-800 [&_h3]:mb-3 [&_h3]:mt-6
  [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-zinc-700 [&_p]:mb-4
  [&_ul]:text-[15px] [&_ul]:text-zinc-700 [&_ul]:space-y-2 [&_ul]:mb-4
  [&_ol]:text-[15px] [&_ol]:text-zinc-700 [&_ol]:space-y-2 [&_ol]:mb-4
  [&_li]:leading-relaxed
  [&_strong]:text-zinc-900
  [&_em]:text-zinc-600`;