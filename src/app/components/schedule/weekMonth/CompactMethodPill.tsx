// ============================================================
// Compact pill showing a task's study method (icon + label).
// ============================================================
import React from 'react';
import { COMPACT_METHOD_ICONS, METHOD_LABELS, METHOD_PILL } from './types';

export function CompactMethodPill({ method }: { method: string }) {
  const key = method?.toLowerCase?.() ?? '';
  const style = METHOD_PILL[key];
  const icon = COMPACT_METHOD_ICONS[key];
  if (!style) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0 bg-gray-100 text-gray-600 border-gray-200">
        {icon}
        <span>{METHOD_LABELS[key] || method}</span>
      </span>
    );
  }
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0"
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
    >
      <span style={{ color: style.text, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span>{METHOD_LABELS[key] || method}</span>
    </span>
  );
}
