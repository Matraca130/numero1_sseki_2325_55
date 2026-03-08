// ============================================================
// Axon — ConnectionList (Professor: render existing connections)
//
// Pure presentational component extracted from KeywordConnectionsPanel.
// Renders the animated list of keyword connections with type badges,
// direction arrows, and delete buttons.
//
// V4 modularization (split from KeywordConnectionsPanel):
//   - Receives connections as props (no React Query hooks)
//   - Emits onRequestDelete(connectionId) to parent
//   - Contains kwName() helper for resolving display names
// ============================================================
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Link2, ExternalLink, ArrowRight, Trash2,
} from 'lucide-react';
import { getConnectionType } from '@/app/lib/connection-types';
import { ConnectionTypeBadge } from '@/app/components/shared/ConnectionTypeBadge';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import type { KeywordConnection } from '@/app/types/keyword-connections';

// ── Props ─────────────────────────────────────────────────

export interface ConnectionListProps {
  /** The keyword whose connections we are displaying */
  keywordId: string;
  /** Connections fetched by the parent (already filtered to this keyword) */
  connections: KeywordConnection[];
  /** All keywords in the current summary (for local name resolution) */
  allKeywords: SummaryKeyword[];
  /** Called when the user clicks the delete button on a connection */
  onRequestDelete: (connectionId: string) => void;
}

// ── Name resolver ─────────────────────────────────────────

/**
 * Resolve a keyword's display name by ID.
 * Priority: embedded join data from GET response → local Map lookup → truncated UUID.
 */
function kwName(
  id: string,
  kwMap: Map<string, SummaryKeyword>,
  conn?: KeywordConnection,
): string {
  if (conn) {
    if (id === conn.keyword_a_id && conn.keyword_a?.name) return conn.keyword_a.name;
    if (id === conn.keyword_b_id && conn.keyword_b?.name) return conn.keyword_b.name;
  }
  return kwMap.get(id)?.name ?? id.slice(0, 8);
}

// ── Component ─────────────────────────────────────────────

export function ConnectionList({
  keywordId,
  connections,
  allKeywords,
  onRequestDelete,
}: ConnectionListProps) {
  // Pre-build lookup map — O(1) per kwName/isLocal check instead of O(m) find/some.
  const kwMap = useMemo(
    () => new Map(allKeywords.map(k => [k.id, k])),
    [allKeywords],
  );

  return (
    <>
      <AnimatePresence mode="popLayout">
        {connections.map(conn => {
          const otherId = conn.keyword_a_id === keywordId ? conn.keyword_b_id : conn.keyword_a_id;
          const isLocal = kwMap.has(otherId);
          const typeCfg = getConnectionType(conn.connection_type);

          // Direction indicator for directional types
          const isSource = conn.source_keyword_id === keywordId;
          const isTarget = conn.source_keyword_id && conn.source_keyword_id !== keywordId;

          return (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 py-1.5 group"
            >
              {/* Icon: local vs cross-summary */}
              {isLocal ? (
                <Link2 size={12} className="text-violet-400 shrink-0" />
              ) : (
                <ExternalLink size={12} className="text-indigo-400 shrink-0" />
              )}

              {/* Direction arrow for directional connections */}
              {isSource && (
                <ArrowRight size={10} className="text-gray-400 shrink-0" />
              )}
              {isTarget && (
                <ArrowRight size={10} className="text-gray-400 shrink-0 rotate-180" />
              )}

              {/* Keyword name */}
              <span className="text-xs text-gray-600 truncate">{kwName(otherId, kwMap, conn)}</span>

              {/* Connection type badge */}
              {typeCfg && <ConnectionTypeBadge type={conn.connection_type} />}

              {/* Legacy relationship text (for existing connections without type) */}
              {!typeCfg && conn.relationship && (
                <>
                  <ArrowRight size={10} className="text-gray-300 shrink-0" />
                  <span className="text-[10px] text-gray-400 italic truncate">{conn.relationship}</span>
                </>
              )}

              {/* Relationship note (when type exists AND relationship text too) */}
              {typeCfg && conn.relationship && (
                <span className="text-[10px] text-gray-400 italic truncate" title={conn.relationship}>
                  {conn.relationship}
                </span>
              )}

              <div className="flex-1" />
              <button
                onClick={() => onRequestDelete(conn.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar conexion"
              >
                <Trash2 size={12} className="text-red-400 hover:text-red-600" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {connections.length === 0 && (
        <p className="text-[10px] text-gray-300 py-2">Sin conexiones aun</p>
      )}
    </>
  );
}