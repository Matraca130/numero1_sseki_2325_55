/**
 * AXON v4.4 — Design Kit: Reader components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { tokens, focusRing } from "./dk-tokens";

/* ═══════════════════════════════════════════════════════════════════════
   9. READER — Componentes del lector de resumen
   ═══════════════════════════════════════════════════════════════════════ */

/** Dots de navegacion de paginas */
export function PageDots({ total, current, onPageClick }: { total: number; current: number; onPageClick: (index: number) => void }) {
  return (
    <div className="flex items-center gap-2" role="navigation" aria-label="Paginas del resumen">
      {Array.from({ length: total }, (_, i) => (
        <motion.button
          key={i}
          onClick={() => onPageClick(i)}
          aria-label={`Ir a pagina ${i + 1}`}
          aria-current={i === current ? "page" : undefined}
          className={`rounded-full transition-all cursor-pointer ${focusRing} ${i === current ? "bg-teal-600 w-8 h-3" : i < current ? "bg-teal-400 w-3 h-3 hover:bg-teal-500" : "bg-zinc-300 w-3 h-3 hover:bg-zinc-400"}`}
          layout
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.3 }}
        />
      ))}
    </div>
  );
}

/** Navegacion prev/next de paginas */
export function PageNavigation({ currentPage, totalPages, onPrev, onNext, onPageClick }: { currentPage: number; totalPages: number; onPrev: () => void; onNext: () => void; onPageClick: (index: number) => void }) {
  return (
    <div className="mt-10 pt-6 border-t border-zinc-300">
      <div className="flex items-center justify-between">
        <motion.button onClick={onPrev} disabled={currentPage === 0} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${currentPage === 0 ? "text-zinc-300 cursor-default" : "text-zinc-700 hover:bg-zinc-200 border border-zinc-300"}`} style={{ fontWeight: 500 }} whileHover={currentPage > 0 ? { x: -3 } : undefined}>
          <ChevronLeft className="w-4 h-4" />Anterior
        </motion.button>
        <PageDots total={totalPages} current={currentPage} onPageClick={onPageClick} />
        <motion.button onClick={onNext} disabled={currentPage === totalPages - 1} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${currentPage === totalPages - 1 ? "text-zinc-300 cursor-default" : "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/25"}`} style={{ fontWeight: 600 }} whileHover={currentPage < totalPages - 1 ? { scale: 1.03, x: 3 } : undefined} whileTap={currentPage < totalPages - 1 ? { scale: 0.97 } : undefined}>
          Siguiente<ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

/** KeywordPill — pill interactiva de keyword con color de mastery. */
export function KeywordPill({ name, definition, mastery = "new", delay = 0 }: { name: string; definition?: string; mastery?: "new" | "learning" | "reviewing" | "known" | "mastered"; delay?: number }) {
  const m = tokens.mastery[mastery];
  return (
    <motion.button className={`px-3 py-1.5 rounded-lg text-xs border ${m.bg} ${m.text} ${m.border} cursor-pointer`} title={definition} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} style={{ fontWeight: 600 }}>
      {name}
    </motion.button>
  );
}

/** Prose styles para HTML renderizado (TipTap output) */
export const proseClasses = `prose prose-zinc max-w-none
  [&_h2]:text-xl [&_h2]:text-zinc-900 [&_h2]:mb-4 [&_h2]:mt-0
  [&_h3]:text-base [&_h3]:text-zinc-800 [&_h3]:mb-3 [&_h3]:mt-6
  [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-zinc-700 [&_p]:mb-4
  [&_ul]:text-[15px] [&_ul]:text-zinc-700 [&_ul]:space-y-2 [&_ul]:mb-4
  [&_ol]:text-[15px] [&_ol]:text-zinc-700 [&_ol]:space-y-2 [&_ol]:mb-4
  [&_li]:leading-relaxed
  [&_strong]:text-zinc-900
  [&_em]:text-zinc-600`;
