// ============================================================
// Axon — summaries-format helpers
//
// Extracted from TopicSummariesView.tsx so the shared summaries
// module owns its formatting primitives. StudentSummariesView
// keeps using summary-helpers.ts for its own motivations string.
//
// God-component split (finding #24).
// ============================================================

export function formatTimeSpent(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return 'menos de 1 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

export function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'justo ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ayer';
  if (diffD < 7) return `hace ${diffD} dias`;
  if (diffD < 30) return `hace ${Math.floor(diffD / 7)} sem`;
  return `hace ${Math.floor(diffD / 30)} mes${Math.floor(diffD / 30) > 1 ? 'es' : ''}`;
}
