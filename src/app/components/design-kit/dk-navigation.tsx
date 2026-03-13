/**
 * AXON v4.4 — Design Kit: Navigation components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Menu, Bell, ChevronRight } from "lucide-react";
import { focusRing } from "./dk-tokens";
import { StreakBadge, XpCounter } from "./dk-primitives";

/* ═══════════════════════════════════════════════════════════════════════
   4. NAVEGACION — Navbar y Breadcrumb
   ═══════════════════════════════════════════════════════════════════════ */

/** Navbar principal — sticky, glass effect, slots configurables */
export function AppNavbar({
  leftAction,
  breadcrumb,
  rightSlot,
  showStreak = true,
  streakDays = 3,
  showXp = false,
  xpValue = 0,
  showNotifications = true,
  notificationCount = 0,
  compact = false,
  onMenuClick,
}: {
  leftAction?: ReactNode;
  breadcrumb?: ReactNode;
  rightSlot?: ReactNode;
  showStreak?: boolean;
  streakDays?: number;
  showXp?: boolean;
  xpValue?: number;
  showNotifications?: boolean;
  notificationCount?: number;
  compact?: boolean;
  onMenuClick?: () => void;
}) {
  const shouldReduce = useReducedMotion();

  return (
    <nav
      className={`${compact ? "h-12" : "h-14"} bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-6 flex items-center gap-4 sticky top-0 z-50`}
    >
      {leftAction || (
        <button
          onClick={onMenuClick}
          className={`p-1.5 hover:bg-zinc-100 rounded-lg cursor-pointer ${focusRing}`}
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 text-zinc-700" />
        </button>
      )}

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center shadow-sm">
          <span className="text-white text-xs" style={{ fontWeight: 700 }}>A</span>
        </div>
        <span className="text-sm text-zinc-900 tracking-tight" style={{ fontWeight: 700 }}>AXON</span>
      </div>

      {breadcrumb}
      <div className="flex-1" />

      {showXp && <XpCounter value={xpValue} />}
      {showStreak && <StreakBadge days={streakDays} />}

      {showNotifications && (
        <button
          className={`relative p-1.5 hover:bg-zinc-100 rounded-lg cursor-pointer ${focusRing}`}
          aria-label={`Notificaciones${notificationCount > 0 ? ` (${notificationCount} nuevas)` : ""}`}
        >
          <Bell className="w-5 h-5 text-zinc-500" />
          {notificationCount > 0 && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center"
              initial={shouldReduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, delay: 0.8 }}
              style={{ fontWeight: 700 }}
            >
              {notificationCount}
            </motion.span>
          )}
        </button>
      )}

      {rightSlot}
    </nav>
  );
}

/** Breadcrumb — lista de segmentos con chevrons */
export function Breadcrumb({
  items,
  onItemClick,
  className = "",
  dark = false,
}: {
  items: string[];
  onItemClick?: (index: number) => void;
  className?: string;
  dark?: boolean;
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
