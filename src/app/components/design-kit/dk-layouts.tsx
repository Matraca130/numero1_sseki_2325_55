/**
 * AXON v4.4 — Design Kit: Layout components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { tokens, focusRing, useFadeUp } from "./dk-tokens";

/* ═══════════════════════════════════════════════════════════════════════
   5. LAYOUTS — Componentes de estructura
   ═══════════════════════════════════════════════════════════════════════ */

/** HeroSection — gradiente teal con orbs animados. */
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

/** ContentCard — la card elevada premium. */
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
      {accentColor && <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />}
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

/** StatCard — card de estadistica para el hero (sobre fondo oscuro). */
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

/** SectionHeader — encabezado de seccion con icono + titulo + accion opcional. */
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
