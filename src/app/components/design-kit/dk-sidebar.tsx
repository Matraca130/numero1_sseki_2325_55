/**
 * AXON v4.4 — Design Kit: Sidebar components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════
   8. SIDEBAR — Sidebar colapsable con arbol de navegacion
   ═══════════════════════════════════════════════════════════════════════ */

/** Sidebar colapsable con animacion */
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
