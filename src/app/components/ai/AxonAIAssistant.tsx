// ============================================================
// Axon AI Assistant — Floating panel with chat, flashcard gen,
// quiz gen, and concept explanations powered by Gemini
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';

import {
  X,
  Send,
  Sparkles,
  Layers,
  GraduationCap,
  BookOpen,
  Brain,
  Loader2,
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  Lightbulb,
  Zap,
  ArrowLeft,
  Phone,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import clsx from 'clsx';
import {
  chat,
  chatStream,
  explainConcept as explainConceptApi,
  generateFlashcard,
  generateQuizQuestion,
  submitRagFeedback,
} from '@/app/services/aiService';
import type {
  ChatHistoryEntry,
  RagChatResponse,
  GeneratedFlashcard,
  GeneratedQuestion,
} from '@/app/services/aiService';
import { VoiceCallPanel } from './VoiceCallPanel';

// ── Types ─────────────────────────────────────────────────

type AssistantMode = 'chat' | 'flashcards' | 'quiz' | 'explain' | 'voice';

interface AxonAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  summaryId?: string;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// ── Quick prompts ─────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: Lightbulb, label: 'Explique o ciclo de Krebs', color: 'text-amber-500' },
  { icon: Brain, label: 'Mecanismo de ação dos betabloqueadores', color: 'text-blue-500' },
  { icon: Zap, label: 'Diferença entre artérias e veias', color: 'text-rose-500' },
];

// ── Main Component ────────────────────────────────────────

export function AxonAIAssistant({
  isOpen,
  onClose,
  summaryId,
}: AxonAIAssistantProps) {
  const { currentCourse, currentTopic } = useNavigation();

  // State
  const [mode, setMode] = useState<AssistantMode>('chat');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chat RAG metadata — per-message citations & feedback
  const [messageSources, setMessageSources] = useState<Map<string, Array<{ chunk_id: string; summary_title: string; similarity: number }>>>(new Map());
  const [messageLogIds, setMessageLogIds] = useState<Map<string, string>>(new Map());
  const [feedbackGiven, setFeedbackGiven] = useState<Map<string, 'positive' | 'negative'>>(new Map());

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);

  // Flashcard mode state
  const [generatedCards, setGeneratedCards] = useState<GeneratedFlashcard[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  // Quiz mode state
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, number>>(new Map());
  const [showExplanations, setShowExplanations] = useState<Set<number>>(new Set());

  // Explain mode state
  const [explainConceptText, setExplainConceptText] = useState('');
  const [explanation, setExplanation] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Items for the virtualizer: messages + optional loading indicator
  const virtualItems = messages.length + (isLoading && !isStreaming ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: virtualItems,
    getScrollElement: () => chatScrollRef.current,
    estimateSize: () => 80, // estimated px per message row
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (virtualItems > 0) {
      virtualizer.scrollToIndex(virtualItems - 1, { align: 'end', behavior: 'smooth' });
    }
  }, [virtualItems, virtualizer]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && mode === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, mode]);

  // ── Chat ──────────────────────────────────────────────

  const addMessage = (role: DisplayMessage['role'], content: string, isError = false) => {
    setMessages(prev => [
      ...prev,
      { id: `msg-${Date.now()}-${Math.random()}`, role, content, timestamp: new Date(), isError },
    ]);
  };

  const sendChat = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setInput('');

    addMessage('user', msg);
    setIsLoading(true);

    // Build history from previous messages (excluding system errors)
    const history: ChatHistoryEntry[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'model', content: m.content }));

    // Attempt streaming first, then fall back to non-streaming
    const streamingMsgId = `msg-${Date.now()}-${Math.random()}`;
    let rafId: number | null = null;
    try {
      // Create placeholder message for progressive rendering
      setMessages(prev => [
        ...prev,
        { id: streamingMsgId, role: 'model', content: '', timestamp: new Date() },
      ]);
      setIsStreaming(true);
      setIsLoading(false); // Hide loading dots — streaming content is visible

      let accumulated = '';

      await chatStream(msg, {
        summaryId,
        history,
        onChunk: (chunk) => {
          accumulated += chunk;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              const current = accumulated;
              setMessages(prev =>
                prev.map(m => m.id === streamingMsgId ? { ...m, content: current } : m)
              );
              rafId = null;
            });
          }
        },
        onSources: (sources) => {
          setMessageSources(prev => new Map(prev).set(streamingMsgId, sources));
        },
        onDone: (meta) => {
          if (meta.log_id) {
            setMessageLogIds(prev => new Map(prev).set(streamingMsgId, meta.log_id));
          }
        },
      });

      // Flush any pending RAF frame so the final text is rendered
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setMessages(prev =>
        prev.map(m => m.id === streamingMsgId ? { ...m, content: accumulated } : m)
      );

      setIsStreaming(false);
    } catch (streamErr) {
      // Streaming failed — cancel any pending RAF and fall back to non-streaming
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
      console.warn('[AxonAI] Stream failed, falling back:', streamErr);
      setMessages(prev => prev.filter(m => m.id !== streamingMsgId));
      setIsStreaming(false);
      setIsLoading(true);

      try {
        const result: RagChatResponse = await chat(msg, {
          history,
          summaryId,
        });

        const fallbackMsgId = `msg-${Date.now()}-${Math.random()}`;
        setMessages(prev => [
          ...prev,
          { id: fallbackMsgId, role: 'model' as const, content: result.response, timestamp: new Date() },
        ]);

        // Store sources & log_id for citations/feedback
        if (result.sources && result.sources.length > 0) {
          setMessageSources(prev => new Map(prev).set(fallbackMsgId, result.sources));
        }
        if (result.log_id) {
          setMessageLogIds(prev => new Map(prev).set(fallbackMsgId, result.log_id));
        }
      } catch (err: unknown) {
        addMessage('system', `Erro: ${(err as Error).message}`, true);
      } finally {
        setIsLoading(false);
      }
    }
  }, [input, isLoading, messages, summaryId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  // ── Flashcards ────────────────────────────────────────

  const generateFlashcardsFn = async () => {
    if (!summaryId) return;
    setIsLoading(true);
    setGeneratedCards([]);
    setFlippedCards(new Set());
    try {
      // Generate multiple flashcards sequentially (API returns one at a time)
      const count = 5;
      const cards: GeneratedFlashcard[] = [];
      for (let i = 0; i < count; i++) {
        const card = await generateFlashcard({ summaryId });
        cards.push(card);
      }
      setGeneratedCards(cards);
    } catch (err: unknown) {
      addMessage('system', `Erro ao gerar flashcards: ${(err as Error).message}`, true);
      setMode('chat');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Quiz ──────────────────────────────────────────────

  const generateQuizFn = async () => {
    if (!summaryId) return;
    setIsLoading(true);
    setGeneratedQuiz([]);
    setSelectedAnswers(new Map());
    setShowExplanations(new Set());
    try {
      // Generate multiple quiz questions sequentially (API returns one at a time)
      const count = 3;
      const questions: GeneratedQuestion[] = [];
      for (let i = 0; i < count; i++) {
        const q = await generateQuizQuestion({ summaryId });
        questions.push(q);
      }
      setGeneratedQuiz(questions);
    } catch (err: unknown) {
      addMessage('system', `Erro ao gerar quiz: ${(err as Error).message}`, true);
      setMode('chat');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Explain ───────────────────────────────────────────

  const explainFn = async () => {
    const concept = explainConceptText.trim();
    if (!concept) return;
    setIsLoading(true);
    setExplanation('');
    try {
      const result = await explainConceptApi(concept, summaryId);
      setExplanation(result);
    } catch (err: unknown) {
      addMessage('system', `Erro ao explicar: ${(err as Error).message}`, true);
      setMode('chat');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Copy ──────────────────────────────────────────────

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── RAG Feedback ───────────────────────────────────────

  const handleRagFeedback = async (msgId: string, feedback: 'positive' | 'negative') => {
    const logId = messageLogIds.get(msgId);
    if (!logId || feedbackGiven.has(msgId)) return;

    // Optimistic update
    setFeedbackGiven(prev => new Map(prev).set(msgId, feedback));

    try {
      await submitRagFeedback({ logId, feedback });
    } catch {
      // Revert on failure
      setFeedbackGiven(prev => {
        const next = new Map(prev);
        next.delete(msgId);
        return next;
      });
    }
  };

  // ── Render ────────────────────────────────────────────

  const resetMode = (newMode: AssistantMode) => {
    setMode(newMode);
    if (newMode === 'flashcards') {
      setGeneratedCards([]);
    }
    if (newMode === 'quiz') {
      setGeneratedQuiz([]);
    }
    if (newMode === 'explain') {
      setExplanation('');
      setExplainConceptText('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-label="Asistente AI Axon"
            aria-modal="true"
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-[#f5f6fa] shadow-2xl z-[70] flex flex-col"
          >
            {/* ── Header ── */}
            <div className="shrink-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-4 flex items-center justify-between relative overflow-hidden">
              {/* Ambient */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Axon AI
                  </h2>
                  <p className="text-white/60 text-xs">
                    Powered by Gemini
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Cerrar asistente"
                className="relative w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Mode tabs ── */}
            <div role="tablist" className="shrink-0 px-3 py-2 bg-white border-b border-gray-200/60 flex gap-1">
              {([
                { id: 'chat', icon: Sparkles, label: 'Chat' },
                { id: 'flashcards', icon: Layers, label: 'Flashcards' },
                { id: 'quiz', icon: GraduationCap, label: 'Quiz' },
                { id: 'explain', icon: BookOpen, label: 'Explicar' },
                { id: 'voice', icon: Phone, label: 'Llamar' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => resetMode(tab.id)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                    mode === tab.id
                      ? "bg-violet-50 text-violet-700 shadow-sm border border-violet-200/60"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {mode === 'chat' && renderChat()}
              {mode === 'flashcards' && renderFlashcards()}
              {mode === 'quiz' && renderQuiz()}
              {mode === 'explain' && renderExplain()}
              {mode === 'voice' && <VoiceCallPanel />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ════════════════════════════════════════════════════════
  // CHAT VIEW
  // ════════════════════════════════════════════════════════

  function renderChat() {
    return (
      <>
        {/* Messages */}
        <div ref={chatScrollRef} role="log" aria-live="polite" className="flex-1 overflow-y-auto custom-scrollbar-light">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-6 px-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center border border-violet-200/60">
                <Sparkles size={28} className="text-violet-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Como posso ajudar?
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Pergunte sobre qualquer topico de medicina
                </p>
              </div>

              {/* Quick prompts */}
              <div className="space-y-2 max-w-sm mx-auto">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendChat(prompt.label)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200/60 hover:border-violet-300 hover:shadow-sm transition-all text-left group"
                  >
                    <prompt.icon size={16} className={prompt.color} />
                    <span className="text-sm text-gray-600 group-hover:text-gray-800 flex-1">{prompt.label}</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map(virtualRow => {
                const idx = virtualRow.index;

                // Loading indicator (last virtual item when loading)
                if (idx >= messages.length) {
                  return (
                    <div
                      key="loading"
                      data-index={idx}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="px-4 py-2"
                    >
                      <div className="flex gap-3 justify-start">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                          <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const msg = messages[idx];
                return (
                  <div
                    key={msg.id}
                    data-index={idx}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="px-4 py-2"
                  >
                    <div
                      className={clsx(
                        "flex gap-3",
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role !== 'user' && (
                        <div className={clsx(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          msg.isError ? "bg-red-100" : "bg-gradient-to-br from-violet-500 to-purple-600"
                        )}>
                          {msg.isError
                            ? <AlertCircle size={14} className="text-red-500" />
                            : <Sparkles size={12} className="text-white" />}
                        </div>
                      )}
                      <div
                        className={clsx(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group",
                          msg.role === 'user'
                            ? "bg-violet-600 text-white rounded-br-md"
                            : msg.isError
                              ? "bg-red-50 text-red-700 border border-red-100 rounded-bl-md"
                              : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-md"
                        )}
                      >
                        {renderMarkdown(msg.content)}

                        {/* Action buttons: copy + feedback */}
                        {msg.role === 'model' && (
                          <div className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {/* Feedback buttons (only when log_id exists) */}
                            {messageLogIds.has(msg.id) && (
                              <>
                                <button
                                  aria-label="Respuesta util"
                                  onClick={() => handleRagFeedback(msg.id, 'positive')}
                                  disabled={feedbackGiven.has(msg.id)}
                                  className={clsx(
                                    "bg-white shadow-md border border-gray-200 rounded-lg p-1.5 transition-colors",
                                    feedbackGiven.get(msg.id) === 'positive'
                                      ? "text-emerald-500 border-emerald-300"
                                      : feedbackGiven.has(msg.id)
                                        ? "text-gray-300 cursor-not-allowed"
                                        : "text-gray-400 hover:text-emerald-500"
                                  )}
                                >
                                  <ThumbsUp size={12} />
                                </button>
                                <button
                                  aria-label="Respuesta no util"
                                  onClick={() => handleRagFeedback(msg.id, 'negative')}
                                  disabled={feedbackGiven.has(msg.id)}
                                  className={clsx(
                                    "bg-white shadow-md border border-gray-200 rounded-lg p-1.5 transition-colors",
                                    feedbackGiven.get(msg.id) === 'negative'
                                      ? "text-red-500 border-red-300"
                                      : feedbackGiven.has(msg.id)
                                        ? "text-gray-300 cursor-not-allowed"
                                        : "text-gray-400 hover:text-red-500"
                                  )}
                                >
                                  <ThumbsDown size={12} />
                                </button>
                              </>
                            )}
                            <button
                              aria-label="Copiar respuesta"
                              onClick={() => copyText(msg.content, msg.id)}
                              className="bg-white shadow-md border border-gray-200 rounded-lg p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                            >
                              {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}

                        {/* Citations (collapsible) */}
                        {msg.role === 'model' && messageSources.has(msg.id) && (
                          <details className="mt-3 border-t border-gray-100 pt-2">
                            <summary className="text-[10px] font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-500 select-none">
                              Fontes ({messageSources.get(msg.id)!.length})
                            </summary>
                            <ul className="mt-1.5 space-y-1">
                              {messageSources.get(msg.id)!.map((src, si) => (
                                <li key={si} className="flex items-center justify-between text-[11px] text-gray-500 bg-[#F0F2F5] rounded-md px-2 py-1.5">
                                  <span className="truncate mr-2">{src.summary_title}</span>
                                  <span className="shrink-0 text-[10px] font-mono text-violet-500">
                                    {(src.similarity * 100).toFixed(0)}%
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 p-3 bg-white border-t border-gray-200/60">
          {/* Context badge */}
          {(currentCourse || currentTopic) && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Contexto:</span>
              <span className="text-[11px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200/60">
                {currentTopic?.title || currentCourse?.name}
              </span>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              aria-label="Escribe tu mensaje"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre medicina..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-[#F0F2F5] border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 resize-none"
              style={{ maxHeight: '120px' }}
            />
            <button
              aria-label="Enviar mensaje"
              onClick={() => sendChat()}
              disabled={!input.trim() || isLoading}
              className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                input.trim() && !isLoading
                  ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                  : "bg-gray-100 text-gray-300"
              )}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════
  // FLASHCARD GENERATOR VIEW
  // ════════════════════════════════════════════════════════

  function renderFlashcards() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 py-4 space-y-4">
        {generatedCards.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border border-blue-200/60 mb-3">
                <Layers size={24} className="text-blue-500" />
              </div>
              <h3 className="font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Gerar Flashcards com IA
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                {summaryId
                  ? 'Gere flashcards baseados no resumo atual'
                  : 'Navega a un resumen para generar flashcards'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200/60 space-y-3">
              {!summaryId && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">Navega a un resumen para generar flashcards con IA.</p>
                </div>
              )}
              <button
                onClick={generateFlashcardsFn}
                disabled={isLoading || !summaryId}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isLoading ? 'Gerando...' : 'Gerar Flashcards'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setGeneratedCards([])} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                <ArrowLeft size={14} /> Voltar
              </button>
              <span className="text-xs text-gray-400">{generatedCards.length} flashcards gerados</span>
            </div>

            {generatedCards.map((card, i) => {
              const isFlipped = flippedCards.has(i);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    const next = new Set(flippedCards);
                    isFlipped ? next.delete(i) : next.add(i);
                    setFlippedCards(next);
                  }}
                  className="cursor-pointer"
                >
                  <div className={clsx(
                    "rounded-xl p-4 border transition-all min-h-[100px] flex flex-col justify-center",
                    isFlipped
                      ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200"
                      : "bg-white border-gray-200/60 hover:border-violet-300 hover:shadow-sm"
                  )}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={clsx(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        isFlipped ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"
                      )}>
                        {isFlipped ? 'Resposta' : `Pergunta ${i + 1}`}
                      </span>
                      <RotateCcw size={12} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {isFlipped ? card.back : card.front}
                    </p>
                  </div>
                </motion.div>
              );
            })}

            <button
              onClick={generateFlashcardsFn}
              className="w-full py-2.5 border-2 border-dashed border-violet-300/60 text-violet-600 rounded-xl text-sm font-medium hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Gerar Novos
            </button>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // QUIZ GENERATOR VIEW
  // ════════════════════════════════════════════════════════

  function renderQuiz() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 py-4 space-y-4">
        {generatedQuiz.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center border border-amber-200/60 mb-3">
                <GraduationCap size={24} className="text-amber-500" />
              </div>
              <h3 className="font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Quiz com IA
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                {summaryId
                  ? 'Questoes no estilo residencia medica'
                  : 'Navega a un resumen para generar quiz'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200/60 space-y-3">
              {!summaryId && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">Navega a un resumen para generar quiz con IA.</p>
                </div>
              )}
              <button
                onClick={generateQuizFn}
                disabled={isLoading || !summaryId}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {isLoading ? 'Gerando...' : 'Gerar Quiz'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setGeneratedQuiz([])} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                <ArrowLeft size={14} /> Voltar
              </button>
              <span className="text-xs text-gray-400">{generatedQuiz.length} questoes</span>
            </div>

            {generatedQuiz.map((q, qi) => {
              const selected = selectedAnswers.get(qi);
              const isAnswered = selected !== undefined;
              // correct_answer is a string; find its index in options
              const correctIdx = q.options.findIndex(o => o === q.correct_answer);
              const isCorrect = selected === correctIdx;
              const showExp = showExplanations.has(qi);

              return (
                <motion.div
                  key={qi}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: qi * 0.08 }}
                  className="bg-white rounded-xl border border-gray-200/60 overflow-hidden"
                >
                  <div className="px-4 pt-4 pb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Questao {qi + 1}</span>
                    <p className="text-sm text-gray-800 font-medium mt-1 leading-relaxed">{q.question}</p>
                  </div>
                  <div className="px-4 pb-3 space-y-2">
                    {q.options.map((opt, oi) => {
                      const isThisCorrect = oi === correctIdx;
                      const isThisSelected = selected === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => {
                            if (isAnswered) return;
                            const next = new Map(selectedAnswers);
                            next.set(qi, oi);
                            setSelectedAnswers(next);
                            // Auto show explanation
                            const nextExp = new Set(showExplanations);
                            nextExp.add(qi);
                            setShowExplanations(nextExp);
                          }}
                          className={clsx(
                            "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border",
                            !isAnswered && "hover:bg-gray-50 border-gray-200 text-gray-600",
                            isAnswered && isThisCorrect && "bg-emerald-50 border-emerald-300 text-emerald-800",
                            isAnswered && isThisSelected && !isThisCorrect && "bg-red-50 border-red-300 text-red-800",
                            isAnswered && !isThisCorrect && !isThisSelected && "border-gray-100 text-gray-400 opacity-60"
                          )}
                          disabled={isAnswered}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <AnimatePresence>
                    {showExp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={clsx(
                          "mx-4 mb-4 p-3 rounded-lg text-xs leading-relaxed",
                          isCorrect ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                        )}>
                          <span className="font-bold">{isCorrect ? 'Correto!' : 'Incorreto.'}</span>{' '}
                          {q.explanation}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            <button
              onClick={generateQuizFn}
              className="w-full py-2.5 border-2 border-dashed border-amber-300/60 text-amber-600 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Gerar Novo Quiz
            </button>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // EXPLAIN VIEW
  // ════════════════════════════════════════════════════════

  function renderExplain() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 py-4 space-y-4">
        {!explanation ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border border-emerald-200/60 mb-3">
                <BookOpen size={24} className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Explicacao Profunda
              </h3>
              <p className="text-gray-400 text-xs mt-1">IA explica qualquer conceito medico em detalhes</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200/60 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Conceito</label>
                <textarea
                  value={explainConceptText}
                  onChange={e => setExplainConceptText(e.target.value)}
                  placeholder="Ex: Potencial de acao no neuronio"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#F0F2F5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                />
              </div>
              <button
                onClick={explainFn}
                disabled={!explainConceptText.trim() || isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-sm shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                {isLoading ? 'Analisando...' : 'Explicar Conceito'}
              </button>
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sugestoes</span>
              {[
                'Sistema Renina-Angiotensina-Aldosterona',
                'Ciclo de Krebs e fosforilacao oxidativa',
                'Mecanismo de Frank-Starling',
              ].map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setExplainConceptText(s); }}
                  className="w-full text-left px-3 py-2 bg-white rounded-lg border border-gray-200/60 text-sm text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setExplanation('')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                <ArrowLeft size={14} /> Voltar
              </button>
              <button
                aria-label="Copiar respuesta"
                onClick={() => copyText(explanation, 'explanation')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-500"
              >
                {copiedId === 'explanation' ? <Check size={12} /> : <Copy size={12} />}
                Copiar
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-5 border border-gray-200/60 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <BookOpen size={14} className="text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{explainConceptText}</h4>
                  <p className="text-[10px] text-gray-400">Explicacao gerada por Axon AI</p>
                </div>
              </div>
              <div className="prose prose-sm prose-gray max-w-none text-sm leading-relaxed text-gray-700">
                {renderMarkdown(explanation)}
              </div>
            </motion.div>

            <button
              onClick={() => { setExplanation(''); setExplainConceptText(''); }}
              className="w-full py-2.5 border-2 border-dashed border-emerald-300/60 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Novo Conceito
            </button>
          </div>
        )}
      </div>
    );
  }
}

// ── Markdown renderer (simplified) ────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="font-bold text-gray-800 mt-3 mb-1 text-sm">
          {processInline(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="font-bold text-gray-800 mt-4 mb-1.5">
          {processInline(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-3 border-violet-400 pl-3 my-2 text-violet-700 bg-violet-50 py-2 pr-3 rounded-r-lg text-xs italic">
          {processInline(trimmed.slice(2))}
        </blockquote>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-violet-400 mt-1 shrink-0">&#8226;</span>
          <span>{processInline(trimmed.slice(2))}</span>
        </div>
      );
    } else if (trimmed === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-1">{processInline(trimmed)}</p>);
    }
  });

  return <>{elements}</>;
}

function processInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    // Inline code `text`
    const codeParts = part.split(/(`[^`]+`)/g);
    if (codeParts.length > 1) {
      return codeParts.map((cp, ci) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return <code key={`${i}-${ci}`} className="bg-gray-100 text-violet-600 px-1 py-0.5 rounded text-xs font-mono">{cp.slice(1, -1)}</code>;
        }
        return cp;
      });
    }
    return part;
  });
}
