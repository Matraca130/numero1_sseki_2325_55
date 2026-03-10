// ============================================================
// Axon — KeywordPopup (Student: hub central por keyword)
// Orchestrator: delegates content to 3 child section components.
// Phase 2, Step 8: final cleanup. Data fetching stays here.
// ============================================================
import React, { useState, useMemo, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Layers, Link2, Loader2, X, ChevronDown, BookOpen, Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { MasteryIndicator } from '@/app/components/shared/MasteryIndicator';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import {
  type BktState,
  getKeywordMastery,
} from '@/app/lib/mastery-helpers';
import {
  useKeywordPopupQueries,
  type KeywordConnection,
  type ExternalKeyword,
} from '@/app/hooks/queries/useKeywordPopupQueries';
import { useKeywordMasteryQuery } from '@/app/hooks/queries/useKeywordMasteryQuery';
import { KeywordDefinitionSection } from './KeywordDefinitionSection';
import { KeywordConnectionsSection } from './KeywordConnectionsSection';
import { KeywordActionsSection } from './KeywordActionsSection';

// ── Priority config ───────────────────────────────────────
const priorityConfig: Record<number, { label: string; bg: string; text: string }> = {
  1: { label: 'P1 Baja',  bg: 'bg-zinc-700',  text: 'text-zinc-300' },
  2: { label: 'P2 Media', bg: 'bg-amber-900/50', text: 'text-amber-400' },
  3: { label: 'P3 Alta',  bg: 'bg-red-900/50',   text: 'text-red-400' },
};

// ── CollapsibleSection ──────────────────────────────────
function CollapsibleSection({ icon, title, badge, children, defaultOpen = false, id }: {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800/50 cursor-pointer transition-colors" aria-expanded={isOpen}>
        {icon}
        <span className="text-[11px] text-zinc-400 flex-1 text-left" style={{ fontWeight: 700 }}>{title}</span>
        {badge}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────
interface KeywordPopupProps {
  keyword: SummaryKeyword;
  allKeywords: SummaryKeyword[];
  bktMap: Map<string, BktState>;
  onClose: () => void;
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function KeywordPopup({
  keyword,
  allKeywords,
  bktMap,
  onClose,
  onNavigateKeyword,
}: KeywordPopupProps) {
  // ── React Query: all popup data + mutations ─────────────
  const allKeywordIds = useMemo(() => allKeywords.map(k => k.id), [allKeywords]);
  const {
    subtopics,
    subtopicsLoading,
    connections,
    connectionsLoading,
    externalKws,
    invalidateConnections,
    notes,
    notesLoading,
    createNote,
    updateNote,
    deleteNote,
    isNoteMutating,
    profNotes,
    profNotesLoading,
    flashcardCount,
    quizCount,
  } = useKeywordPopupQueries(keyword.id, allKeywordIds, keyword.summary_id);

  // M-4 FIX: keywordMasteryMap cache hit (instant, 0 requests).
  const { keywordMasteryMap } = useKeywordMasteryQuery(keyword.summary_id);

  // ── Computed values ─────────────────────────────────────
  const kwMastery = useMemo(() => {
    const bkts = subtopics
      .map(s => bktMap.get(s.id))
      .filter((b): b is BktState => b != null);
    return getKeywordMastery(bkts);
  }, [subtopics, bktMap]);

  // Resolve keyword name from local or external sources
  const kwName = (id: string) => {
    const local = allKeywords.find(k => k.id === id);
    if (local) return local.name;
    const ext = externalKws.get(id);
    if (ext) return ext.name;
    return id.slice(0, 8);
  };

  const prio = priorityConfig[keyword.priority] || priorityConfig[2];

  // Cross-summary connections
  const localIds = useMemo(() => new Set(allKeywords.map(k => k.id)), [allKeywords]);

  const crossSummaryConnections = useMemo(() => {
    return connections
      .map(conn => {
        const otherId = conn.keyword_a_id === keyword.id ? conn.keyword_b_id : conn.keyword_a_id;
        if (localIds.has(otherId)) return null;
        const ext = externalKws.get(otherId);
        return ext ? { conn, ext } : null;
      })
      .filter((x): x is { conn: KeywordConnection; ext: ExternalKeyword } => x !== null);
  }, [connections, keyword.id, localIds, externalKws]);

  // ConnectionsMap node data
  const mapNodes = useMemo(() => {
    return connections.map(conn => {
      const otherId = conn.keyword_a_id === keyword.id ? conn.keyword_b_id : conn.keyword_a_id;
      const isLocal = localIds.has(otherId);
      return {
        id: otherId,
        name: kwName(otherId),
        relationship: conn.relationship,
        // M-4 FIX: Use real mastery for local nodes (cache hit from useKeywordMasteryQuery)
        mastery: isLocal ? (keywordMasteryMap.get(otherId) ?? -1) : -1,
        isCrossSummary: !isLocal,
      };
    });
  }, [connections, keyword.id, localIds, externalKws, allKeywords, keywordMasteryMap]);

  // Existing connected IDs (for ConnectForm dedup)
  const existingConnectionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of connections) {
      ids.add(c.keyword_a_id === keyword.id ? c.keyword_b_id : c.keyword_a_id);
    }
    return ids;
  }, [connections, keyword.id]);

  // Close popover then navigate (rAF guarantees popover is unmounted)
  const closeAndNavigate = useCallback(
    (targetKeywordId: string, targetSummaryId: string | undefined) => {
      if (!targetSummaryId || !onNavigateKeyword) {
        toast.info('No se puede navegar a esta keyword');
        return;
      }
      onClose();
      requestAnimationFrame(() => {
        onNavigateKeyword(targetKeywordId, targetSummaryId);
      });
    },
    [onClose, onNavigateKeyword],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full overflow-hidden max-h-[75vh] flex flex-col"
    >
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <MasteryIndicator pMastery={kwMastery} size="lg" variant="ring" />
          <div className="min-w-0">
            <h3 className="text-sm text-zinc-100 truncate">{keyword.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={clsx(
                "inline-block text-[10px] px-1.5 py-0.5 rounded-full",
                prio.bg, prio.text
              )}>
                {prio.label}
              </span>
              {kwMastery >= 0 && (
                <MasteryIndicator pMastery={kwMastery} size="sm" variant="badge" />
              )}
              {kwMastery < 0 && (
                <span className="text-[9px] text-zinc-600 italic">Sin datos de estudio</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -mr-1 -mt-1"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── COLLAPSIBLE SECTIONS ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto border-t border-zinc-800">

        {/* ─── 1. DEFINICION & NOTAS ──────────────────────── */}
        <CollapsibleSection
          icon={<BookOpen size={12} className="text-teal-400" />}
          title="Definicion"
          badge={
            (profNotes.length > 0 || notes.length > 0) ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">
                {profNotes.length + notes.length}
              </span>
            ) : undefined
          }
          defaultOpen
        >
          <KeywordDefinitionSection
            keyword={keyword}
            profNotes={profNotes}
            profNotesLoading={profNotesLoading}
            notes={notes}
            notesLoading={notesLoading}
            isNoteMutating={isNoteMutating}
            createNote={createNote}
            updateNote={updateNote}
            deleteNote={deleteNote}
          />
        </CollapsibleSection>

        {/* ─── 2. SUBTEMAS ────────────────────────────────── */}
        <CollapsibleSection
          icon={<Layers size={12} className="text-amber-400" />}
          title="Subtemas"
          badge={
            !subtopicsLoading ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">{subtopics.length}</span>
            ) : undefined
          }
        >
          {subtopicsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={12} className="animate-spin text-zinc-600" />
              <span className="text-[10px] text-zinc-600">Cargando...</span>
            </div>
          ) : subtopics.length === 0 ? (
            <p className="text-[10px] text-zinc-600 py-1">Sin subtemas definidos</p>
          ) : (
            <div className="space-y-1">
              {subtopics.map(sub => {
                const bkt = bktMap.get(sub.id);
                const pKnow = bkt ? bkt.p_know : -1;
                return (
                  <div key={sub.id} className="flex items-center gap-2 py-1 group">
                    <MasteryIndicator pMastery={pKnow} size="md" variant="dot" />
                    <span className="text-xs text-zinc-300 truncate flex-1">{sub.name}</span>
                    {bkt && bkt.total_attempts > 0 && (
                      <span className="text-[9px] text-zinc-600">
                        {Math.round(pKnow * 100)}%
                      </span>
                    )}
                    {!bkt && (
                      <span className="text-[9px] text-zinc-700 italic">sin datos</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* ─── 3. CONEXIONES ──────────────────────────────── */}
        <CollapsibleSection
          icon={<Link2 size={12} className="text-violet-400" />}
          title="Conexiones"
          badge={
            !connectionsLoading ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">{connections.length}</span>
            ) : undefined
          }
        >
          <KeywordConnectionsSection
            keyword={keyword}
            kwMastery={kwMastery}
            connections={connections}
            connectionsLoading={connectionsLoading}
            allKeywords={allKeywords}
            externalKws={externalKws}
            mapNodes={mapNodes}
            crossSummaryConnections={crossSummaryConnections}
            existingConnectionIds={existingConnectionIds}
            kwName={kwName}
            onCloseAndNavigate={closeAndNavigate}
            onConnectionCreated={invalidateConnections}
          />
        </CollapsibleSection>

        {/* ─── 4. ACCIONES & IA ───────────────────────────── */}
        <CollapsibleSection
          icon={<Zap size={12} className="text-rose-400" />}
          title="Acciones & IA"
          badge={
            flashcardCount !== null && quizCount !== null ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">
                {(flashcardCount || 0) + (quizCount || 0)}
              </span>
            ) : undefined
          }
        >
          <KeywordActionsSection
            keyword={keyword}
            flashcardCount={flashcardCount}
            quizCount={quizCount}
          />
        </CollapsibleSection>
      </div>
    </motion.div>
  );
}