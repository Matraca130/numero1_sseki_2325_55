import type { SummaryBlock } from '@/app/services/summariesApi';

export function makeBlock(overrides: Partial<SummaryBlock> & { type: string; content: Record<string, any> }): SummaryBlock {
  return {
    id: 'test-block-1',
    summary_id: 'test-summary-1',
    type: overrides.type,
    content: overrides.content,
    order_index: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as SummaryBlock;
}

export const FORM_FIXTURES = {
  prose: { type: 'prose', content: { title: 'Test Title', content: 'Test content paragraph' } },
  key_point: { type: 'key_point', content: { title: 'Key Concept', content: 'Important info', importance: 'critical' } },
  stages: { type: 'stages', content: { title: 'Process Steps', items: [{ stage: 1, title: 'Step 1', content: 'Do this', severity: 'mild' }, { stage: 2, title: 'Step 2', content: 'Then this', severity: 'critical' }] } },
  comparison: { type: 'comparison', content: { title: 'Comparison Table', headers: ['Feature', 'Option A', 'Option B'], rows: [['Speed', 'Fast', 'Slow'], ['Cost', 'High', 'Low']], highlight_column: 1 } },
  list_detail: { type: 'list_detail', content: { title: 'Risk Factors', intro: 'Key risks:', items: [{ icon: 'Heart', label: 'Hypertension', detail: 'High BP', severity: 'high' }] } },
  grid: { type: 'grid', content: { title: 'Territories', columns: 3, items: [{ icon: 'Heart', label: 'Cardiac', detail: 'Heart area' }] } },
  two_column: { type: 'two_column', content: { columns: [{ title: 'Column A', items: [{ label: 'Item 1', detail: 'Detail 1' }] }, { title: 'Column B', items: [{ label: 'Item 2', detail: 'Detail 2' }] }] } },
  callout: { type: 'callout', content: { variant: 'warning', title: 'Warning Title', content: 'Be careful!' } },
  image_reference: { type: 'image_reference', content: { image_url: 'https://example.com/img.jpg', description: 'A diagram', caption: 'Figure 1' } },
  section_divider: { type: 'section_divider', content: { label: 'Next Section' } },
};
