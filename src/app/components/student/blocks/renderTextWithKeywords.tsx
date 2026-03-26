import React from 'react';
import KeywordChip from './KeywordChip';
import type { SummaryKeyword } from '@/app/services/summariesApi';

/**
 * Parses text containing {{keyword_name}} markers and renders them as KeywordChip components.
 * Non-matching text is rendered with paragraph break support (\n\n -> <br/><br/>).
 */
export default function renderTextWithKeywords(
  text: string | undefined,
  keywords: SummaryKeyword[] = [],
): React.ReactNode {
  if (!text) return null;

  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    const match = part.match(/^\{\{(.+)\}\}$/);
    if (match) {
      const kwName = match[1];
      const kw = keywords.find(
        k => k.name.toLowerCase() === kwName.toLowerCase() && k.is_active !== false,
      );
      if (kw) return <KeywordChip key={i} keyword={kw} />;
      // Fallback: render raw text if keyword not found
      return <span key={i}>{kwName}</span>;
    }
    // Preserve paragraph breaks
    return part.split('\n\n').map((p, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <><br /><br /></>}
        {p}
      </React.Fragment>
    ));
  });
}
