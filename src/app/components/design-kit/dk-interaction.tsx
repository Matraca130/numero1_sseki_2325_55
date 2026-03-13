/**
 * AXON v4.4 — Design Kit: Interaction components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { useState, useEffect, type ReactNode, type RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { tokens } from "./dk-tokens";

/* ═══════════════════════════════════════════════════════════════════════
   10. INTERACTION — Componentes de interaccion
   ═══════════════════════════════════════════════════════════════════════ */

/** CollapsibleSection — wrapper colapsable para secciones de paneles/popovers. */
export function CollapsibleSection({ icon, title, badge, children, defaultOpen = false, id }: { icon: ReactNode; title: string; badge?: ReactNode; children: ReactNode; defaultOpen?: boolean; id?: string }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = id || `section-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="border-b border-zinc-100">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-50/80 cursor-pointer transition-colors" aria-expanded={isOpen} aria-controls={sectionId}>
        {icon}
        <span className="text-[11px] text-zinc-700 flex-1 text-left" style={{ fontWeight: 700 }}>{title}</span>
        {badge}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div id={sectionId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** CountBadge — pill con numero/texto para headers */
export function CountBadge({ count, bg = "bg-zinc-100", color = "text-zinc-600" }: { count: number | string; bg?: string; color?: string }) {
  return (
    <span className={`text-[9px] ${color} ${bg} px-1.5 py-0.5 rounded-full`} style={{ fontWeight: 600 }}>{count}</span>
  );
}

/** SectionLabel — etiqueta de seccion en uppercase */
export function SectionLabel({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {icon}
      <span className="text-[11px] text-zinc-700" style={{ fontWeight: 700 }}>{label}</span>
    </div>
  );
}

/** CommentTagBadge — badge para tags de comentarios del profesor. */
export function CommentTagBadge({ tag }: { tag: "tip" | "mnemonic" | "clinical" | "correction" }) {
  const t = tokens.commentTag[tag];
  return <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${t.bg} ${t.text}`} style={{ fontWeight: 600 }}>{t.label}</span>;
}

/** useDismiss — hook para dismiss con Escape + click afuera. */
export function useDismissEffect(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("mousedown", handleMouseDown); document.removeEventListener("keydown", handleKeyDown); };
  }, [ref, onClose]);
}
