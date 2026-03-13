// ============================================================
// Axon — XPTimeline (Recent Activity Feed)
// ============================================================

import React, { useEffect, useState } from 'react';
import { Zap, Award, Clock, Loader2 } from 'lucide-react';
import * as gamificationApi from '@/app/services/gamificationApi';
import type { GamificationNotification } from '@/app/services/gamificationApi';

interface XPTimelineProps {
  institutionId: string;
  limit?: number;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const ACTION_LABELS: Record<string, string> = {
  review_flashcard: 'Revision de flashcard',
  review_correct: 'Respuesta correcta',
  complete_session: 'Sesion completada',
  streak_daily: 'Check-in diario',
  quiz_correct: 'Quiz correcto',
};

export function XPTimeline({ institutionId, limit = 8 }: XPTimelineProps) {
  const [items, setItems] = useState<GamificationNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    gamificationApi.getNotifications(institutionId, { limit })
      .then((res) => setItems(res.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [institutionId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={14} className="animate-spin text-zinc-600" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock size={18} className="text-zinc-700 mx-auto mb-2" />
        <p className="text-xs text-zinc-600">Sin actividad reciente</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Clock size={12} className="text-zinc-500" />
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Actividad reciente</span>
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={`${item.type}-${item.timestamp}-${idx}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-800/20 transition-colors">
            {item.type === 'badge' ? <Award size={13} className="text-violet-400 shrink-0" /> : <Zap size={13} className="text-amber-400 shrink-0" />}
            <span className="text-xs text-zinc-400 flex-1 truncate">{item.type === 'badge' ? item.badge_name || 'Logro desbloqueado' : ACTION_LABELS[item.action || ''] || item.action || 'XP ganada'}</span>
            {item.type === 'xp' && item.xp && <span className="text-[10px] text-amber-400/80 tabular-nums shrink-0" style={{ fontWeight: 600 }}>+{item.xp}</span>}
            {item.type === 'badge' && item.badge_rarity && <span className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize shrink-0 ${item.badge_rarity === 'legendary' ? 'bg-amber-500/15 text-amber-400' : item.badge_rarity === 'epic' ? 'bg-violet-500/15 text-violet-400' : 'bg-zinc-700/50 text-zinc-500'}`} style={{ fontWeight: 600 }}>{item.badge_rarity}</span>}
            <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">{timeAgo(item.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
