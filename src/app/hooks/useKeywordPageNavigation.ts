import { useMemo, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import { convert } from 'html-to-text';

interface KeywordPageNavParams {
  summaryId: string;
  keywords: SummaryKeyword[];
  isHtmlContent: boolean;
  htmlPages: string[];
  textPages: string[][];
  totalPages: number;
  safePage: number;
  contentPage: number;
  setContentPage: (page: number) => void;
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function useKeywordPageNavigation({
  summaryId,
  keywords,
  isHtmlContent,
  htmlPages,
  textPages,
  totalPages,
  safePage,
  contentPage,
  setContentPage,
  onNavigateKeyword,
}: KeywordPageNavParams) {
  const keywordPageMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!keywords.length || totalPages <= 1) return map;

    const pageTexts = isHtmlContent
      ? htmlPages.map(h =>
          convert(h, {
            wordwrap: false,
          }),
        )
      : textPages.map(lines => lines.join('\n'));

    for (const kw of keywords) {
      const needle = kw.name.toLowerCase();
      for (let i = 0; i < pageTexts.length; i++) {
        if (pageTexts[i].toLowerCase().includes(needle)) {
          map.set(kw.id, i);
          break;
        }
      }
    }
    return map;
  }, [keywords, htmlPages, textPages, isHtmlContent, totalPages]);

  const pendingPageNavRef = useRef<{ keywordId: string; summaryId: string } | null>(null);

  useEffect(() => {
    if (!pendingPageNavRef.current) return;
    const { keywordId, summaryId: sid } = pendingPageNavRef.current;
    pendingPageNavRef.current = null;

    const timer = window.setTimeout(() => {
      onNavigateKeyword?.(keywordId, sid);
    }, 500);

    return () => clearTimeout(timer);
  }, [contentPage, onNavigateKeyword]);

  const handleNavigateKeyword = useCallback(
    (keywordId: string, targetSummaryId: string) => {
      if (targetSummaryId === summaryId && totalPages > 1) {
        const targetPage = keywordPageMap.get(keywordId);
        if (targetPage !== undefined && targetPage !== safePage) {
          setContentPage(targetPage);
          pendingPageNavRef.current = { keywordId, summaryId: targetSummaryId };
          toast.info('Navegando a otra pagina del resumen...');
          return;
        }
      }
      onNavigateKeyword?.(keywordId, targetSummaryId);
    },
    [summaryId, totalPages, keywordPageMap, safePage, onNavigateKeyword, setContentPage],
  );

  return { handleNavigateKeyword };
}
