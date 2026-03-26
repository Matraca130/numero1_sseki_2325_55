// ============================================================
// Axon — Block Renderer Test Utilities
//
// Factory + fixtures for block-based summary renderer tests.
// Fixtures match block-schema.json edu block types.
// ============================================================

import type { SummaryBlock } from '../../../../services/summariesApi';

/** Factory — each test only overrides what it cares about */
export function makeBlock(
  overrides: Partial<SummaryBlock> & { type: string; content: Record<string, any> }
): SummaryBlock {
  return {
    id: crypto.randomUUID(),
    summary_id: crypto.randomUUID(),
    order_index: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as SummaryBlock;
}

/** Fixtures — match block-schema.json edu block types */
export const FIXTURES = {
  prose: {
    type: 'prose' as const,
    content: {
      title: 'Introducción a la Aterosclerosis',
      content: 'La {{aterosclerosis}} es una enfermedad inflamatoria crónica de las arterias.',
    },
  },
  key_point: {
    type: 'key_point' as const,
    content: {
      title: 'Concepto Central',
      content: 'Proceso inflamatorio activo, no acumulación pasiva de grasa.',
      importance: 'critical',
    },
  },
  key_point_high: {
    type: 'key_point' as const,
    content: {
      title: 'Punto Importante',
      content: 'El {{endotelio}} regula el tono vascular.',
      importance: 'high',
    },
  },
  stages: {
    type: 'stages' as const,
    content: {
      title: 'Progresión',
      items: [
        { stage: 1, title: 'Disfunción Endotelial', content: 'Daño al endotelio.', severity: 'mild' },
        { stage: 2, title: 'Estría Grasa', content: 'Acumulación de {{macrofagos}}.', severity: 'moderate' },
        { stage: 3, title: 'Placa Vulnerable', content: 'Capa fibrosa delgada.', severity: 'critical' },
      ],
    },
  },
  comparison: {
    type: 'comparison' as const,
    content: {
      title: 'Estable vs Vulnerable',
      headers: ['Característica', 'Estable', 'Vulnerable'],
      rows: [
        ['Capa fibrosa', 'Gruesa', 'Delgada'],
        ['Riesgo', 'Bajo', 'Alto'],
      ],
      highlight_column: 2,
    },
  },
  list_detail: {
    type: 'list_detail' as const,
    content: {
      title: 'Factores de Riesgo',
      intro: 'Principales factores.',
      items: [
        { icon: 'Heart', label: 'Hipertensión', detail: 'Daño mecánico al endotelio', severity: 'critical' },
        { icon: 'Pill', label: 'Dislipidemia', detail: 'LDL elevado', severity: 'critical' },
      ],
    },
  },
  grid: {
    type: 'grid' as const,
    content: {
      title: 'Mediadores',
      columns: 3,
      items: [
        { icon: 'Shield', label: 'TNF-α', detail: 'Citoquina proinflamatoria' },
        { icon: 'Shield', label: 'IL-6', detail: 'Activa fase aguda' },
      ],
    },
  },
  two_column: {
    type: 'two_column' as const,
    content: {
      columns: [
        { title: 'Protectores', items: [{ label: 'HDL', detail: 'Transporte reverso' }] },
        { title: 'Riesgo', items: [{ label: 'LDL oxidado', detail: 'Inicia inflamación' }] },
      ],
    },
  },
  callout_tip: {
    type: 'callout' as const,
    content: { variant: 'tip', title: 'Dato', content: 'El ejercicio aumenta HDL.' },
  },
  callout_warning: {
    type: 'callout' as const,
    content: { variant: 'warning', title: 'Atención', content: 'Síntomas silenciosos.' },
  },
  callout_clinical: {
    type: 'callout' as const,
    content: { variant: 'clinical', title: 'Caso Clínico', content: 'Paciente con dolor precordial.' },
  },
  callout_mnemonic: {
    type: 'callout' as const,
    content: { variant: 'mnemonic', title: 'Mnemotecnia', content: 'ABCDE cardiovascular.' },
  },
  callout_exam: {
    type: 'callout' as const,
    content: { variant: 'exam', title: 'Para el Examen', content: 'Pregunta frecuente.' },
  },
  image_reference: {
    type: 'image_reference' as const,
    content: {
      description: 'Etapas de la placa',
      caption: 'Figura 1',
      image_url: 'https://example.com/placa.png',
    },
  },
  image_reference_empty: {
    type: 'image_reference' as const,
    content: { description: 'Sin imagen' },
  },
  section_divider: {
    type: 'section_divider' as const,
    content: { label: 'Fisiopatología' },
  },
  section_divider_empty: {
    type: 'section_divider' as const,
    content: {},
  },
};
