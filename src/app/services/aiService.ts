// ============================================================
// Axon — AI Service (BARREL RE-EXPORTER)
// ============================================================
//
// PN-6: This file re-exports everything from ai-service/ sub-files.
// Existing imports are preserved:
//   import { chat, generateFlashcard } from '@/app/services/aiService';
//
// For NEW code, prefer direct imports to reduce coupling:
//   import { chat } from '@/app/services/ai-service/as-chat';
//
// SUB-FILES:
// ├── as-types.ts            — all type/interface exports + handleRateLimitError
// ├── as-chat.ts             — chat, chatText, explainConcept (RAG chat)
// ├── as-generate.ts         — generateFlashcard, generateQuizQuestion (basic)
// ├── as-generate-smart.ts   — generateSmart, preGenerate (Fase 8)
// ├── as-reports.ts          — reportContent, resolveReport, getReportStats, getReports
// ├── as-analytics.ts        — submitRagFeedback, getRagAnalytics, getEmbeddingCoverage
// ├── as-ingest.ts           — ingestPdf, ingestEmbeddings, reChunk
// ├── as-schedule.ts          — aiDistributeTasks, aiRecommendToday, aiReschedule, aiWeeklyInsight
// ============================================================

// Types
export type {
  ChatHistoryEntry,
  RagChatResponse,
  GeneratedFlashcard,
  GeneratedQuestion,
  SmartTargetMeta,
  SmartBulkResponse,
  GenerateParams,
  ReportReason,
  ReportStatus,
  ReportContentType,
  AiContentReport,
  ReportStats,
  ReportListResponse,
  RagAnalytics,
  EmbeddingCoverage,
  PdfIngestResponse,
  IngestTarget,
  IngestResult,
  ReChunkOptions,
  ReChunkResult,
} from './ai-service/as-types';

// Chat (RAG)
export { chat, chatText, chatStream, explainConcept } from './ai-service/as-chat';

// Generate (basic)
export { generateFlashcard, generateQuizQuestion } from './ai-service/as-generate';

// Generate (smart + pre-generate)
export { generateSmart, preGenerate } from './ai-service/as-generate-smart';

// Reports (Fase 8B/8C)
export { reportContent, resolveReport, getReportStats, getReports } from './ai-service/as-reports';

// Analytics & Feedback
export { submitRagFeedback, getRagAnalytics, getEmbeddingCoverage } from './ai-service/as-analytics';

// Ingest (PDF, Embeddings, Re-chunk)
export { ingestPdf, ingestEmbeddings, reChunk } from './ai-service/as-ingest';

// Realtime Voice (Voice Call)
export {
  createRealtimeSession,
  RealtimeVoiceClient,
} from './ai-service/as-realtime';
export type {
  RealtimeSession,
  VoiceCallState,
  AISpeakingState,
  RealtimeCallbacks,
} from './ai-service/as-realtime';

// Schedule Agent (AI study plan scheduling)
export {
  aiDistributeTasks,
  aiRecommendToday,
  aiReschedule,
  aiWeeklyInsight,
} from './ai-service/as-schedule';
export type {
  StudentProfilePayload,
  PlanContextPayload,
  AiDistribution,
  AiRecommendation,
  AiRescheduledTask,
  AiInsight,
  AiScheduleMeta,
  AiScheduleResponse,
} from './ai-service/as-schedule';
