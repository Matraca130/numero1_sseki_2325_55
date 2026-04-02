/**
 * AxonAIAssistant — Main component.
 * Floating panel with chat, flashcard gen, quiz gen, and concept explanations.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Send, Sparkles, Layers, GraduationCap, BookOpen,
  Loader2, ChevronRight, RotateCcw, Copy, Check, AlertCircle,
  Zap, ArrowLeft, Phone, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import clsx from 'clsx';
import { VoiceCallPanel } from '../VoiceCallPanel';
import type { ChatHistoryEntry } from '@/app/services/aiService';
import type { GeneratedFlashcard, GeneratedQuestion } from '@/app/services/aiService';
import type { AssistantMode, DisplayMessage } from './constants';
import { QUICK_PROMPTS } from './constants';
import { sendChatMessage, sendRagFeedback } from './chat-logic';
import { generateFlashcardsForTopic, generateQuizQuestions, explainConceptTerm } from './generation-logic';
import { renderMarkdown } from './markdown-renderer';

interface AxonAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  summaryId?: string;
}

export function AxonAIAssistant({ isOpen, onClose, summaryId }: AxonAIAssistantProps) {
  const { currentCourse, currentTopic } = useNavigation();

  const [mode, setMode] = useState<AssistantMode>('chat');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messageSources, setMessageSources] = useState<Map<string, Array<{ chunk_id: string; summary_title: string; similarity: number }>>>(new Map());
  const [messageLogIds, setMessageLogIds] = useState<Map<string, string>>(new Map());
  const [feedbackGiven, setFeedbackGiven] = useState<Map<string, 'positive' | 'negative'>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedFlashcard[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, number>>(new Map());
  const [showExplanations, setShowExplanations] = useState<Set<number>>(new Set());
  const [explainConceptText, setExplainConceptText] = useState('');
  const [explanation, setExplanation] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const virtualItems = messages.length + (isLoading && !isStreaming ? 1 : 0);
  const virtualizer = useVirtualizer({ count: virtualItems, getScrollElement: () => chatScrollRef.current, estimateSize: () => 80, overscan: 5 });

  useEffect(() => { if (virtualItems > 0) virtualizer.scrollToIndex(virtualItems - 1, { align: 'end', behavior: 'smooth' }); }, [virtualItems, virtualizer]);
  useEffect(() => { if (isOpen && mode === 'chat') setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen, mode]);

  const addMessage = (role: DisplayMessage['role'], content: string, isError = false) => {
    setMessages(prev => [...prev, { id: `msg-${Date.now()}-${Math.random()}`, role, content, timestamp: new Date(), isError }]);
  };

  const sendChat = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setInput('');
    addMessage('user', msg);
    setIsLoading(true);

    const history: ChatHistoryEntry[] = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'model', content: m.content }));

    setIsStreaming(true);
    const result = await sendChatMessage(msg, {
      summaryId, history,
      onStreamStart: (id) => { setMessages(prev => [...prev, { id, role: 'model', content: '', timestamp: new Date() }]); setIsLoading(false); },
      onStreamChunk: (id, acc) => { setMessages(prev => prev.map(m => m.id === id ? { ...m, content: acc } : m)); },
      onStreamSources: (id, sources) => { setMessageSources(prev => new Map(prev).set(id, sources)); },
      onStreamDone: (id, logId) => { setMessageLogIds(prev => new Map(prev).set(id, logId)); },
      onStreamEnd: () => { setIsStreaming(false); },
    });

    if (result.streamCompleted) {
      // Streaming succeeded — message was progressively rendered, nothing more to do
    } else if (result.isError) {
      // Remove orphaned streaming placeholder, then show error
      if (result.streamingPlaceholderId) {
        setMessages(prev => prev.filter(m => m.id !== result.streamingPlaceholderId));
      }
      addMessage('system', result.content, true);
    } else {
      // Fallback path — replace streaming placeholder with the real response
      if (result.streamingPlaceholderId) {
        setMessages(prev => prev.filter(m => m.id !== result.streamingPlaceholderId));
      }
      setMessages(prev => [...prev, { id: result.msgId, role: 'model', content: result.content, timestamp: new Date() }]);
      if (result.sources?.length) setMessageSources(prev => new Map(prev).set(result.msgId, result.sources!));
      if (result.logId) setMessageLogIds(prev => new Map(prev).set(result.msgId, result.logId!));
    }
    setIsStreaming(false); // Defensive: ensure isStreaming is always reset
    setIsLoading(false);
  }, [input, isLoading, messages, summaryId]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } };

  const generateFlashcardsFn = async () => {
    if (!summaryId) return;
    setIsLoading(true); setGeneratedCards([]); setFlippedCards(new Set());
    try { setGeneratedCards(await generateFlashcardsForTopic(summaryId)); }
    catch (err: unknown) { addMessage('system', `Erro ao gerar flashcards: ${(err as Error).message}`, true); setMode('chat'); }
    finally { setIsLoading(false); }
  };

  const generateQuizFn = async () => {
    if (!summaryId) return;
    setIsLoading(true); setGeneratedQuiz([]); setSelectedAnswers(new Map()); setShowExplanations(new Set());
    try { setGeneratedQuiz(await generateQuizQuestions(summaryId)); }
    catch (err: unknown) { addMessage('system', `Erro ao gerar quiz: ${(err as Error).message}`, true); setMode('chat'); }
    finally { setIsLoading(false); }
  };

  const explainFn = async () => {
    const concept = explainConceptText.trim();
    if (!concept) return;
    setIsLoading(true); setExplanation('');
    try { setExplanation(await explainConceptTerm(concept, summaryId)); }
    catch (err: unknown) { addMessage('system', `Erro ao explicar: ${(err as Error).message}`, true); setMode('chat'); }
    finally { setIsLoading(false); }
  };

  const copyText = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const handleRagFeedback = async (msgId: string, feedback: 'positive' | 'negative') => {
    const logId = messageLogIds.get(msgId);
    if (!logId || feedbackGiven.has(msgId)) return;
    setFeedbackGiven(prev => new Map(prev).set(msgId, feedback));
    const ok = await sendRagFeedback(logId, feedback);
    if (!ok) setFeedbackGiven(prev => { const next = new Map(prev); next.delete(msgId); return next; });
  };

  const resetMode = (newMode: AssistantMode) => {
    setMode(newMode);
    if (newMode === 'flashcards') setGeneratedCards([]);
    if (newMode === 'quiz') setGeneratedQuiz([]);
    if (newMode === 'explain') { setExplanation(''); setExplainConceptText(''); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" onClick={onClose} />
          <motion.div initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} role="dialog" aria-label="Asistente AI Axon" aria-modal="true" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-[#f5f6fa] shadow-2xl z-[70] flex flex-col">
            {/* Header */}
            <div className="shrink-0 bg-teal-700 px-5 py-4 flex items-center justify-between relative overflow-hidden">
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20"><Sparkles size={20} className="text-white" /></div>
                <div><h2 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Axon AI</h2><p className="text-white/60 text-xs">Powered by Gemini</p></div>
              </div>
              <button onClick={onClose} aria-label="Cerrar asistente" className="relative w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            {/* Mode tabs */}
            <div role="tablist" className="shrink-0 px-3 py-2 bg-white border-b border-gray-200/60 flex gap-1">
              {([{ id: 'chat', icon: Sparkles, label: 'Chat' }, { id: 'flashcards', icon: Layers, label: 'Flashcards' }, { id: 'quiz', icon: GraduationCap, label: 'Quiz' }, { id: 'explain', icon: BookOpen, label: 'Explicar' }, { id: 'voice', icon: Phone, label: 'Llamar' }] as const).map(tab => (
                <button key={tab.id} role="tab" aria-selected={mode === tab.id} onClick={() => resetMode(tab.id)} className={clsx("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all", mode === tab.id ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-200/60" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50")}>
                  <tab.icon size={14} />{tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {mode === 'chat' && renderChatPanel()}
              {mode === 'flashcards' && renderFlashcardsPanel()}
              {mode === 'quiz' && renderQuizPanel()}
              {mode === 'explain' && renderExplainPanel()}
              {mode === 'voice' && <VoiceCallPanel summaryId={summaryId} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ── Chat Panel ──
  function renderChatPanel() {
    return (
      <>
        <div ref={chatScrollRef} role="log" aria-live="polite" className="flex-1 overflow-y-auto custom-scrollbar-light">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-6 px-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-200/60"><Sparkles size={28} className="text-teal-500" /></div>
              <div><h3 className="font-bold text-gray-800 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Como posso ajudar?</h3><p className="text-gray-400 text-sm mt-1">Pergunte sobre qualquer topico de medicina</p></div>
              <div className="space-y-2 max-w-sm mx-auto">{QUICK_PROMPTS.map((p, i) => (<button key={i} onClick={() => sendChat(p.label)} className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200/60 hover:border-teal-300 hover:shadow-sm transition-all text-left group"><p.icon size={16} className={p.color} /><span className="text-sm text-gray-600 group-hover:text-gray-800 flex-1">{p.label}</span><ChevronRight size={14} className="text-gray-300 group-hover:text-teal-400 transition-colors" /></button>))}</div>
            </div>
          )}
          {messages.length > 0 && (
            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {virtualizer.getVirtualItems().map(vr => {
                const idx = vr.index;
                if (idx >= messages.length) return (
                  <div key="loading" data-index={idx} ref={virtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vr.start}px)` }} className="px-4 py-2">
                    <div className="flex gap-3 justify-start"><div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center shrink-0"><Sparkles size={12} className="text-white" /></div><div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100"><div className="flex gap-1.5"><span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>
                  </div>
                );
                const msg = messages[idx];
                return (
                  <div key={msg.id} data-index={idx} ref={virtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vr.start}px)` }} className="px-4 py-2">
                    <div className={clsx("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role !== 'user' && (<div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", msg.isError ? "bg-red-100" : "bg-teal-600")}>{msg.isError ? <AlertCircle size={14} className="text-red-500" /> : <Sparkles size={12} className="text-white" />}</div>)}
                      <div className={clsx("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group", msg.role === 'user' ? "bg-teal-600 text-white rounded-br-md" : msg.isError ? "bg-red-50 text-red-700 border border-red-100 rounded-bl-md" : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-md")}>
                        {renderMarkdown(msg.content)}
                        {msg.role === 'model' && (<div className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {messageLogIds.has(msg.id) && (<><button aria-label="Respuesta util" onClick={() => handleRagFeedback(msg.id, 'positive')} disabled={feedbackGiven.has(msg.id)} className={clsx("bg-white shadow-md border border-gray-200 rounded-lg p-1.5 transition-colors", feedbackGiven.get(msg.id) === 'positive' ? "text-emerald-500 border-emerald-300" : feedbackGiven.has(msg.id) ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-emerald-500")}><ThumbsUp size={12} /></button><button aria-label="Respuesta no util" onClick={() => handleRagFeedback(msg.id, 'negative')} disabled={feedbackGiven.has(msg.id)} className={clsx("bg-white shadow-md border border-gray-200 rounded-lg p-1.5 transition-colors", feedbackGiven.get(msg.id) === 'negative' ? "text-red-500 border-red-300" : feedbackGiven.has(msg.id) ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-500")}><ThumbsDown size={12} /></button></>)}
                          <button aria-label="Copiar respuesta" onClick={() => copyText(msg.content, msg.id)} className="bg-white shadow-md border border-gray-200 rounded-lg p-1.5 text-gray-400 hover:text-teal-500 transition-colors">{copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}</button>
                        </div>)}
                        {msg.role === 'model' && messageSources.has(msg.id) && (<details className="mt-3 border-t border-gray-100 pt-2"><summary className="text-[10px] font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-teal-500 select-none">Fontes ({messageSources.get(msg.id)!.length})</summary><ul className="mt-1.5 space-y-1">{messageSources.get(msg.id)!.map((src, si) => (<li key={si} className="flex items-center justify-between text-[11px] text-gray-500 bg-[#F0F2F5] rounded-md px-2 py-1.5"><span className="truncate mr-2">{src.summary_title}</span><span className="shrink-0 text-[10px] font-mono text-teal-500">{(src.similarity * 100).toFixed(0)}%</span></li>))}</ul></details>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="shrink-0 p-3 bg-white border-t border-gray-200/60">
          {(currentCourse || currentTopic) && (<div className="flex items-center gap-2 mb-2 px-1"><span className="text-[10px] text-gray-400 uppercase tracking-wider">Contexto:</span><span className="text-[11px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full border border-teal-200/60">{currentTopic?.title || currentCourse?.name}</span></div>)}
          <div className="flex gap-2 items-end">
            <textarea ref={inputRef} aria-label="Escribe tu mensaje" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunte sobre medicina..." rows={1} className="flex-1 px-4 py-2.5 bg-[#F0F2F5] border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 resize-none" style={{ maxHeight: '120px' }} />
            <button aria-label="Enviar mensaje" onClick={() => sendChat()} disabled={!input.trim() || isLoading} className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all", input.trim() && !isLoading ? "bg-teal-600 text-white hover:bg-teal-700 shadow-sm" : "bg-gray-100 text-gray-300")}>{isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}</button>
          </div>
        </div>
      </>
    );
  }

  // ── Flashcards Panel ──
  function renderFlashcardsPanel() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 py-4 space-y-4">
        {generatedCards.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4"><div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-200/60 mb-3"><Layers size={24} className="text-teal-500" /></div><h3 className="font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Gerar Flashcards com IA</h3><p className="text-gray-400 text-xs mt-1">{summaryId ? 'Gere flashcards baseados no resumo atual' : 'Navega a un resumen para generar flashcards'}</p></div>
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 space-y-3">
              {!summaryId && (<div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg"><AlertCircle size={14} className="text-amber-500 shrink-0" /><p className="text-xs text-amber-700">Navega a un resumen para generar flashcards con IA.</p></div>)}
              <button onClick={generateFlashcardsFn} disabled={isLoading || !summaryId} className="w-full py-3 bg-[#2a8c7a] hover:bg-[#244e47] text-white rounded-full font-semibold text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">{isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{isLoading ? 'Gerando...' : 'Gerar Flashcards'}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><button onClick={() => setGeneratedCards([])} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"><ArrowLeft size={14} /> Voltar</button><span className="text-xs text-gray-400">{generatedCards.length} flashcards gerados</span></div>
            {generatedCards.map((card, i) => { const isFlipped = flippedCards.has(i); return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => { const next = new Set(flippedCards); isFlipped ? next.delete(i) : next.add(i); setFlippedCards(next); }} className="cursor-pointer">
                <div className={clsx("rounded-xl p-4 border transition-all min-h-[100px] flex flex-col justify-center", isFlipped ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" : "bg-white border-gray-200/60 hover:border-teal-300 hover:shadow-sm")}>
                  <div className="flex items-start justify-between gap-2 mb-2"><span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", isFlipped ? "bg-emerald-100 text-emerald-600" : "bg-teal-100 text-teal-600")}>{isFlipped ? 'Resposta' : `Pergunta ${i + 1}`}</span><RotateCcw size={12} className="text-gray-300" /></div>
                  <p className="text-sm text-gray-700 leading-relaxed">{isFlipped ? card.back : card.front}</p>
                </div>
              </motion.div>
            ); })}
            <button onClick={generateFlashcardsFn} className="w-full py-2.5 border-2 border-dashed border-teal-300/60 text-teal-600 rounded-full text-sm font-medium hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"><RotateCcw size={14} /> Gerar Novos</button>
          </div>
        )}
      </div>
    );
  }

  // ── Quiz Panel ──
  function renderQuizPanel() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 py-4 space-y-4">
        {generatedQuiz.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4"><div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-200/60 mb-3"><GraduationCap size={24} className="text-teal-500" /></div><h3 className="font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Quiz com IA</h3><p className="text-gray-400 text-xs mt-1">{summaryId ? 'Questoes no estilo residencia medica' : 'Navega a un resumen para generar quiz'}</p></div>
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 space-y-3">
              {!summaryId && (<div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg"><AlertCircle size={14} className="text-amber-500 shrink-0" /><p className="text-xs text-amber-700">Navega a un resumen para generar quiz con IA.</p></div>)}
              <button onClick={generateQuizFn} disabled={isLoading || !summaryId} className="w-full py-3 bg-[#2a8c7a] hover:bg-[#244e47] text-white rounded-full font-semibold text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">{isLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}{isLoading ? 'Gerando...' : 'Gerar Quiz'}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between"><button onClick={() => setGeneratedQuiz([])} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"><ArrowLeft size={14} /> Voltar</button><span className="text-xs text-gray-400">{generatedQuiz.length} questoes</span></div>
            {generatedQuiz.map((q, qi) => { const selected = selectedAnswers.get(qi); const isAnswered = selected !== undefined; const correctIdx = q.options.findIndex(o => o === q.correct_answer); const isCorrect = selected === correctIdx; const showExp = showExplanations.has(qi); return (
              <motion.div key={qi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.08 }} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                <div className="px-4 pt-4 pb-3"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Questao {qi + 1}</span><p className="text-sm text-gray-800 font-medium mt-1 leading-relaxed">{q.question}</p></div>
                <div className="px-4 pb-3 space-y-2">{q.options.map((opt, oi) => { const isThisCorrect = oi === correctIdx; const isThisSelected = selected === oi; return (
                  <button key={oi} onClick={() => { if (isAnswered) return; setSelectedAnswers(prev => new Map(prev).set(qi, oi)); setShowExplanations(prev => new Set(prev).add(qi)); }} className={clsx("w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border", !isAnswered && "hover:bg-gray-50 border-gray-200 text-gray-600", isAnswered && isThisCorrect && "bg-emerald-50 border-emerald-300 text-emerald-800", isAnswered && isThisSelected && !isThisCorrect && "bg-red-50 border-red-300 text-red-800", isAnswered && !isThisCorrect && !isThisSelected && "border-gray-100 text-gray-400 opacity-60")} disabled={isAnswered}>{opt}</button>
                ); })}</div>
                <AnimatePresence>{showExp && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className={clsx("mx-4 mb-4 p-3 rounded-lg text-xs leading-relaxed", isCorrect ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200")}><span className="font-bold">{isCorrect ? 'Correto!' : 'Incorreto.'}</span> {q.explanation}</div></motion.div>)}</AnimatePresence>
              </motion.div>
            ); })}
            <button onClick={generateQuizFn} className="w-full py-2.5 border-2 border-dashed border-teal-300/60 text-teal-600 rounded-full text-sm font-medium hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"><RotateCcw size={14} /> Gerar Novo Quiz</button>
          </div>
        )}
      </div>
    );
  }

  // ── Explain Panel ──
  function renderExplainPanel() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 py-4 space-y-4">
        {!explanation ? (
          <div className="space-y-4">
            <div className="text-center py-4"><div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-200/60 mb-3"><BookOpen size={24} className="text-teal-500" /></div><h3 className="font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Explicacao Profunda</h3><p className="text-gray-400 text-xs mt-1">IA explica qualquer conceito medico em detalhes</p></div>
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 space-y-3">
              <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Conceito</label><textarea value={explainConceptText} onChange={e => setExplainConceptText(e.target.value)} placeholder="Ex: Potencial de acao no neuronio" rows={3} className="w-full px-3 py-2.5 bg-[#F0F2F5] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none" /></div>
              <button onClick={explainFn} disabled={!explainConceptText.trim() || isLoading} className="w-full py-3 bg-[#2a8c7a] hover:bg-[#244e47] text-white rounded-full font-semibold text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">{isLoading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}{isLoading ? 'Analisando...' : 'Explicar Conceito'}</button>
            </div>
            <div className="space-y-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sugestoes</span>{['Sistema Renina-Angiotensina-Aldosterona', 'Ciclo de Krebs e fosforilacao oxidativa', 'Mecanismo de Frank-Starling'].map((s, i) => (<button key={i} onClick={() => setExplainConceptText(s)} className="w-full text-left px-3 py-2 bg-white rounded-lg border border-gray-200/60 text-sm text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all">{s}</button>))}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><button onClick={() => setExplanation('')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"><ArrowLeft size={14} /> Voltar</button><button aria-label="Copiar respuesta" onClick={() => copyText(explanation, 'explanation')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-500">{copiedId === 'explanation' ? <Check size={12} /> : <Copy size={12} />}Copiar</button></div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-5 border border-gray-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center"><BookOpen size={14} className="text-white" /></div><div><h4 className="text-sm font-bold text-gray-800">{explainConceptText}</h4><p className="text-[10px] text-gray-400">Explicacao gerada por Axon AI</p></div></div>
              <div className="prose prose-sm prose-gray max-w-none text-sm leading-relaxed text-gray-700">{renderMarkdown(explanation)}</div>
            </motion.div>
            <button onClick={() => { setExplanation(''); setExplainConceptText(''); }} className="w-full py-2.5 border-2 border-dashed border-teal-300/60 text-teal-600 rounded-full text-sm font-medium hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"><RotateCcw size={14} /> Novo Conceito</button>
          </div>
        )}
      </div>
    );
  }
}

export default AxonAIAssistant;
