// ============================================================
// Axon — Panel Visual Constants
// Course card + activity item visual mappings.
// Extracted from StudentDataPanel.tsx for modularization.
// ============================================================
import React from 'react';
import { Play, CheckCircle, FileText } from 'lucide-react';

export const COURSE_VISUALS = [
  { icon: '\u{1F9E0}', bg: 'bg-purple-100', progress: 'bg-purple-500', percent: 'text-purple-600' },
  { icon: '\u{1F33F}', bg: 'bg-[#e6f5f1]', progress: 'bg-axon-accent', percent: 'text-axon-accent' },
  { icon: '\u{1F52C}', bg: 'bg-blue-100', progress: 'bg-blue-500', percent: 'text-blue-600' },
  { icon: '\u{2764}\u{FE0F}', bg: 'bg-pink-100', progress: 'bg-pink-500', percent: 'text-pink-600' },
];

export const ACTIVITY_VISUALS = [
  { icon: <Play size={16} />, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Video de Anatomia', sub: 'Sistema Cardiovascular' },
  { icon: <CheckCircle size={16} />, bg: 'bg-[#e6f5f1]', color: 'text-axon-accent', label: 'Quiz de Histologia', sub: 'Nota: 9.5/10' },
  { icon: <FileText size={16} />, bg: 'bg-amber-100', color: 'text-amber-600', label: 'Nuevo resumen', sub: 'Ciclo de Krebs' },
];