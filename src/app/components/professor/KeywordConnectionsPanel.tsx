// ============================================================
// Axon — KeywordConnectionsPanel (Professor: CRUD connections)
//
// Routes: GET /keyword-connections?keyword_id=xxx
//         POST /keyword-connections { keyword_a_id, keyword_b_id, relationship }
//         DELETE /keyword-connections/:id (hard delete)
//
// Canonical order: keyword_a_id < keyword_b_id (lexicographic).
// Backend GET queries BOTH sides (a OR b).
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Plus, Trash2, Loader2, Link2, ArrowRight,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { apiCall } from '@/app/lib/api';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// ── Types ─────────────────────────────────────────────────
interface KeywordConnection {
  id: string;
  keyword_a_id: string;
  keyword_b_id: string;
  relationship: string | null;
  created_at: string;
}

function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

interface KeywordConnectionsPanelProps {
  keywordId: string;
  keywordName: string;
  /** All keywords in this summary (for the destination selector) */
  allKeywords: SummaryKeyword[];
}

export function KeywordConnectionsPanel({
  keywordId,
  keywordName,
  allKeywords,
}: KeywordConnectionsPanelProps) {
  const [connections, setConnections] = useState<KeywordConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [targetKeywordId, setTargetKeywordId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [adding, setAdding] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Available keywords for connection (exclude self + already connected)
  const connectedIds = new Set(
    connections.map(c => c.keyword_a_id === keywordId ? c.keyword_b_id : c.keyword_a_id)
  );
  const availableKeywords = allKeywords.filter(
    k => k.id !== keywordId && !connectedIds.has(k.id) && k.is_active
  );

  // ── Fetch ───────────────────────────────────────────────
  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiCall<any>(`/keyword-connections?keyword_id=${keywordId}`);
      setConnections(extractItems<KeywordConnection>(result));
    } catch (err: any) {
      console.error('[KeywordConnections] fetch error:', err);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [keywordId]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  // ── Add ─────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!targetKeywordId) return;
    setAdding(true);
    try {
      // Canonical order: a < b (lexicographic UUID comparison)
      const a = keywordId < targetKeywordId ? keywordId : targetKeywordId;
      const b = keywordId < targetKeywordId ? targetKeywordId : keywordId;

      await apiCall('/keyword-connections', {
        method: 'POST',
        body: JSON.stringify({
          keyword_a_id: a,
          keyword_b_id: b,
          relationship: relationship.trim() || null,
        }),
      });
      toast.success('Conexion creada');
      setTargetKeywordId('');
      setRelationship('');
      await fetchConnections();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear conexion');
    } finally {
      setAdding(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await apiCall(`/keyword-connections/${deletingId}`, { method: 'DELETE' });
      toast.success('Conexion eliminada');
      setDeletingId(null);
      await fetchConnections();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Resolve keyword name by ID
  const kwName = (id: string) => allKeywords.find(k => k.id === id)?.name || id.slice(0, 8);

  if (loading) {
    return (
      <div className="pl-4 py-2 space-y-2">
        {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}
      </div>
    );
  }

  return (
    <div className="pl-4 py-2">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
        Conexiones ({connections.length})
      </p>

      {/* Connections list */}
      <AnimatePresence mode="popLayout">
        {connections.map(conn => {
          const otherId = conn.keyword_a_id === keywordId ? conn.keyword_b_id : conn.keyword_a_id;
          return (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 py-1.5 group"
            >
              <Link2 size={12} className="text-violet-400 shrink-0" />
              <span className="text-xs text-gray-600 truncate">{kwName(otherId)}</span>
              {conn.relationship && (
                <>
                  <ArrowRight size={10} className="text-gray-300 shrink-0" />
                  <span className="text-[10px] text-gray-400 italic truncate">{conn.relationship}</span>
                </>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setDeletingId(conn.id)}
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

      {/* Add form */}
      {availableKeywords.length > 0 && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <select
            value={targetKeywordId}
            onChange={e => setTargetKeywordId(e.target.value)}
            className="h-7 text-xs bg-white border border-gray-200 rounded px-2 py-1 flex-1 min-w-[120px]"
          >
            <option value="">Conectar con...</option>
            {availableKeywords.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
          <Input
            value={relationship}
            onChange={e => setRelationship(e.target.value)}
            placeholder="Relacion (opcional)"
            className="h-7 text-xs flex-1 min-w-[100px]"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-violet-600"
            onClick={handleAdd}
            disabled={adding || !targetKeywordId}
          >
            {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            <span className="ml-1">Conectar</span>
          </Button>
        </div>
      )}
      {availableKeywords.length === 0 && allKeywords.length > 1 && (
        <p className="text-[10px] text-gray-300 mt-2">Todos los keywords ya estan conectados</p>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={open => { if (!open) setDeletingId(null); }}
        title="Eliminar conexion"
        description="Esta conexion sera eliminada permanentemente."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
