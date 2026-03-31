// ============================================================
// Axon — Query Key Factory
//
// Centralized query keys for React Query. Every useQuery in
// the app MUST use keys from here so invalidation is reliable.
//
// Convention: each key is a tuple. Broader prefix → narrower ID.
// This allows invalidation at any level:
//   queryClient.invalidateQueries({ queryKey: ['topic-progress'] })
//     → invalidates ALL topic progress queries
//   queryClient.invalidateQueries({ queryKey: ['topic-progress', 'uuid-123'] })
//     → invalidates only that specific topic
// ============================================================

export const queryKeys = {
  // ── Content (professor-authored, rarely changes) ─────────
  contentTree: (institutionId: string) =>
    ['content-tree', institutionId] as const,

  topicsOverview: (sectionId: string) =>
    ['topics-overview', sectionId] as const,

  // ── Topic → summaries list ──────────────────────────────
  topicSummaries: (topicId: string) =>
    ['topic-summaries', topicId] as const,

  // ── Topic-level progress (student reads summaries) ───────
  topicProgress: (topicId: string) =>
    ['topic-progress', topicId] as const,

  // ── Summary-level data (L4 reader) ──────────────────────
  summaryChunks: (summaryId: string) =>
    ['summary-chunks', summaryId] as const,

  summaryKeywords: (summaryId: string) =>
    ['summary-keywords', summaryId] as const,

  /** Enrichment counts (subtopic + prof-notes) for KeywordsManager */
  keywordCounts: (summaryId: string) =>
    ['keyword-counts', summaryId] as const,

  summaryAnnotations: (summaryId: string) =>
    ['summary-annotations', summaryId] as const,

  summaryBlocks: (summaryId: string) =>
    ['summary-blocks', summaryId] as const,

  blockBookmarks: (summaryId: string) =>
    ['block-bookmarks', summaryId] as const,

  blockNotes: (summaryId: string) =>
    ['block-notes', summaryId] as const,

  summaryVideos: (summaryId: string) =>
    ['summary-videos', summaryId] as const,

  /** Sub-content counts (chunks/keywords/videos) for TopicDetailPanel */
  summarySubCounts: (topicId: string) =>
    ['summary-sub-counts', topicId] as const,

  // ── Reading state (student per-summary) ─────────────────
  readingState: (summaryId: string) =>
    ['reading-state', summaryId] as const,

  // A-1 FIX: Added optional userId to scope cache per student.
  // Without userId → prefix key for invalidation (matches all userId variants).
  // With userId → exact cache per student (prevents stale cross-user data).
  videoNotes: (videoId: string, userId?: string) =>
    userId
      ? ['video-notes', videoId, userId] as const
      : ['video-notes', videoId] as const,

  // ── Keyword-level data (on-demand in L4 reader) ────────
  kwSubtopics: (keywordId: string) =>
    ['kw-subtopics', keywordId] as const,

  kwNotes: (keywordId: string) =>
    ['kw-notes', keywordId] as const,

  kwConnections: (keywordId: string) =>
    ['kw-connections', keywordId] as const,

  /** Student-side connections + 3-phase external kw resolution.
   *  Uses a sub-key so professor flat list doesn't collide,
   *  but prefix invalidation on ['kw-connections', keywordId]
   *  still refreshes both caches automatically. */
  kwConnectionsResolved: (keywordId: string) =>
    ['kw-connections', keywordId, 'resolved'] as const,

  kwProfNotes: (keywordId: string) =>
    ['kw-prof-notes', keywordId] as const,

  /** Keyword suggestions from sibling summaries (same topic) */
  kwSuggestions: (summaryId: string) =>
    ['kw-suggestions', summaryId] as const,

  /** Cross-summary keyword search results */
  kwSearch: (query: string, excludeSummaryId?: string) =>
    ['kw-search', query, excludeSummaryId ?? ''] as const,

  // M-2 FIX: Include summaryId in factory (was manually spread in consumer)
  kwActionCounts: (keywordId: string, summaryId: string) =>
    ['kw-action-counts', keywordId, summaryId] as const,

  // ── Student aggregate data ──────────────────────────────
  // M-5 FIX: bktStates now accepts optional summaryId for scoped fetch.
  // Without summaryId → prefix key for invalidation (matches all variants).
  // With summaryId → scoped cache per summary (only relevant BKT states).
  bktStates: (summaryId?: string) =>
    summaryId
      ? ['bkt-states', summaryId] as const
      : ['bkt-states'] as const,

  summaryKwSubtopics: (summaryId: string) =>
    ['summary-kw-subtopics', summaryId] as const,

  studentStats: () => ['student-stats'] as const,
  dailyActivities: () => ['daily-activities'] as const,
  studySessions: () => ['study-sessions'] as const,

  // ── StudyHub progress (course-level aggregation) ──────
  allReadingStates: () => ['all-reading-states'] as const,
  allBktStates: () => ['all-bkt-states'] as const,
  courseProgress: (courseId: string) => ['course-progress', courseId] as const,
} as const;