// ============================================================
// Axon — ConnectForm (inline keyword connection creator)
//
// Extracted from KeywordPopup.tsx in Phase 2, Step 6.
// Self-contained component: owns all form state (open, search,
// reason, saving). Parent only provides data + invalidation callback.
//
// Business rule (GUIDELINES.md):
//   keyword_a_id < keyword_b_id — canonical order enforced at L39-41.
//   Backend also enforces this (defense in depth).
//
// Tech debt: uses apiCall + useState(saving) instead of useMutation.
// Acceptable for now — will migrate in post-Phase 2 cleanup.
// ============================================================
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Search, X, Link2 } from 'lucide-react';
import { apiCall } from '@/app/lib/api';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// ── Props ─────────────────────────────────────────────────
export interface ConnectFormProps {
  keywordId: string;
  allKeywords: SummaryKeyword[];
  existingConnectionIds: Set<string>;
  onCreated: () => void;
}

// ── Component ─────────────────────────────────────────────
export function ConnectForm({
  keywordId,
  allKeywords,
  existingConnectionIds,
  onCreated,
}: ConnectFormProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allKeywords.filter(
      k => k.id !== keywordId
        && !existingConnectionIds.has(k.id)
        && k.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search, allKeywords, keywordId, existingConnectionIds]);

  const handleCreate = async (targetId: string) => {
    setSaving(true);
    try {
      // F4: Enforce canonical order a < b (per GUIDELINES.md constraint)
      const [aId, bId] = keywordId < targetId
        ? [keywordId, targetId]
        : [targetId, keywordId];

      await apiCall('/keyword-connections', {
        method: 'POST',
        body: JSON.stringify({
          keyword_a_id: aId,
          keyword_b_id: bId,
          relationship: reason.trim() || null,
          connection_type: 'asociacion',
          source_keyword_id: keywordId,
        }),
      });
      toast.success('Conexion creada');
      setSearch('');
      setReason('');
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err.message || 'Error al crear conexion');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-lg text-[10px] text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors"
      >
        <Plus size={11} />
        Crear conexion con otra keyword
      </button>
    );
  }

  return (
    <div className="mt-2 bg-zinc-800/50 rounded-lg border border-zinc-700 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Search size={12} className="text-zinc-500 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar keyword..."
          className="flex-1 text-xs text-zinc-200 bg-transparent border-none outline-none placeholder:text-zinc-600"
          autoFocus
        />
        <button onClick={() => { setOpen(false); setSearch(''); }} className="text-zinc-500 hover:text-zinc-300 p-0.5">
          <X size={12} />
        </button>
      </div>

      {search.trim() && (
        <>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Relacion (opcional, ej: 'causa de...')"
            className="w-full text-[10px] text-zinc-300 bg-zinc-900/50 border border-zinc-700 rounded px-2 py-1.5 placeholder:text-zinc-600 outline-none focus:border-teal-500/50"
          />
          {filtered.length > 0 ? (
            <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
              {filtered.map(kw => (
                <button
                  key={kw.id}
                  onClick={() => handleCreate(kw.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-zinc-700/50 transition-colors disabled:opacity-50"
                >
                  <Link2 size={10} className="text-teal-400 shrink-0" />
                  <span className="text-xs text-zinc-300 truncate">{kw.name}</span>
                  {kw.definition && (
                    <span className="text-[9px] text-zinc-600 truncate ml-auto">{kw.definition.slice(0, 30)}...</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-600 text-center py-1">Sin resultados</p>
          )}
        </>
      )}
    </div>
  );
}