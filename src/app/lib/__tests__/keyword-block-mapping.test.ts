import { describe, it, expect } from 'vitest';
import { extractKeywordsFromBlock, buildKeywordBlockMap } from '../keyword-block-mapping';
import type { SummaryBlock } from '@/app/services/summariesApi';

function block(id: string, type: string, content: Record<string, any>): SummaryBlock {
  return {
    id, summary_id: 's1', type: type as SummaryBlock['type'], content,
    order_index: 0, is_active: true, created_at: '', updated_at: '',
  };
}

describe('extractKeywordsFromBlock', () => {
  it('extracts 3 keywords from a prose block', () => {
    const b = block('b1', 'prose', {
      body: 'Learn about {{Mitosis}}, {{Meiosis}}, and {{DNA}}.',
    });
    expect(extractKeywordsFromBlock(b)).toEqual(['mitosis', 'meiosis', 'dna']);
  });

  it('extracts keywords from list_detail items', () => {
    const b = block('b2', 'list_detail', {
      items: [
        { title: '{{Alpha}} intro', detail: 'see {{Beta}}' },
        { title: 'plain', detail: '{{Gamma}} here' },
      ],
    });
    expect(extractKeywordsFromBlock(b)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('returns empty array for block with no keywords', () => {
    const b = block('b3', 'prose', { body: 'No keywords here.' });
    expect(extractKeywordsFromBlock(b)).toEqual([]);
  });

  it('deduplicates same keyword in one block', () => {
    const b = block('b4', 'callout', {
      title: '{{Enzyme}} info',
      body: 'The {{enzyme}} is important.',
    });
    expect(extractKeywordsFromBlock(b)).toEqual(['enzyme']);
  });

  it('handles undefined/missing content fields without crashing', () => {
    const b1 = block('b5', 'prose', {});
    expect(extractKeywordsFromBlock(b1)).toEqual([]);

    const b2 = block('b6', 'list_detail', { items: undefined });
    expect(extractKeywordsFromBlock(b2)).toEqual([]);

    const b3 = block('b7', 'stages', {});
    expect(extractKeywordsFromBlock(b3)).toEqual([]);

    const b4 = block('b8', 'key_point', { title: null, explanation: 42 });
    expect(extractKeywordsFromBlock(b4)).toEqual([]);
  });
});

describe('buildKeywordBlockMap', () => {
  it('maps same keyword in 2 blocks bidirectionally', () => {
    const blocks = [
      block('b1', 'prose', { body: '{{Cell}} division' }),
      block('b2', 'callout', { title: '{{Cell}} note', body: '' }),
    ];
    const map = buildKeywordBlockMap('s1', blocks);
    expect(map.keywordToBlocks.get('cell')).toEqual(['b1', 'b2']);
    expect(map.blockToKeywords.get('b1')).toEqual(['cell']);
    expect(map.blockToKeywords.get('b2')).toEqual(['cell']);
  });

  it('builds complete map with 5 mixed blocks', () => {
    const blocks = [
      block('b1', 'prose', { body: '{{Alpha}} and {{Beta}}' }),
      block('b2', 'key_point', { title: '{{Alpha}}', explanation: '{{Gamma}}' }),
      block('b3', 'stages', { stages: [{ title: '{{Delta}}', description: 'step' }] }),
      block('b4', 'two_column', { left: '{{Beta}}', right: 'none' }),
      block('b5', 'section_divider', { label: 'divider' }),
    ];
    const map = buildKeywordBlockMap('s1', blocks);

    expect(map.summaryId).toBe('s1');
    expect(map.mappings).toHaveLength(4); // b5 has no keywords
    expect(map.keywordToBlocks.get('alpha')).toEqual(['b1', 'b2']);
    expect(map.keywordToBlocks.get('beta')).toEqual(['b1', 'b4']);
    expect(map.keywordToBlocks.get('gamma')).toEqual(['b2']);
    expect(map.keywordToBlocks.get('delta')).toEqual(['b3']);
    expect(map.blockToKeywords.get('b1')).toEqual(['alpha', 'beta']);
    expect(map.blockToKeywords.get('b5')).toBeUndefined();
  });
});
