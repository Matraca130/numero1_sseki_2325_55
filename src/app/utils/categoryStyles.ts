// ============================================================
// Shared calendar event category styles
//
// Previously duplicated in:
//   - KnowledgeHeatmapView.tsx
//   - MasteryDashboardView.tsx
//
// Single source of truth for category → Tailwind class mapping.
// ============================================================

export const CATEGORY_STYLES: Record<string, string> = {
  science: 'bg-blue-500/15 border-l-4 border-l-blue-500 text-blue-900',
  arts: 'bg-pink-500/15 border-l-4 border-l-pink-500 text-pink-900',
  core: 'bg-emerald-500/15 border-l-4 border-l-emerald-500 text-emerald-900',
  activity: 'bg-violet-500/15 border-l-4 border-l-violet-500 text-violet-900',
};