/**
 * aiService.test.ts — Comprehensive tests for AI service layer
 *
 * Coverage:
 *   - Chat (RAG): chat(), chatText(), chatStream(), explainConcept()
 *   - Generate: generateFlashcard(), generateQuizQuestion()
 *   - Reports: reportContent(), resolveReport(), getReportStats(), getReports()
 *   - Ingest: ingestPdf(), ingestEmbeddings(), reChunk()
 *   - Analytics: submitRagFeedback(), getRagAnalytics(), getEmbeddingCoverage()
 *
 * Mocks: apiCall, apiCallStream
 * Error scenarios: network errors, rate limits, invalid responses, timeouts
 *
 * Run: npx vitest run src/app/services/__tests__/aiService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the API functions ──────────────────────────────
vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
  apiCallStream: vi.fn(),
}));

import { apiCall, apiCallStream } from '@/app/lib/api';

const mockApiCall = vi.mocked(apiCall);
const mockApiCallStream = vi.mocked(apiCallStream);

// ── Import all AI service functions ─────────────────────

// Chat services
import { chat, chatText, explainConcept, chatStream } from '@/app/services/ai-service/as-chat';

// Generate services
import {
  generateFlashcard,
  generateQuizQuestion,
} from '@/app/services/ai-service/as-generate';

// Report services
import {
  reportContent,
  resolveReport,
  getReportStats,
  getReports,
} from '@/app/services/ai-service/as-reports';

// Ingest services
import { ingestPdf, ingestEmbeddings, reChunk } from '@/app/services/ai-service/as-ingest';

// Analytics services
import {
  submitRagFeedback,
  getRagAnalytics,
  getEmbeddingCoverage,
} from '@/app/services/ai-service/as-analytics';

// ── Type imports ────────────────────────────────────────
import type {
  RagChatResponse,
  ChatHistoryEntry,
  GeneratedFlashcard,
  GeneratedQuestion,
  AiContentReport,
  ReportStats,
  ReportListResponse,
  PdfIngestResponse,
  IngestResult,
  ReChunkResult,
  RagAnalytics,
  EmbeddingCoverage,
} from '@/app/services/ai-service/as-types';

// ============================================================
// CHAT SERVICES
// ============================================================

describe('AI Chat Services', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('chat()', () => {
    it('sends POST request with message to /ai/rag-chat', async () => {
      const mockResponse: RagChatResponse = {
        response: 'This is a test response',
        sources: [{ chunk_id: 'c1', summary_title: 'Test', similarity: 0.95 }],
        tokens: { input: 10, output: 20 },
        profile_used: true,
        log_id: 'log-1',
        _search: {
          augmented: false,
          search_type: 'semantic',
          context_chunks: 1,
          primary_matches: 1,
          strategy: 'standard',
          rerank_applied: false,
        },
      };

      mockApiCall.mockResolvedValueOnce(mockResponse);

      const result = await chat('What is photosynthesis?');

      expect(mockApiCall).toHaveBeenCalledWith('/ai/rag-chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is photosynthesis?' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('includes summary_id in body when provided', async () => {
      mockApiCall.mockResolvedValueOnce({ response: 'OK', sources: [], tokens: { input: 1, output: 1 }, profile_used: true, log_id: 'log-1', _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false } });

      await chat('What is gravity?', { summaryId: 'sum-123' });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.summary_id).toBe('sum-123');
    });

    it('includes chat history in body when provided', async () => {
      mockApiCall.mockResolvedValueOnce({ response: 'OK', sources: [], tokens: { input: 1, output: 1 }, profile_used: true, log_id: 'log-1', _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false } });

      const history: ChatHistoryEntry[] = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there' },
      ];

      await chat('Tell me more', { history });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.history).toEqual(history);
    });

    it('includes strategy in body when provided', async () => {
      mockApiCall.mockResolvedValueOnce({ response: 'OK', sources: [], tokens: { input: 1, output: 1 }, profile_used: true, log_id: 'log-1', _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false } });

      await chat('Test message', { strategy: 'multi_query' });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.strategy).toBe('multi_query');
    });

    it('returns response with sources and metadata', async () => {
      const sources = [
        { chunk_id: 'c1', summary_title: 'Biology 101', similarity: 0.98 },
        { chunk_id: 'c2', summary_title: 'Advanced Bio', similarity: 0.87 },
      ];

      mockApiCall.mockResolvedValueOnce({
        response: 'Photosynthesis is...',
        sources,
        tokens: { input: 15, output: 45 },
        profile_used: true,
        log_id: 'log-xyz',
        _search: {
          augmented: true,
          search_type: 'hybrid',
          context_chunks: 5,
          primary_matches: 2,
          strategy: 'multi_query',
          rerank_applied: true,
        },
      });

      const result = await chat('What is photosynthesis?');

      expect(result.response).toContain('Photosynthesis');
      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].similarity).toBe(0.98);
      expect(result.tokens.output).toBe(45);
      expect(result._search.strategy).toBe('multi_query');
    });

    it('throws rate limit error on 429', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Rate limit exceeded (429)'));

      await expect(chat('Test')).rejects.toThrow('Limite de solicitudes');
    });

    it('throws on network error', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(chat('Test')).rejects.toThrow('Network timeout');
    });
  });

  describe('chatText()', () => {
    it('returns only the response text', async () => {
      mockApiCall.mockResolvedValueOnce({
        response: 'This is the answer',
        sources: [],
        tokens: { input: 1, output: 1 },
        profile_used: false,
        log_id: 'log-1',
        _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false },
      });

      const result = await chatText('What?');

      expect(result).toBe('This is the answer');
      expect(typeof result).toBe('string');
    });

    it('passes options to chat()', async () => {
      mockApiCall.mockResolvedValueOnce({
        response: 'Answer',
        sources: [],
        tokens: { input: 1, output: 1 },
        profile_used: false,
        log_id: 'log-1',
        _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false },
      });

      await chatText('Question', { summaryId: 'sum-1', strategy: 'hyde' });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.summary_id).toBe('sum-1');
      expect(callBody.strategy).toBe('hyde');
    });
  });

  describe('explainConcept()', () => {
    it('calls chat with "Explica" prompt', async () => {
      mockApiCall.mockResolvedValueOnce({
        response: 'La fotosíntesis es...',
        sources: [],
        tokens: { input: 1, output: 1 },
        profile_used: false,
        log_id: 'log-1',
        _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false },
      });

      await explainConcept('Fotosíntesis');

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.message).toContain('Explica');
      expect(callBody.message).toContain('Fotosíntesis');
    });

    it('includes summary_id when provided', async () => {
      mockApiCall.mockResolvedValueOnce({
        response: 'Explanation',
        sources: [],
        tokens: { input: 1, output: 1 },
        profile_used: false,
        log_id: 'log-1',
        _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false },
      });

      await explainConcept('Gravity', 'sum-999');

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.summary_id).toBe('sum-999');
    });

    it('returns response text', async () => {
      mockApiCall.mockResolvedValueOnce({
        response: 'Gravity pulls objects toward each other...',
        sources: [],
        tokens: { input: 1, output: 1 },
        profile_used: false,
        log_id: 'log-1',
        _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false },
      });

      const result = await explainConcept('Gravity');

      expect(result).toContain('Gravity pulls');
    });
  });

  describe('chatStream()', () => {
    it('processes chunks, sources, and done events', async () => {
      const chunks: any[] = [
        { type: 'chunk', text: 'Hello ' },
        { type: 'chunk', text: 'world' },
        { type: 'sources', sources: [{ chunk_id: 'c1', summary_title: 'Doc', similarity: 0.9 }] },
        { type: 'done', log_id: 'log-stream-1', tokens: { input: 5, output: 2 } },
      ];

      mockApiCallStream.mockReturnValueOnce((async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })());

      const onChunk = vi.fn();
      const onSources = vi.fn();
      const onDone = vi.fn();

      await chatStream('Stream test', {
        onChunk,
        onSources,
        onDone,
      });

      expect(onChunk).toHaveBeenCalledWith('Hello ');
      expect(onChunk).toHaveBeenCalledWith('world');
      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onSources).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ chunk_id: 'c1' })]));
      expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ log_id: 'log-stream-1' }));
    });

    it('sends stream=true flag in body', async () => {
      mockApiCallStream.mockReturnValueOnce((async function* () {})());

      await chatStream('Test', { onChunk: () => {} });

      const callBody = JSON.parse(mockApiCallStream.mock.calls[0][1]?.body as string);
      expect(callBody.stream).toBe(true);
    });

    it('includes summary_id and history in stream request', async () => {
      mockApiCallStream.mockReturnValueOnce((async function* () {})());

      const history: ChatHistoryEntry[] = [{ role: 'user', content: 'Hi' }];

      await chatStream('Continue', {
        summaryId: 'sum-1',
        history,
        onChunk: () => {},
      });

      const callBody = JSON.parse(mockApiCallStream.mock.calls[0][1]?.body as string);
      expect(callBody.summary_id).toBe('sum-1');
      expect(callBody.history).toEqual(history);
    });

    it('handles stream errors gracefully', async () => {
      mockApiCallStream.mockReturnValueOnce((async function* () {
        yield { type: 'error', error: 'Stream failed' };
      })());

      await expect(
        chatStream('Test', { onChunk: () => {} })
      ).rejects.toThrow('Stream failed');
    });

    it('throws rate limit error on 429 in stream', async () => {
      mockApiCallStream.mockImplementationOnce(() => {
        throw new Error('Rate limit exceeded (429)');
      });

      await expect(
        chatStream('Test', { onChunk: () => {} })
      ).rejects.toThrow('Limite de solicitudes');
    });
  });
});

// ============================================================
// GENERATE SERVICES
// ============================================================

describe('AI Generate Services', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('generateFlashcard()', () => {
    it('sends POST to /ai/generate with flashcard action', async () => {
      const mockCard: GeneratedFlashcard = {
        id: 'fc-1',
        front: 'What is photosynthesis?',
        back: 'The process by which plants convert sunlight into chemical energy...',
        summary_id: 'sum-1',
        _meta: { model: 'claude-opus', tokens: { input: 50, output: 100 } },
      };

      mockApiCall.mockResolvedValueOnce(mockCard);

      const result = await generateFlashcard({
        summaryId: 'sum-1',
      });

      expect(mockApiCall).toHaveBeenCalledWith('/ai/generate', {
        method: 'POST',
        body: expect.stringContaining('"action":"flashcard"'),
      });
      expect(result.front).toContain('photosynthesis');
    });

    it('includes optional parameters in request', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'fc-2', front: 'Q', back: 'A' });

      await generateFlashcard({
        summaryId: 'sum-1',
        keywordId: 'kw-1',
        subtopicId: 'st-1',
        blockId: 'bl-1',
        related: false,
      });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.keyword_id).toBe('kw-1');
      expect(callBody.subtopic_id).toBe('st-1');
      expect(callBody.block_id).toBe('bl-1');
      expect(callBody.related).toBe(false);
    });

    it('defaults related to true when not provided', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'fc-3', front: 'Q', back: 'A' });

      await generateFlashcard({ summaryId: 'sum-1' });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.related).toBe(true);
    });

    it('returns generated flashcard with metadata', async () => {
      const response: GeneratedFlashcard = {
        id: 'fc-generated',
        front: 'Capital of France?',
        back: 'Paris',
        summary_id: 'sum-2',
        keyword_id: 'kw-geo',
        _meta: { model: 'claude-opus', tokens: { input: 40, output: 80 } },
        _smart: {
          target_keyword: 'kw-geo',
          target_subtopic: null,
          p_know: 0.3,
          need_score: 75,
          primary_reason: 'low_mastery',
        },
      };

      mockApiCall.mockResolvedValueOnce(response);

      const result = await generateFlashcard({ summaryId: 'sum-2', keywordId: 'kw-geo' });

      expect(result._meta?.tokens.output).toBe(80);
      expect(result._smart?.primary_reason).toBe('low_mastery');
    });

    it('throws rate limit error on 429', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('429 Rate limit'));

      await expect(
        generateFlashcard({ summaryId: 'sum-1' })
      ).rejects.toThrow('Limite de solicitudes');
    });
  });

  describe('generateQuizQuestion()', () => {
    it('sends POST to /ai/generate with quiz_question action', async () => {
      const mockQuestion: GeneratedQuestion = {
        id: 'q-1',
        question: 'What is the formula for photosynthesis?',
        question_type: 'multiple_choice',
        options: ['6CO2 + 6H2O', 'H2O + O2', 'C6H12O6 + O2', 'CO2 + H2O + light'],
        correct_answer: '6CO2 + 6H2O',
        explanation: 'This is the balanced equation...',
        difficulty: 'medium',
        summary_id: 'sum-1',
      };

      mockApiCall.mockResolvedValueOnce(mockQuestion);

      const result = await generateQuizQuestion({
        summaryId: 'sum-1',
      });

      expect(mockApiCall).toHaveBeenCalledWith('/ai/generate', {
        method: 'POST',
        body: expect.stringContaining('"action":"quiz_question"'),
      });
      expect(result.question).toContain('photosynthesis');
      expect(result.options).toHaveLength(4);
    });

    it('includes optional parameters', async () => {
      mockApiCall.mockResolvedValueOnce({
        id: 'q-2',
        question: 'Q?',
        question_type: 'mc',
        options: ['A', 'B'],
        correct_answer: 'A',
        explanation: 'E',
        difficulty: 'hard',
      });

      await generateQuizQuestion({
        summaryId: 'sum-1',
        keywordId: 'kw-1',
        subtopicId: 'st-1',
        blockId: 'bl-1',
        wrongAnswer: 'Incorrect answer',
      });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.keyword_id).toBe('kw-1');
      expect(callBody.subtopic_id).toBe('st-1');
      expect(callBody.block_id).toBe('bl-1');
      expect(callBody.wrong_answer).toBe('Incorrect answer');
    });

    it('returns question with all fields populated', async () => {
      const response: GeneratedQuestion = {
        id: 'q-3',
        summary_id: 'sum-3',
        keyword_id: 'kw-sci',
        question: 'What year did Einstein publish special relativity?',
        question_type: 'short_answer',
        options: [],
        correct_answer: '1905',
        explanation: 'Albert Einstein published the theory of special relativity in 1905...',
        difficulty: 'hard',
        _meta: { model: 'claude-opus', tokens: { input: 60, output: 120 } },
        _smart: {
          target_keyword: 'kw-sci',
          target_summary: 'sum-3',
          target_subtopic: null,
          p_know: 0.15,
          need_score: 80,
          primary_reason: 'new_concept',
        },
      };

      mockApiCall.mockResolvedValueOnce(response);

      const result = await generateQuizQuestion({ summaryId: 'sum-3' });

      expect(result.correct_answer).toBe('1905');
      expect(result.difficulty).toBe('hard');
      expect(result._smart?.primary_reason).toBe('new_concept');
    });

    it('throws on API error', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('AI service unavailable'));

      await expect(
        generateQuizQuestion({ summaryId: 'sum-1' })
      ).rejects.toThrow('AI service unavailable');
    });
  });
});

// ============================================================
// REPORT SERVICES
// ============================================================

describe('AI Report Services', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('reportContent()', () => {
    it('sends POST to /ai/report with report data', async () => {
      const mockReport: AiContentReport = {
        id: 'report-1',
        content_type: 'flashcard',
        content_id: 'fc-123',
        reported_by: 'user-1',
        institution_id: 'inst-1',
        reason: 'incorrect',
        description: 'The answer is wrong',
        status: 'pending',
        resolved_by: null,
        resolved_at: null,
        resolution_note: null,
        created_at: '2025-04-03T10:00:00Z',
        updated_at: '2025-04-03T10:00:00Z',
      };

      mockApiCall.mockResolvedValueOnce(mockReport);

      const result = await reportContent({
        contentType: 'flashcard',
        contentId: 'fc-123',
        reason: 'incorrect',
        description: 'The answer is wrong',
      });

      expect(mockApiCall).toHaveBeenCalledWith('/ai/report', {
        method: 'POST',
        body: JSON.stringify({
          content_type: 'flashcard',
          content_id: 'fc-123',
          reason: 'incorrect',
          description: 'The answer is wrong',
        }),
      });
      expect(result.status).toBe('pending');
    });

    it('handles description as optional', async () => {
      mockApiCall.mockResolvedValueOnce({
        id: 'r-2',
        content_type: 'quiz_question',
        content_id: 'q-1',
        reported_by: 'user-1',
        institution_id: 'inst-1',
        reason: 'inappropriate',
        description: null,
        status: 'pending',
        resolved_by: null,
        resolved_at: null,
        resolution_note: null,
        created_at: '2025-04-03T10:00:00Z',
        updated_at: '2025-04-03T10:00:00Z',
      });

      await reportContent({
        contentType: 'quiz_question',
        contentId: 'q-1',
        reason: 'inappropriate',
      });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.description).toBe(null);
    });

    it('validates report reasons', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'r-3', status: 'pending' });

      const reasons: Array<'incorrect' | 'inappropriate' | 'low_quality' | 'irrelevant' | 'other'> = [
        'incorrect',
        'inappropriate',
        'low_quality',
        'irrelevant',
        'other',
      ];

      for (const reason of reasons) {
        await reportContent({
          contentType: 'flashcard',
          contentId: 'fc-1',
          reason,
        });

        const callBody = JSON.parse(mockApiCall.mock.calls[mockApiCall.mock.calls.length - 1][1]?.body as string);
        expect(callBody.reason).toBe(reason);
      }
    });
  });

  describe('resolveReport()', () => {
    it('sends PATCH to /ai/report/:id with status and note', async () => {
      const mockUpdated: AiContentReport = {
        id: 'report-1',
        content_type: 'flashcard',
        content_id: 'fc-123',
        reported_by: 'user-1',
        institution_id: 'inst-1',
        reason: 'incorrect',
        description: null,
        status: 'resolved',
        resolved_by: 'admin-1',
        resolved_at: '2025-04-03T12:00:00Z',
        resolution_note: 'Fixed the answer',
        created_at: '2025-04-03T10:00:00Z',
        updated_at: '2025-04-03T12:00:00Z',
      };

      mockApiCall.mockResolvedValueOnce(mockUpdated);

      const result = await resolveReport('report-1', {
        status: 'resolved',
        resolutionNote: 'Fixed the answer',
      });

      expect(mockApiCall).toHaveBeenCalledWith('/ai/report/report-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          resolution_note: 'Fixed the answer',
        }),
      });
      expect(result.status).toBe('resolved');
      expect(result.resolved_at).toBeTruthy();
    });

    it('handles missing resolution note', async () => {
      mockApiCall.mockResolvedValueOnce({
        id: 'r-2',
        status: 'dismissed',
        resolved_at: '2025-04-03T12:00:00Z',
        resolution_note: null,
      });

      await resolveReport('r-2', { status: 'dismissed' });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.resolution_note).toBe(null);
    });

    it('supports all report statuses', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'r-3', status: 'reviewed' });

      const statuses: Array<'pending' | 'reviewed' | 'resolved' | 'dismissed'> = [
        'pending',
        'reviewed',
        'resolved',
        'dismissed',
      ];

      for (const status of statuses) {
        await resolveReport('r-3', { status });

        const callBody = JSON.parse(mockApiCall.mock.calls[mockApiCall.mock.calls.length - 1][1]?.body as string);
        expect(callBody.status).toBe(status);
      }
    });
  });

  describe('getReportStats()', () => {
    it('calls GET /ai/report-stats with institution_id', async () => {
      const mockStats: ReportStats = {
        total_reports: 42,
        pending_count: 5,
        reviewed_count: 15,
        resolved_count: 20,
        dismissed_count: 2,
        reason_incorrect: 20,
        reason_inappropriate: 8,
        reason_low_quality: 10,
        reason_irrelevant: 3,
        reason_other: 1,
        type_quiz_question: 25,
        type_flashcard: 17,
        avg_resolution_hours: 12.5,
        resolution_rate: 0.95,
      };

      mockApiCall.mockResolvedValueOnce(mockStats);

      const result = await getReportStats('inst-1');

      expect(mockApiCall).toHaveBeenCalledWith(
        expect.stringContaining('/ai/report-stats?')
      );
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('institution_id=inst-1');
      expect(result.total_reports).toBe(42);
      expect(result.resolution_rate).toBe(0.95);
    });

    it('includes date filters when provided', async () => {
      mockApiCall.mockResolvedValueOnce({
        total_reports: 10,
        pending_count: 2,
        reviewed_count: 3,
        resolved_count: 5,
        dismissed_count: 0,
        reason_incorrect: 5,
        reason_inappropriate: 2,
        reason_low_quality: 2,
        reason_irrelevant: 1,
        reason_other: 0,
        type_quiz_question: 6,
        type_flashcard: 4,
        avg_resolution_hours: 8,
        resolution_rate: 1,
      });

      await getReportStats('inst-1', {
        from: '2025-04-01',
        to: '2025-04-03',
      });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('from=2025-04-01');
      expect(url).toContain('to=2025-04-03');
    });

    it('returns complete stats object', async () => {
      mockApiCall.mockResolvedValueOnce({
        total_reports: 100,
        pending_count: 10,
        reviewed_count: 30,
        resolved_count: 55,
        dismissed_count: 5,
        reason_incorrect: 40,
        reason_inappropriate: 25,
        reason_low_quality: 20,
        reason_irrelevant: 10,
        reason_other: 5,
        type_quiz_question: 60,
        type_flashcard: 40,
        avg_resolution_hours: 24,
        resolution_rate: 0.85,
      });

      const result = await getReportStats('inst-1');

      expect(result.pending_count + result.reviewed_count + result.resolved_count + result.dismissed_count).toBe(100);
      expect(result.reason_incorrect + result.reason_inappropriate + result.reason_low_quality + result.reason_irrelevant + result.reason_other).toBe(100);
    });
  });

  describe('getReports()', () => {
    it('calls GET /ai/reports with institution_id', async () => {
      const mockResponse: ReportListResponse = {
        items: [
          {
            id: 'r-1',
            content_type: 'flashcard',
            content_id: 'fc-1',
            reported_by: 'user-1',
            institution_id: 'inst-1',
            reason: 'incorrect',
            description: null,
            status: 'pending',
            resolved_by: null,
            resolved_at: null,
            resolution_note: null,
            created_at: '2025-04-03T10:00:00Z',
            updated_at: '2025-04-03T10:00:00Z',
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      mockApiCall.mockResolvedValueOnce(mockResponse);

      const result = await getReports('inst-1');

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('/ai/reports?');
      expect(url).toContain('institution_id=inst-1');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('includes filter parameters when provided', async () => {
      mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 });

      await getReports('inst-1', {
        status: 'pending',
        reason: 'incorrect',
        contentType: 'quiz_question',
        limit: 10,
        offset: 20,
      });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('status=pending');
      expect(url).toContain('reason=incorrect');
      expect(url).toContain('content_type=quiz_question');
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
    });

    it('returns paginated results', async () => {
      const reports = Array.from({ length: 5 }, (_, i) => ({
        id: `r-${i}`,
        content_type: 'flashcard' as const,
        content_id: `fc-${i}`,
        reported_by: 'user-1',
        institution_id: 'inst-1',
        reason: 'incorrect' as const,
        description: null,
        status: 'pending' as const,
        resolved_by: null,
        resolved_at: null,
        resolution_note: null,
        created_at: '2025-04-03T10:00:00Z',
        updated_at: '2025-04-03T10:00:00Z',
      }));

      mockApiCall.mockResolvedValueOnce({
        items: reports,
        total: 50,
        limit: 5,
        offset: 0,
      });

      const result = await getReports('inst-1', { limit: 5, offset: 0 });

      expect(result.items).toHaveLength(5);
      expect(result.total).toBe(50);
      expect(result.limit).toBe(5);
    });
  });
});

// ============================================================
// INGEST SERVICES
// ============================================================

describe('AI Ingest Services', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('ingestPdf()', () => {
    it('sends multipart FormData POST to /ai/ingest-pdf', async () => {
      const mockFile = new File(['PDF content'], 'document.pdf', { type: 'application/pdf' });
      const mockResponse: PdfIngestResponse = {
        summary_id: 'sum-pdf-1',
        title: 'Uploaded Document',
        source_type: 'pdf',
        source_file_name: 'document.pdf',
        source_file_path: '/uploads/document.pdf',
        word_count: 5000,
        char_count: 25000,
        tokens_used: { input: 2000, output: 500 },
        chunking_status: 'started',
      };

      mockApiCall.mockResolvedValueOnce(mockResponse);

      const result = await ingestPdf(mockFile, 'inst-1', 'topic-1', 'My Document');

      expect(mockApiCall).toHaveBeenCalledWith('/ai/ingest-pdf', expect.objectContaining({
        method: 'POST',
        timeoutMs: 60_000,
      }));

      const callArgs = mockApiCall.mock.calls[0];
      const body = callArgs[1]?.body as FormData;
      expect(body).toBeInstanceOf(FormData);

      expect(result.summary_id).toBe('sum-pdf-1');
      expect(result.word_count).toBe(5000);
      expect(result.chunking_status).toBe('started');
    });

    it('includes optional title in FormData', async () => {
      const mockFile = new File(['content'], 'test.pdf');
      mockApiCall.mockResolvedValueOnce({ summary_id: 'sum-1', title: 'Test', source_type: 'pdf', source_file_name: 'test.pdf', source_file_path: null, word_count: 100, char_count: 500, tokens_used: { input: 50, output: 25 }, chunking_status: 'started' });

      await ingestPdf(mockFile, 'inst-1', 'topic-1', 'Custom Title');

      const callArgs = mockApiCall.mock.calls[0];
      const body = callArgs[1]?.body as FormData;
      expect(Array.from(body.entries())).toContainEqual(['title', 'Custom Title']);
    });

    it('omits title when not provided', async () => {
      const mockFile = new File(['content'], 'test.pdf');
      mockApiCall.mockResolvedValueOnce({ summary_id: 'sum-2', title: 'test.pdf', source_type: 'pdf', source_file_name: 'test.pdf', source_file_path: null, word_count: 100, char_count: 500, tokens_used: { input: 50, output: 25 }, chunking_status: 'started' });

      await ingestPdf(mockFile, 'inst-1', 'topic-1');

      const callArgs = mockApiCall.mock.calls[0];
      const body = callArgs[1]?.body as FormData;
      const entries = Array.from(body.entries());
      expect(entries.map(e => e[0])).not.toContain('title');
    });

    it('sets 60s timeout for PDF upload', async () => {
      const mockFile = new File(['content'], 'test.pdf');
      mockApiCall.mockResolvedValueOnce({ summary_id: 'sum-1', title: 'Test', source_type: 'pdf', source_file_name: 'test.pdf', source_file_path: null, word_count: 100, char_count: 500, tokens_used: { input: 50, output: 25 }, chunking_status: 'started' });

      await ingestPdf(mockFile, 'inst-1', 'topic-1');

      expect(mockApiCall).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timeoutMs: 60_000 })
      );
    });
  });

  describe('ingestEmbeddings()', () => {
    it('sends POST to /ai/ingest-embeddings with defaults', async () => {
      const mockResult: IngestResult = {
        processed: 50,
        failed: 0,
        skipped: 5,
        total_found: 55,
        target: 'chunks',
        message: 'Embeddings generated successfully',
      };

      mockApiCall.mockResolvedValueOnce(mockResult);

      const result = await ingestEmbeddings({ institutionId: 'inst-1' });

      expect(mockApiCall).toHaveBeenCalledWith('/ai/ingest-embeddings', {
        method: 'POST',
        body: JSON.stringify({
          institution_id: 'inst-1',
          target: 'chunks',
          batch_size: 50,
        }),
        timeoutMs: 120_000,
      });
      expect(result.processed).toBe(50);
    });

    it('includes optional parameters', async () => {
      mockApiCall.mockResolvedValueOnce({ processed: 100, failed: 2, total_found: 102, target: 'summaries' });

      await ingestEmbeddings({
        institutionId: 'inst-1',
        target: 'summaries',
        summaryId: 'sum-1',
        batchSize: 25,
      });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.target).toBe('summaries');
      expect(callBody.summary_id).toBe('sum-1');
      expect(callBody.batch_size).toBe(25);
    });

    it('sets 120s timeout for embedding generation', async () => {
      mockApiCall.mockResolvedValueOnce({ processed: 0, failed: 0, total_found: 0 });

      await ingestEmbeddings({ institutionId: 'inst-1' });

      expect(mockApiCall).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timeoutMs: 120_000 })
      );
    });
  });

  describe('reChunk()', () => {
    it('sends POST to /ai/re-chunk with summary_id', async () => {
      const mockResult: ReChunkResult = {
        chunks_created: 100,
        chunks_deleted: 50,
        embeddings_generated: 95,
        strategy_used: 'semantic',
        elapsed_ms: 5000,
      };

      mockApiCall.mockResolvedValueOnce(mockResult);

      const result = await reChunk({
        summaryId: 'sum-1',
        institutionId: 'inst-1',
      });

      expect(mockApiCall).toHaveBeenCalledWith('/ai/re-chunk', {
        method: 'POST',
        body: JSON.stringify({
          summary_id: 'sum-1',
          institution_id: 'inst-1',
        }),
        timeoutMs: 60_000,
      });
      expect(result.chunks_created).toBe(100);
      expect(result.strategy_used).toBe('semantic');
    });

    it('includes optional chunk options', async () => {
      mockApiCall.mockResolvedValueOnce({
        chunks_created: 80,
        chunks_deleted: 30,
        embeddings_generated: 78,
        strategy_used: 'fixed',
        elapsed_ms: 3000,
      });

      await reChunk({
        summaryId: 'sum-1',
        institutionId: 'inst-1',
        options: {
          maxChunkSize: 500,
          minChunkSize: 100,
          overlapSize: 50,
        },
      });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.options.maxChunkSize).toBe(500);
      expect(callBody.options.minChunkSize).toBe(100);
      expect(callBody.options.overlapSize).toBe(50);
    });

    it('sets 60s timeout for rechunking', async () => {
      mockApiCall.mockResolvedValueOnce({
        chunks_created: 0,
        chunks_deleted: 0,
        embeddings_generated: 0,
        strategy_used: '',
        elapsed_ms: 0,
      });

      await reChunk({ summaryId: 'sum-1', institutionId: 'inst-1' });

      expect(mockApiCall).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timeoutMs: 60_000 })
      );
    });
  });
});

// ============================================================
// ANALYTICS SERVICES
// ============================================================

describe('AI Analytics Services', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('submitRagFeedback()', () => {
    it('sends PATCH to /ai/rag-feedback with positive feedback', async () => {
      mockApiCall.mockResolvedValueOnce({
        updated: {
          id: 'log-1',
          feedback: 1,
          created_at: '2025-04-03T10:00:00Z',
        },
      });

      await submitRagFeedback({
        logId: 'log-1',
        feedback: 'positive',
      });

      expect(mockApiCall).toHaveBeenCalledWith('/ai/rag-feedback', {
        method: 'PATCH',
        body: JSON.stringify({
          log_id: 'log-1',
          feedback: 1,
        }),
      });
    });

    it('sends negative feedback as -1', async () => {
      mockApiCall.mockResolvedValueOnce({
        updated: {
          id: 'log-2',
          feedback: -1,
          created_at: '2025-04-03T10:00:00Z',
        },
      });

      await submitRagFeedback({
        logId: 'log-2',
        feedback: 'negative',
      });

      const callBody = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(callBody.feedback).toBe(-1);
    });

    it('returns updated feedback record', async () => {
      mockApiCall.mockResolvedValueOnce({
        updated: {
          id: 'log-3',
          feedback: 1,
          created_at: '2025-04-03T12:00:00Z',
        },
      });

      const result = await submitRagFeedback({
        logId: 'log-3',
        feedback: 'positive',
      });

      expect(result.updated.id).toBe('log-3');
      expect(result.updated.feedback).toBe(1);
    });
  });

  describe('getRagAnalytics()', () => {
    it('calls GET /ai/rag-analytics with institution_id', async () => {
      const mockAnalytics: RagAnalytics = {
        total_queries: 500,
        avg_similarity: 0.87,
        avg_latency_ms: 450,
        positive_feedback: 420,
        negative_feedback: 30,
        zero_result_queries: 5,
      };

      mockApiCall.mockResolvedValueOnce(mockAnalytics);

      const result = await getRagAnalytics('inst-1');

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('/ai/rag-analytics?');
      expect(url).toContain('institution_id=inst-1');
      expect(result.total_queries).toBe(500);
      expect(result.avg_similarity).toBe(0.87);
    });

    it('includes date filters when provided', async () => {
      mockApiCall.mockResolvedValueOnce({
        total_queries: 100,
        avg_similarity: 0.9,
        avg_latency_ms: 400,
        positive_feedback: 90,
        negative_feedback: 5,
        zero_result_queries: 0,
      });

      await getRagAnalytics('inst-1', {
        from: '2025-04-01T00:00:00Z',
        to: '2025-04-03T23:59:59Z',
      });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('from=2025-04-01T00%3A00%3A00Z');
      expect(url).toContain('to=2025-04-03T23%3A59%3A59Z');
    });

    it('returns analytics with all metrics', async () => {
      mockApiCall.mockResolvedValueOnce({
        total_queries: 1000,
        avg_similarity: 0.85,
        avg_latency_ms: 500,
        positive_feedback: 850,
        negative_feedback: 75,
        zero_result_queries: 10,
      });

      const result = await getRagAnalytics('inst-1');

      expect(result.total_queries).toBe(1000);
      expect(result.avg_similarity).toBe(0.85);
      expect(result.avg_latency_ms).toBe(500);
      expect(result.positive_feedback + result.negative_feedback).toBeLessThanOrEqual(result.total_queries);
    });
  });

  describe('getEmbeddingCoverage()', () => {
    it('calls GET /ai/embedding-coverage with institution_id', async () => {
      const mockCoverage: EmbeddingCoverage = {
        total_chunks: 1000,
        chunks_with_embedding: 950,
        coverage_pct: 95,
      };

      mockApiCall.mockResolvedValueOnce(mockCoverage);

      const result = await getEmbeddingCoverage('inst-1');

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('/ai/embedding-coverage?');
      expect(url).toContain('institution_id=inst-1');
      expect(result.coverage_pct).toBe(95);
    });

    it('encodes institution_id in URL', async () => {
      mockApiCall.mockResolvedValueOnce({
        total_chunks: 100,
        chunks_with_embedding: 100,
        coverage_pct: 100,
      });

      await getEmbeddingCoverage('inst-with-special-chars-123');

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('institution_id=');
      expect(decodeURIComponent(url)).toContain('inst-with-special-chars-123');
    });

    it('returns coverage metrics', async () => {
      mockApiCall.mockResolvedValueOnce({
        total_chunks: 5000,
        chunks_with_embedding: 4850,
        coverage_pct: 97,
      });

      const result = await getEmbeddingCoverage('inst-1');

      expect(result.total_chunks).toBe(5000);
      expect(result.chunks_with_embedding).toBe(4850);
      expect(result.coverage_pct).toBe(97);
      expect(result.chunks_with_embedding).toBeLessThanOrEqual(result.total_chunks);
    });
  });
});

// ============================================================
// ERROR HANDLING & EDGE CASES
// ============================================================

describe('Error Handling & Edge Cases', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('Rate limit handling', () => {
    it('extracts rate limit error from chat', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('429 Too Many Requests'));

      await expect(chat('test')).rejects.toThrow('Limite de solicitudes');
    });

    it('extracts rate limit error from generate', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Rate limit exceeded (429)'));

      await expect(
        generateFlashcard({ summaryId: 'sum-1' })
      ).rejects.toThrow('Limite de solicitudes');
    });

    it('extracts rate limit error from stream', async () => {
      mockApiCallStream.mockImplementationOnce(() => {
        throw new Error('429 rate limited');
      });

      await expect(
        chatStream('test', { onChunk: () => {} })
      ).rejects.toThrow('Limite de solicitudes');
    });
  });

  describe('Network error propagation', () => {
    it('propagates timeout errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(chat('test')).rejects.toThrow('Request timeout');
    });

    it('propagates connection errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(
        generateQuizQuestion({ summaryId: 'sum-1' })
      ).rejects.toThrow('Failed to fetch');
    });

    it('propagates server errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('500 Internal Server Error'));

      await expect(
        getReportStats('inst-1')
      ).rejects.toThrow('500 Internal Server Error');
    });
  });

  describe('Request shape validation', () => {
    it('generates correct request body shape for chat', async () => {
      mockApiCall.mockResolvedValueOnce({ response: 'OK', sources: [], tokens: { input: 1, output: 1 }, profile_used: false, log_id: 'log-1', _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false } });

      await chat('test', {
        summaryId: 'sum-1',
        strategy: 'multi_query',
        history: [{ role: 'user', content: 'hi' }],
      });

      const body = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(Object.keys(body).sort()).toEqual(['history', 'message', 'strategy', 'summary_id'].sort());
    });

    it('generates correct request body shape for flashcard', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'fc-1', front: 'Q', back: 'A' });

      await generateFlashcard({ summaryId: 'sum-1', keywordId: 'kw-1' });

      const body = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(body.action).toBe('flashcard');
      expect(body.summary_id).toBe('sum-1');
      expect(body.keyword_id).toBe('kw-1');
      expect(body.related).toBe(true);
    });

    it('generates correct request body shape for report', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'r-1', status: 'pending' });

      await reportContent({
        contentType: 'flashcard',
        contentId: 'fc-1',
        reason: 'incorrect',
        description: 'test',
      });

      const body = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(body.content_type).toBe('flashcard');
      expect(body.content_id).toBe('fc-1');
      expect(body.reason).toBe('incorrect');
      expect(body.description).toBe('test');
    });
  });

  describe('Empty/null values', () => {
    it('handles empty message gracefully', async () => {
      mockApiCall.mockResolvedValueOnce({ response: '', sources: [], tokens: { input: 1, output: 0 }, profile_used: false, log_id: 'log-1', _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false } });

      const result = await chat('');

      expect(result.response).toBe('');
    });

    it('handles empty sources list', async () => {
      mockApiCall.mockResolvedValueOnce({
        response: 'Response',
        sources: [],
        tokens: { input: 1, output: 1 },
        profile_used: false,
        log_id: 'log-1',
        _search: { augmented: false, search_type: '', context_chunks: 0, primary_matches: 0, strategy: '', rerank_applied: false },
      });

      const result = await chat('test');

      expect(result.sources).toEqual([]);
    });

    it('handles null description in report', async () => {
      mockApiCall.mockResolvedValueOnce({ id: 'r-1', status: 'pending' });

      await reportContent({
        contentType: 'quiz_question',
        contentId: 'q-1',
        reason: 'low_quality',
      });

      const body = JSON.parse(mockApiCall.mock.calls[0][1]?.body as string);
      expect(body.description).toBe(null);
    });
  });
});
