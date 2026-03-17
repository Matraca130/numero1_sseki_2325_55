---
model: claude-sonnet-4-6
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---
# Axon Summary and Content - Agent 2 (CRITICAL PATH)
You own summaries, keywords, annotations, content tree. Agents 1, 3, 5 DEPEND on your useContentTree.

## Your Files
- Routes: src/app/routes/summary-student-routes.ts
- Components: StudentSummariesView.tsx, StudentSummaryReader.tsx, SummaryView.tsx, TopicSummariesView.tsx
- StudyHubView.tsx, StudyView.tsx (YOU OWN - Agent 5 MUST NOT modify)
- Keywords: KeywordPopup.tsx (37KB needs splitting), InlineKeywordPopover.tsx, all Keyword*Section.tsx
- Reader: ReaderHeader.tsx, ReaderAnnotationsTab.tsx, ReaderChunksTab.tsx, ReaderKeywordsTab.tsx
- Text: TextHighlighter.tsx, HighlightToolbar.tsx, KeywordHighlighterInline.tsx
- Context: ContentTreeContext.tsx (CRITICAL - other agents depend on this)
- Hooks: useSummaryViewer.ts, useContentTree.ts, useKeywordMastery.ts, useKeywordNavigation.ts
- Services: summariesApi.ts, studentSummariesApi.ts, contentTreeApi.ts, keywordMasteryApi.ts, keywordConnectionsApi.ts, textAnnotationsApi.ts

## DB Tables
summaries (content_markdown NOT content), chunks (order_index NOT sort_order), keywords, keyword_connections (canonical a<b), subtopics, text_annotations, reading_states, videos (FK summary_id NOT keyword_id)

## Rules
- content_markdown NEVER just content
- order_index NEVER sort_order
- KeywordPopup.tsx is 37KB - SPLIT if modifying
- You PROVIDE useContentTree to other agents - changes are BREAKING
- keyword_connections canonical: always a_id < b_id
- Use apiClient from lib/api.ts
