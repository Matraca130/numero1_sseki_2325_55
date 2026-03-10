// ============================================================
// Axon — KeywordConnectionsSection (map + list + cross-summary + create)
//
// Extracted from KeywordPopup.tsx in Phase 2, Step 7b.
// Absorbs renderConnectionItem inline. Parent provides pre-computed
// mapNodes, crossSummaryConnections, existingConnectionIds.
//
// Components used: ConnectionsMap, ConnectForm, ConnectionTypeBadge.
// ============================================================
import React from 'react';
import {
  ExternalLink, FileText, ChevronRight, BookOpen, ArrowRight, Loader2,
} from 'lucide-react';
import { ConnectionsMap } from './ConnectionsMap';
import { ConnectForm } from './ConnectForm';
import { ConnectionTypeBadge } from '@/app/components/shared/ConnectionTypeBadge';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import type {
  KeywordConnection,
  ExternalKeyword,
} from '@/app/hooks/queries/useKeywordPopupQueries';

// ── Props ─────────────────────────────────────────────────
export interface KeywordConnectionsSectionProps {
  keyword: SummaryKeyword;
  kwMastery: number;
  connections: KeywordConnection[];
  connectionsLoading: boolean;
  allKeywords: SummaryKeyword[];
  externalKws: Map<string, ExternalKeyword>;
  mapNodes: Array<{
    id: string;
    name: string;
    relationship?: string;
    mastery: number;
    isCrossSummary: boolean;
  }>;
  crossSummaryConnections: Array<{
    conn: KeywordConnection;
    ext: ExternalKeyword;
  }>;
  existingConnectionIds: Set<string>;
  kwName: (id: string) => string;
  onCloseAndNavigate: (targetId: string, summaryId: string | undefined) => void;
  onConnectionCreated: () => void;
}

// ── Component ─────────────────────────────────────────────
export function KeywordConnectionsSection({
  keyword,
  kwMastery,
  connections,
  connectionsLoading,
  allKeywords,
  externalKws,
  mapNodes,
  crossSummaryConnections,
  existingConnectionIds,
  kwName,
  onCloseAndNavigate,
  onConnectionCreated,
}: KeywordConnectionsSectionProps) {

  // ── Render a single connection row (absorbed from KP) ───
  const renderConnectionItem = (conn: KeywordConnection) => {
    const otherId = conn.keyword_a_id === keyword.id ? conn.keyword_b_id : conn.keyword_a_id;
    const otherLocal = allKeywords.find(k => k.id === otherId);
    const otherExt = externalKws.get(otherId);
    const isCross = !otherLocal && !!otherExt;
    const targetSummaryId = otherLocal?.summary_id || otherExt?.summary_id;

    return (
      <button
        key={conn.id}
        onClick={() => onCloseAndNavigate(otherId, targetSummaryId)}
        className="w-full flex items-center gap-2 py-1.5 px-2 -mx-1 text-left group rounded transition-colors hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20"
      >
        {isCross ? (
          <ExternalLink size={10} className="text-violet-400 shrink-0" />
        ) : (
          <BookOpen size={10} className="text-violet-400 shrink-0" />
        )}
        <span className="text-xs text-zinc-300 truncate group-hover:text-violet-300 group-hover:transition-colors">
          {kwName(otherId)}
        </span>
        {/* F5: Connection type badge (dark variant for student popup) */}
        <ConnectionTypeBadge type={conn.connection_type} variant="dark" />
        {conn.relationship && (
          <>
            <ArrowRight size={8} className="text-zinc-600 shrink-0" />
            <span className="text-[10px] text-zinc-500 italic truncate">{conn.relationship}</span>
          </>
        )}
        <ChevronRight size={10} className="text-zinc-600 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Connections Map SVG */}
      {!connectionsLoading && connections.length > 0 && (
        <ConnectionsMap
          centralKeyword={{
            id: keyword.id,
            name: keyword.name,
            mastery: kwMastery,
          }}
          nodes={mapNodes}
          onNodeClick={(id) => {
            const local = allKeywords.find(k => k.id === id);
            const ext = externalKws.get(id);
            const targetSummaryId = local?.summary_id || ext?.summary_id;
            onCloseAndNavigate(id, targetSummaryId);
          }}
          className="bg-zinc-800/30 rounded-lg"
        />
      )}

      {connectionsLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={12} className="animate-spin text-zinc-600" />
          <span className="text-[10px] text-zinc-600">Cargando...</span>
        </div>
      ) : connections.length === 0 ? (
        <p className="text-[10px] text-zinc-600 py-1">Sin conexiones</p>
      ) : (
        <div className="space-y-0.5">
          {/* F3: Unified connection list (no professor/student split until created_by exists) */}
          {connections.map(renderConnectionItem)}
        </div>
      )}

      {/* Cross-Summary Navigation */}
      {crossSummaryConnections.length > 0 && (
        <div>
          <div className="border-t border-zinc-800 my-2" />
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ExternalLink size={10} />
            Tambien aparece en
          </p>
          <div className="space-y-1">
            {crossSummaryConnections.map(({ conn, ext }) => (
              <button
                key={conn.id}
                onClick={() => onCloseAndNavigate(ext.id, ext.summary_id)}
                className="flex items-center gap-2 py-1.5 w-full text-left group hover:bg-violet-500/10 rounded px-2 -mx-1 transition-colors border border-transparent hover:border-violet-500/20"
              >
                <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center shrink-0">
                  <FileText size={10} className="text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-zinc-300 truncate block group-hover:text-violet-300 transition-colors">
                    {ext.name}
                  </span>
                  {ext.definition && (
                    <span className="text-[9px] text-zinc-600 truncate block">
                      {ext.definition.length > 50 ? ext.definition.slice(0, 48) + '...' : ext.definition}
                    </span>
                  )}
                </div>
                <ChevronRight size={10} className="text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ConnectForm */}
      <ConnectForm
        keywordId={keyword.id}
        allKeywords={allKeywords}
        existingConnectionIds={existingConnectionIds}
        onCreated={onConnectionCreated}
      />
    </div>
  );
}
