// ============================================================
// Axon — Student API: Content (Summaries + Keywords)
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { StudySummary } from '@/app/types/student';
import {
  isCacheValid,
  _keywordCache,
  CACHE_TTL_MS,
  parallelWithLimit,
} from './sa-infra';

// ══════════════════ STUDY SUMMARIES ══════════════════

export async function getStudySummary(
  _studentId: string,
  _courseId: string,
  topicId: string
): Promise<StudySummary | null> {
  try {
    const raw = await apiCall<any>(`/summaries?topic_id=${topicId}`);
    const items = Array.isArray(raw) ? raw : raw?.items || [];
    if (items.length === 0) return null;
    return items[0] as StudySummary;
  } catch {
    return null;
  }
}

export async function getAllSummaries(_studentId?: string): Promise<StudySummary[]> {
  return [];
}

export async function getCourseSummaries(
  _courseId: string,
  _studentId?: string
): Promise<StudySummary[]> {
  return [];
}

export async function saveStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string,
  data: Partial<StudySummary>
): Promise<StudySummary> {
  return data as StudySummary;
}

export async function deleteStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string
): Promise<void> {}

// ═════════════════════ KEYWORDS ═════════════════════

export async function getKeywords(
  _courseId: string,
  _studentId?: string
): Promise<any> {
  return { keywords: {} };
}

export async function getTopicKeywords(
  _courseId: string,
  topicId: string,
  _studentId?: string
): Promise<any> {
  const cacheKey = `topic-kw-${topicId}`;
  const cached = _keywordCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const topicData = await apiCall<any>(`/topic-progress?topic_id=${topicId}`);
    const summaries: any[] = topicData?.summaries || [];

    if (summaries.length === 0) {
      const empty = { keywords: {} };
      _keywordCache.set(cacheKey, { data: empty, expiresAt: Date.now() + CACHE_TTL_MS });
      return empty;
    }

    const summaryIds = summaries.map((s: any) => s.id);
    const keywordTasks = summaryIds.map((sid: string) => () =>
      apiCall<any>(`/keywords?summary_id=${sid}`)
    );
    const kwResults = await parallelWithLimit(keywordTasks, 4);

    let bktMap: Map<string, number> | null = null;
    try {
      const bktRaw = await apiCall<any>('/bkt-states?limit=500');
      const bktItems = Array.isArray(bktRaw) ? bktRaw : bktRaw?.items || [];
      if (bktItems.length > 0) {
        bktMap = new Map();
        for (const b of bktItems) {
          if (b.subtopic_id) bktMap.set(b.subtopic_id, b.p_know || 0);
        }
      }
    } catch {}

    const keywords: Record<string, any> = {};

    for (const result of kwResults) {
      if (result.status !== 'fulfilled') continue;
      const items = Array.isArray(result.value)
        ? result.value
        : result.value?.items || [];

      for (const kw of items) {
        const name = kw.name || kw.id;
        if (!keywords[name]) {
          keywords[name] = {
            term: name,
            definition: kw.definition || '',
            relatedTerms: [],
            masteryLevel: 'red' as const,
            aiQuestions: [],
            category: undefined,
            _keywordId: kw.id,
            _priority: kw.priority || 1,
          };
        }
        if (kw.definition && kw.definition.length > (keywords[name].definition?.length || 0)) {
          keywords[name].definition = kw.definition;
        }
      }
    }

    if (bktMap && bktMap.size > 0) {
      const kwIds = Object.values(keywords)
        .filter((kw: any) => kw._keywordId)
        .map((kw: any) => kw._keywordId);

      if (kwIds.length > 0 && kwIds.length <= 20) {
        const subtopicTasks = kwIds.map((kid: string) => () =>
          apiCall<any>(`/subtopics?keyword_id=${kid}`)
        );
        const subtopicResults = await parallelWithLimit(subtopicTasks, 4);

        const kwIdToName: Record<string, string> = {};
        for (const [name, kw] of Object.entries(keywords)) {
          if ((kw as any)._keywordId) kwIdToName[(kw as any)._keywordId] = name;
        }

        for (let i = 0; i < kwIds.length; i++) {
          const r = subtopicResults[i];
          if (r.status !== 'fulfilled') continue;
          const subtopics = Array.isArray(r.value) ? r.value : r.value?.items || [];
          const kwName = kwIdToName[kwIds[i]];
          if (!kwName) continue;

          let pKnowSum = 0;
          let pKnowCount = 0;
          for (const st of subtopics) {
            const pk = bktMap.get(st.id);
            if (pk !== undefined) { pKnowSum += pk; pKnowCount++; }
          }

          if (pKnowCount > 0) {
            const avgPKnow = pKnowSum / pKnowCount;
            keywords[kwName].masteryLevel =
              avgPKnow >= 0.80 ? 'green' :
              avgPKnow >= 0.50 ? 'yellow' : 'red';
          }
        }
      }
    }

    for (const kw of Object.values(keywords)) {
      delete (kw as any)._keywordId;
      delete (kw as any)._priority;
    }

    const result = { keywords };
    _keywordCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;

  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[studentApi] getTopicKeywords failed:', err);
    }
    return { keywords: {} };
  }
}

export async function saveKeywords(
  _courseId: string,
  _topicId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  return { saved: true };
}

export async function saveCourseKeywords(
  _courseId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  return { saved: true };
}
