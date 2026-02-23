// ============================================================
// Axon — Student QuizView (connected to real backend)
//
// DESIGN: Preserves original teal accent, animations, progress
// bar, score circle. Only data layer replaced.
//
// Backend:
//   GET  /quiz-questions?summary_id=xxx
//   POST /study-sessions { session_type: "quiz" }
//   POST /quiz-attempts { quiz_question_id, answer, is_correct, session_id, time_taken_ms }
//   PUT  /study-sessions/:id { ended_at, duration_seconds, total_reviews, correct_reviews }
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useAuth } from '@/app/context/AuthContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { getTopicSummaries } from '@/app/services/platformApi';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuestionType, Difficulty, StudySession } from '@/app/services/quizApi';
import type { Summary } from '@/app/types/platform';
import type { TreeCourse, TreeSemester, TreeSection, TreeTopic } from '@/app/services/contentTreeApi';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  CheckCircle2, XCircle, ChevronLeft, Trophy, RotateCw,
  Lightbulb, GraduationCap, ChevronRight, ChevronDown,
  BookOpen, X, ListChecks, ToggleLeft, MessageSquare,
  Loader2, FileText, Layers, Clock, Filter,
  Play, AlertCircle, History, Pencil,
} from 'lucide-react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { headingStyle, components } from '@/app/design-system';
import { iconBadgeClasses } from '@/app/design-system';

// ── Helpers ──────────────────────────────────────────────

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function checkAnswer(q: QuizQuestion, userAnswer: string): boolean {
  if (q.question_type === 'mcq') {
    return userAnswer === q.correct_answer;
  }
  if (q.question_type === 'true_false') {
    return normalizeText(userAnswer) === normalizeText(q.correct_answer);
  }
  // open: flexible match
  const norm = normalizeText(userAnswer);
  const expected = normalizeText(q.correct_answer);
  if (!norm) return false;
  return norm === expected || norm.includes(expected) || expected.includes(norm);
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Completar',
  open: 'Respuesta abierta',
};

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  mcq: <ListChecks size={10} />,
  true_false: <ToggleLeft size={10} />,
  fill_blank: <Pencil size={10} />,
  open: <MessageSquare size={10} />,
};

const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  mcq: 'text-teal-700 bg-teal-50 border-teal-200',
  true_false: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  fill_blank: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  open: 'text-amber-700 bg-amber-50 border-amber-200',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ── Per-question answer state ────────────────────────────

interface SavedAnswer {
  selectedOption: string | null; // MC: the option text
  textInput: string;             // open / true_false
  correct: boolean;
  answered: boolean;
  timeTakenMs: number;
}

function emptyAnswer(): SavedAnswer {
  return { selectedOption: null, textInput: '', correct: false, answered: false, timeTakenMs: 0 };
}

// ══════════════════════════════════════════════════════════
// ── Main QuizView ──
// ════════════════════════════════════════���═════════════════
export function QuizView() {
  const { navigateTo } = useStudentNav();
  const [viewState, setViewState] = useState<'selection' | 'session'>('selection');
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);
  const [sessionSummaryTitle, setSessionSummaryTitle] = useState('');
  const [sessionSummaryId, setSessionSummaryId] = useState('');

  const handleStartQuiz = (questions: QuizQuestion[], summaryTitle: string, summaryId: string) => {
    setSessionQuestions(questions);
    setSessionSummaryTitle(summaryTitle);
    setSessionSummaryId(summaryId);
    setViewState('session');
  };

  const handleBackToStudy = () => {
    navigateTo('study-hub');
  };

  return (
    <div className="h-full bg-slate-50/50 overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState === 'selection' ? (
          <QuizSelection
            key="selection"
            onStart={handleStartQuiz}
            onBack={handleBackToStudy}
          />
        ) : (
          <QuizSession
            key="session"
            questions={sessionQuestions}
            summaryTitle={sessionSummaryTitle}
            summaryId={sessionSummaryId}
            onBack={() => setViewState('selection')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── Selection Screen ──
// ══════════════════════════════════════════════════════════
function QuizSelection({
  onStart,
  onBack,
}: {
  onStart: (questions: QuizQuestion[], summaryTitle: string, summaryId: string) => void;
  onBack: () => void;
}) {
  const { tree, loading: treeLoading } = useContentTree();
  const { selectedInstitution } = useAuth();

  // Expanded state
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Selected topic + summaries
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);

  // Quiz loading for a summary
  const [loadingSummaryId, setLoadingSummaryId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [maxQuestions, setMaxQuestions] = useState<number>(0); // 0 = all

  // Quiz history
  const [quizHistory, setQuizHistory] = useState<StudySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load quiz history on mount
  useEffect(() => {
    setHistoryLoading(true);
    quizApi.getStudySessions({ session_type: 'quiz', limit: 10 })
      .then(sessions => {
        const arr = Array.isArray(sessions) ? sessions : [];
        // Only show completed sessions (those with ended_at)
        setQuizHistory(arr.filter(s => s.ended_at));
      })
      .catch(err => {
        console.error('[Quiz] History load error:', err);
        setQuizHistory([]);
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  // Load summaries when topic changes
  useEffect(() => {
    if (!selectedTopicId) {
      setSummaries([]);
      return;
    }
    setSummariesLoading(true);
    setLoadError(null);
    getTopicSummaries(selectedTopicId)
      .then(s => {
        const arr = Array.isArray(s) ? s : [];
        setSummaries(arr.filter(x => x.status === 'published'));
      })
      .catch(() => setSummaries([]))
      .finally(() => setSummariesLoading(false));
  }, [selectedTopicId]);

  // Start quiz for a summary
  const handleSelectSummary = async (summary: Summary) => {
    setLoadingSummaryId(summary.id);
    setLoadError(null);
    try {
      const filters: any = { limit: 200 };
      if (filterDifficulty) filters.difficulty = filterDifficulty;
      if (filterType) filters.question_type = filterType;
      const res = await quizApi.getQuizQuestions(summary.id, filters);
      let items = (res.items || []).filter(q => q.is_active);
      if (items.length === 0) {
        setLoadError('Este resumo não tem perguntas de quiz ativas.');
        return;
      }
      // Shuffle
      items = items.sort(() => Math.random() - 0.5);
      // Limit
      if (maxQuestions > 0 && maxQuestions < items.length) {
        items = items.slice(0, maxQuestions);
      }
      onStart(items, summary.title || `Resumo ${summary.id.substring(0, 8)}`, summary.id);
    } catch (err: any) {
      setLoadError(err.message || 'Erro ao carregar perguntas');
    } finally {
      setLoadingSummaryId(null);
    }
  };

  const toggle = (set: Set<string>, id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  // Find topic name for breadcrumb
  const getTopicName = (): string => {
    if (!tree || !selectedTopicId) return '';
    for (const c of tree.courses) {
      for (const s of c.semesters) {
        for (const sec of s.sections) {
          const t = sec.topics.find(tp => tp.id === selectedTopicId);
          if (t) return t.name;
        }
      }
    }
    return '';
  };

  if (treeLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto bg-surface-dashboard">
      <AxonPageHeader
        title="Quizzes"
        subtitle={selectedInstitution?.name || 'Axon'}
        onBack={onBack}
        backLabel="Voltar"
        statsLeft={<p className="text-gray-500 text-sm">Selecione um tópico para iniciar o quiz</p>}
        actionButton={
          <div className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 rounded-full shrink-0 shadow-sm">
            <GraduationCap size={15} className="text-white" />
            <span className="text-sm font-semibold text-white">Teste seus conhecimentos</span>
          </div>
        }
      />

      <div className="px-6 py-6 bg-surface-dashboard">
        <div className="max-w-5xl mx-auto pb-12">
          {/* Filters bar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Filter size={14} />
              <span className="text-[11px] uppercase tracking-wider font-bold">Filtros</span>
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as QuestionType | '')}
              className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Todos los tipos</option>
              <option value="mcq">Opcion multiple</option>
              <option value="true_false">Verdadero / Falso</option>
              <option value="fill_blank">Completar</option>
              <option value="open">Respuesta abierta</option>
            </select>
            <select
              value={filterDifficulty}
              onChange={e => setFilterDifficulty(e.target.value as Difficulty | '')}
              className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Toda dificuldade</option>
              <option value="easy">Fácil</option>
              <option value="medium">Médio</option>
              <option value="hard">Difícil</option>
            </select>
            <select
              value={maxQuestions}
              onChange={e => setMaxQuestions(Number(e.target.value))}
              className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value={0}>Todas as perguntas</option>
              <option value={5}>5 perguntas</option>
              <option value={10}>10 perguntas</option>
              <option value={15}>15 perguntas</option>
              <option value={20}>20 perguntas</option>
            </select>
          </div>

          {/* ── Quiz History (collapsible) ── */}
          {quizHistory.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowHistory(prev => !prev)}
                className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
              >
                <History size={14} className="text-gray-400" />
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                  Quizzes anteriores ({quizHistory.length})
                </span>
                {showHistory
                  ? <ChevronDown size={14} className="text-gray-400" />
                  : <ChevronRight size={14} className="text-gray-400" />
                }
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {quizHistory.map(session => {
                        const total = session.total_reviews ?? 0;
                        const correct = session.correct_reviews ?? 0;
                        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                        const dur = session.duration_seconds ?? 0;
                        const mins = Math.floor(dur / 60);
                        const secs = dur % 60;
                        const date = new Date(session.ended_at || session.created_at);
                        const dateStr = date.toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: undefined,
                        });
                        const timeStr = date.toLocaleTimeString('pt-BR', {
                          hour: '2-digit', minute: '2-digit',
                        });

                        return (
                          <div
                            key={session.id}
                            className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex items-center gap-3"
                          >
                            {/* Score mini circle */}
                            <div className="relative w-12 h-12 shrink-0">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                                <circle
                                  cx="24" cy="24" r="20"
                                  stroke={pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444'}
                                  strokeWidth="4" fill="none" strokeLinecap="round"
                                  strokeDasharray={2 * Math.PI * 20}
                                  strokeDashoffset={2 * Math.PI * 20 * (1 - pct / 100)}
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700">
                                {pct}%
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800">
                                {correct}/{total} corretas
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> {mins}m {secs}s
                                </span>
                                <span>{dateStr} {timeStr}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {historyLoading && (
            <div className="flex items-center gap-2 mb-6 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" />
              Carregando histórico...
            </div>
          )}

          {/* Error message */}
          {loadError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
              <AlertCircle size={16} />
              {loadError}
            </div>
          )}

          {(!tree || tree.courses.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <BookOpen size={40} className="mb-3 opacity-30" />
              <p>Nenhum curso disponível</p>
            </div>
          ) : (
            <div className="space-y-10">
              {tree.courses.map(course => (
                <div key={course.id}>
                  {/* Course heading */}
                  <button
                    onClick={() => toggle(expandedCourses, course.id, setExpandedCourses)}
                    className="flex items-center gap-2 mb-5 pl-4 border-l-4 border-teal-500 hover:opacity-80 transition-opacity"
                  >
                    <h2 className="text-lg font-bold text-gray-900" style={headingStyle}>{course.name}</h2>
                    {expandedCourses.has(course.id)
                      ? <ChevronDown size={16} className="text-gray-400" />
                      : <ChevronRight size={16} className="text-gray-400" />
                    }
                  </button>

                  <AnimatePresence>
                    {expandedCourses.has(course.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {course.semesters.map(sem => (
                          <div key={sem.id} className="mb-6">
                            <button
                              onClick={() => toggle(expandedSemesters, sem.id, setExpandedSemesters)}
                              className="flex items-center gap-2 mb-3 ml-2 hover:opacity-80 transition-opacity"
                            >
                              <GraduationCap size={14} className="text-gray-400" />
                              <span className="text-sm font-semibold text-gray-600">{sem.name}</span>
                              {expandedSemesters.has(sem.id)
                                ? <ChevronDown size={14} className="text-gray-400" />
                                : <ChevronRight size={14} className="text-gray-400" />
                              }
                            </button>

                            <AnimatePresence>
                              {expandedSemesters.has(sem.id) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {sem.sections.map(sec => (
                                      <div key={sec.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-teal-200 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 group flex flex-col h-full">
                                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                                          <div className={clsx(iconBadgeClasses(), "transition-colors group-hover:bg-teal-500 group-hover:text-white")}>
                                            <Layers size={20} />
                                          </div>
                                          <h3 className="font-bold text-gray-900 leading-tight">{sec.name}</h3>
                                        </div>
                                        <div className="space-y-1 flex-1">
                                          {sec.topics.map(topic => (
                                            <button
                                              key={topic.id}
                                              onClick={() => {
                                                setSelectedTopicId(topic.id === selectedTopicId ? null : topic.id);
                                                setLoadError(null);
                                              }}
                                              className={clsx(
                                                "w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition-all text-left",
                                                selectedTopicId === topic.id
                                                  ? "bg-teal-50 text-teal-700"
                                                  : "hover:bg-teal-50/50 text-gray-600 hover:text-teal-600 cursor-pointer"
                                              )}
                                            >
                                              <div className="flex items-center gap-2 truncate pr-2">
                                                <FileText size={12} className="shrink-0" />
                                                <span className="truncate">{topic.name}</span>
                                              </div>
                                              <ChevronRight size={14} className="text-gray-300 shrink-0" />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* Summaries panel (slides in when topic is selected) */}
          <AnimatePresence>
            {selectedTopicId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-teal-200 shadow-2xl rounded-t-2xl max-h-[40vh] overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Resumos de: {getTopicName()}</h3>
                      <p className="text-xs text-gray-400">Selecione um resumo para iniciar o quiz</p>
                    </div>
                    <button
                      onClick={() => setSelectedTopicId(null)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {summariesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-teal-500" size={24} />
                    </div>
                  ) : summaries.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-gray-400">
                      <FileText size={24} className="mb-2 opacity-40" />
                      <p className="text-sm">Este tópico não tem resumos publicados</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {summaries.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectSummary(s)}
                          disabled={loadingSummaryId === s.id}
                          className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-500 transition-colors">
                            {loadingSummaryId === s.id ? (
                              <Loader2 size={18} className="animate-spin text-teal-600" />
                            ) : (
                              <Play size={18} className="text-teal-600 group-hover:text-white transition-colors" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {s.title || `Resumo ${s.id.substring(0, 8)}`}
                            </p>
                            <p className="text-[11px] text-gray-400">Clique para iniciar quiz</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════
// ── Quiz Session (real backend) ──
// ══════════════════════════════════════════════════════════
function QuizSession({
  questions,
  summaryTitle,
  summaryId,
  onBack,
}: {
  questions: QuizQuestion[];
  summaryTitle: string;
  summaryId: string;
  onBack: () => void;
}) {
  // Per-question saved answers
  const [savedAnswers, setSavedAnswers] = useState<Record<number, SavedAnswer>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');

  // Live input state
  const [liveSelectedOption, setLiveSelectedOption] = useState<string | null>(null);
  const [liveTextInput, setLiveTextInput] = useState('');
  const [liveTFAnswer, setLiveTFAnswer] = useState<string | null>(null);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  // Create study session on mount
  useEffect(() => {
    quizApi.createStudySession({ session_type: 'quiz' })
      .then(s => {
        setSessionId(s.id);
        console.log('[Quiz] Session created:', s.id);
      })
      .catch(err => console.error('[Quiz] Session create error:', err));
  }, []);

  // Reset question timer on navigate
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIdx]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lightbulb size={40} className="text-teal-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Quiz indisponível</h2>
          <p className="text-gray-500 mb-4">Nenhuma pergunta encontrada com os filtros selecionados.</p>
          <button onClick={onBack} className="text-teal-600 font-bold hover:underline">Voltar para seleção</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const saved = savedAnswers[currentIdx];
  const isReviewing = saved?.answered === true;

  // Counts
  const correctCount = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
  const wrongCount = Object.values(savedAnswers).filter(a => a.answered && !a.correct).length;
  const answeredCount = Object.values(savedAnswers).filter(a => a.answered).length;

  // Derived state
  const showResult = isReviewing;
  const selectedAnswer = isReviewing ? saved.selectedOption : liveSelectedOption;
  const textAnswer = isReviewing ? saved.textInput : liveTextInput;
  const tfAnswer = isReviewing ? saved.textInput : liveTFAnswer;
  const isCorrectResult = isReviewing ? saved.correct : false;

  // ── Submit handlers ──
  const submitAnswer = async (answer: string, optionText: string | null) => {
    if (isReviewing || submittingAnswer) return;
    setSubmittingAnswer(true);
    const timeTaken = Date.now() - questionStartTime;
    const correct = checkAnswer(currentQ, answer);

    setSavedAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        selectedOption: optionText,
        textInput: answer,
        correct,
        answered: true,
        timeTakenMs: timeTaken,
      },
    }));

    // Record attempt to backend (fire-and-forget)
    quizApi.createQuizAttempt({
      quiz_question_id: currentQ.id,
      answer,
      is_correct: correct,
      session_id: sessionId || undefined,
      time_taken_ms: timeTaken,
    }).catch(err => console.error('[Quiz] Attempt record error:', err));

    setSubmittingAnswer(false);
  };

  const handleSubmitMC = () => {
    if (liveSelectedOption === null) return;
    submitAnswer(liveSelectedOption, liveSelectedOption);
  };

  const handleSubmitTF = () => {
    if (!liveTFAnswer) return;
    submitAnswer(liveTFAnswer, null);
  };

  const handleSubmitOpen = () => {
    if (!liveTextInput.trim()) return;
    submitAnswer(liveTextInput.trim(), null);
  };

  // ── Navigation ──
  const goToQuestion = (idx: number, direction: 'forward' | 'back') => {
    setNavDirection(direction);
    setCurrentIdx(idx);
    const savedForIdx = savedAnswers[idx];
    if (savedForIdx && savedForIdx.answered) {
      setLiveSelectedOption(savedForIdx.selectedOption);
      setLiveTextInput(savedForIdx.textInput);
      setLiveTFAnswer(savedForIdx.textInput);
    } else {
      setLiveSelectedOption(null);
      setLiveTextInput('');
      setLiveTFAnswer(null);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      goToQuestion(currentIdx + 1, 'forward');
    } else {
      finishQuiz();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      goToQuestion(currentIdx - 1, 'back');
    }
  };

  // ── Finish quiz ──
  const finishQuiz = async () => {
    setClosingSession(true);
    const totalCorrect = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
    const totalReviews = Object.values(savedAnswers).filter(a => a.answered).length;
    const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);

    if (sessionId) {
      try {
        await quizApi.closeStudySession(sessionId, {
          ended_at: new Date().toISOString(),
          duration_seconds: durationSec,
          total_reviews: totalReviews,
          correct_reviews: totalCorrect,
        });
        console.log('[Quiz] Session closed');
      } catch (err) {
        console.error('[Quiz] Session close error:', err);
      }
    }
    setClosingSession(false);
    setIsComplete(true);
  };

  const handleRestart = () => {
    setSavedAnswers({});
    setCurrentIdx(0);
    setIsComplete(false);
    setLiveSelectedOption(null);
    setLiveTextInput('');
    setLiveTFAnswer(null);
    setNavDirection('forward');
    // Create new session
    quizApi.createStudySession({ session_type: 'quiz' })
      .then(s => setSessionId(s.id))
      .catch(err => console.error('[Quiz] Session create error:', err));
  };

  // ── Complete Screen ──
  if (isComplete) {
    const score = correctCount;
    const total = questions.length;
    const pct = total > 0 ? (score / total) * 100 : 0;
    const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full items-center justify-center p-8 bg-white">
        <div className="text-center max-w-lg">
          <div className="w-24 h-24 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Trophy size={48} className="text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Quiz Concluído!</h2>
          <p className="text-xl text-gray-600 mb-2">
            Você acertou <span className="font-bold text-gray-900">{score}</span> de <span className="font-bold text-gray-900">{total}</span> questões
          </p>
          <p className="text-sm text-gray-400 mb-8 flex items-center justify-center gap-2">
            <Clock size={14} /> {minutes}m {seconds}s
          </p>

          {/* Score circle */}
          <div className="relative w-56 h-56 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="112" cy="112" r="100" stroke="#f1f5f9" strokeWidth="14" fill="none" />
              <motion.circle
                cx="112" cy="112" r="100"
                stroke={pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="14" fill="none" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 100}
                initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - pct / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-gray-900">{pct.toFixed(0)}%</span>
              <span className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Aproveitamento</span>
            </div>
          </div>

          {/* Stats summary */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
              <CheckCircle2 size={16} /> {correctCount} corretas
            </div>
            <div className="flex items-center gap-1.5 text-rose-500 text-sm font-semibold">
              <XCircle size={16} /> {wrongCount} incorretas
            </div>
            {answeredCount < total && (
              <div className="flex items-center gap-1.5 text-gray-400 text-sm font-semibold">
                <AlertCircle size={16} /> {total - answeredCount} sem resposta
              </div>
            )}
          </div>

          {/* Review */}
          <button
            onClick={() => { setIsComplete(false); goToQuestion(0, 'back'); }}
            className="text-sm text-teal-600 hover:text-teal-800 font-semibold mb-6 block mx-auto"
          >
            Revisar respostas
          </button>

          <div className="flex gap-4 justify-center">
            <button onClick={onBack} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              Voltar ao Menu
            </button>
            <button onClick={handleRestart} className="px-8 py-3 rounded-xl text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3 bg-teal-600 hover:bg-teal-700">
              <RotateCw size={20} /> Tentar Novamente
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Animation variants ──
  const slideVariants = {
    enter: { opacity: 0, y: navDirection === 'forward' ? 16 : -16 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: navDirection === 'forward' ? -16 : 16 },
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-gray-200 shrink-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 p-1.5 -ml-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Voltar para seleção">
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <BookOpen size={14} className="text-teal-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[260px]">Quiz: {summaryTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Difficulty badge */}
          <span className={clsx(
            'text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase',
            currentQ.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
            currentQ.difficulty === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
            'bg-red-50 text-red-600 border-red-200'
          )}>
            {DIFFICULTY_LABELS[currentQ.difficulty]}
          </span>
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Content (scrollable) ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light">
        <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-6 md:py-8">

          {/* ── Progress Bar ── */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 flex items-center gap-[3px]">
              {questions.map((_, idx) => {
                const sa = savedAnswers[idx];
                let color = 'bg-gray-200';
                if (sa?.answered && sa.correct) color = 'bg-emerald-500';
                else if (sa?.answered && !sa.correct) color = 'bg-rose-400';
                else if (idx === currentIdx) color = 'bg-teal-500';
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx, idx < currentIdx ? 'back' : 'forward')}
                    className={clsx(
                      "h-1.5 rounded-full flex-1 transition-all cursor-pointer hover:opacity-80",
                      color,
                      isCurrent && "ring-2 ring-teal-300 ring-offset-1"
                    )}
                    title={`Questão ${idx + 1}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs text-gray-500 font-medium">{currentIdx + 1} de {questions.length}</span>
              {wrongCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                  <X size={10} /> {wrongCount}
                </span>
              )}
              {correctCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} /> {correctCount}
                </span>
              )}
            </div>
          </div>

          {/* ── Question ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {/* Question type badge */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className={clsx(
                  'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                  QUESTION_TYPE_COLORS[currentQ.question_type]
                )}>
                  {QUESTION_TYPE_ICONS[currentQ.question_type]}
                  {QUESTION_TYPE_LABELS[currentQ.question_type]}
                </span>
                {isReviewing && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                    Respondida
                  </span>
                )}
              </div>

              {/* Question text */}
              <div className="flex gap-4 mb-8">
                <span className="text-gray-400 font-semibold text-lg shrink-0">{currentIdx + 1}.</span>
                <h3 className="text-lg text-gray-800 leading-relaxed">{currentQ.question}</h3>
              </div>

              {/* ── Multiple Choice Options ── */}
              {currentQ.question_type === 'mcq' && currentQ.options && (
                <div className="space-y-3 mb-6">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = option === currentQ.correct_answer;
                    const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
                    const wasCorrect = showResult && isCorrectOption;

                    return (
                      <button
                        key={idx}
                        onClick={() => !isReviewing && setLiveSelectedOption(option)}
                        disabled={isReviewing}
                        className={clsx(
                          "w-full text-left rounded-xl border-2 transition-all overflow-hidden",
                          !showResult && !isSelected && "border-gray-200 hover:border-gray-300 bg-white",
                          !showResult && isSelected && "border-teal-500 bg-teal-50/30",
                          wasCorrect && "border-emerald-400 bg-emerald-50",
                          wasSelectedWrong && "border-rose-300 bg-rose-50",
                          showResult && !isCorrectOption && !isSelected && "border-gray-200 bg-white opacity-50"
                        )}
                      >
                        <div className="px-5 py-4 flex items-start gap-3">
                          <span className={clsx(
                            "text-sm font-semibold shrink-0 mt-0.5",
                            wasCorrect ? "text-emerald-600" : wasSelectedWrong ? "text-rose-500" : isSelected ? "text-teal-600" : "text-gray-400"
                          )}>
                            {LETTERS[idx]}.
                          </span>
                          <span className={clsx(
                            "text-sm",
                            wasCorrect ? "text-gray-800" : wasSelectedWrong ? "text-gray-700" : isSelected ? "text-gray-800" : "text-gray-600"
                          )}>
                            {option}
                          </span>
                        </div>

                        {wasSelectedWrong && (
                          <div className="px-5 pb-4 pt-0">
                            <div className="flex items-start gap-2">
                              <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-rose-600 mb-1">Não exatamente</p>
                                {currentQ.explanation && <p className="text-xs text-gray-500 leading-relaxed">{currentQ.explanation}</p>}
                              </div>
                            </div>
                          </div>
                        )}
                        {wasCorrect && showResult && (
                          <div className="px-5 pb-4 pt-0">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-emerald-600 mb-1">Resposta correta</p>
                                {currentQ.explanation && <p className="text-xs text-gray-500 leading-relaxed">{currentQ.explanation}</p>}
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── True/False ── */}
              {currentQ.question_type === 'true_false' && (
                <div className="space-y-3 mb-6">
                  {['true', 'false'].map(val => {
                    const label = val === 'true' ? 'Verdadeiro' : 'Falso';
                    const icon = val === 'true'
                      ? <CheckCircle2 size={20} />
                      : <XCircle size={20} />;
                    const isSelected = (isReviewing ? saved.textInput : liveTFAnswer) === val;
                    const isCorrectOption = val === currentQ.correct_answer;
                    const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
                    const wasCorrect = showResult && isCorrectOption;

                    return (
                      <button
                        key={val}
                        onClick={() => !isReviewing && setLiveTFAnswer(val)}
                        disabled={isReviewing}
                        className={clsx(
                          "w-full text-left rounded-xl border-2 transition-all overflow-hidden",
                          !showResult && !isSelected && "border-gray-200 hover:border-gray-300 bg-white",
                          !showResult && isSelected && "border-teal-500 bg-teal-50/30",
                          wasCorrect && "border-emerald-400 bg-emerald-50",
                          wasSelectedWrong && "border-rose-300 bg-rose-50",
                          showResult && !isCorrectOption && !isSelected && "border-gray-200 bg-white opacity-50"
                        )}
                      >
                        <div className="px-5 py-4 flex items-center gap-3">
                          <span className={clsx(
                            "shrink-0",
                            wasCorrect ? "text-emerald-600" : wasSelectedWrong ? "text-rose-500" : isSelected ? "text-teal-600" : "text-gray-400"
                          )}>
                            {icon}
                          </span>
                          <span className={clsx(
                            "text-base font-semibold",
                            wasCorrect ? "text-gray-800" : wasSelectedWrong ? "text-gray-700" : isSelected ? "text-gray-800" : "text-gray-600"
                          )}>
                            {label}
                          </span>
                        </div>

                        {wasSelectedWrong && currentQ.explanation && (
                          <div className="px-5 pb-4 pt-0">
                            <div className="flex items-start gap-2">
                              <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-gray-500 leading-relaxed">{currentQ.explanation}</p>
                            </div>
                          </div>
                        )}
                        {wasCorrect && showResult && currentQ.explanation && (
                          <div className="px-5 pb-4 pt-0">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-gray-500 leading-relaxed">{currentQ.explanation}</p>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Open / Write-In ── */}
              {currentQ.question_type === 'open' && (
                <div className="mb-6">
                  <div className={clsx(
                    "rounded-xl border-2 overflow-hidden transition-all",
                    showResult && isCorrectResult && "border-emerald-400 bg-emerald-50",
                    showResult && !isCorrectResult && "border-rose-300 bg-rose-50",
                    !showResult && "border-gray-200 bg-white"
                  )}>
                    <textarea
                      value={textAnswer}
                      onChange={(e) => setLiveTextInput(e.target.value)}
                      disabled={isReviewing}
                      placeholder="Escreva sua resposta aqui..."
                      className="w-full px-5 py-4 text-sm text-gray-800 bg-transparent resize-none outline-none placeholder:text-gray-400 min-h-[100px]"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isReviewing) { e.preventDefault(); handleSubmitOpen(); } }}
                    />

                    {showResult && (
                      <div className="px-5 pb-4">
                        <div className="flex items-start gap-2">
                          {isCorrectResult ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-emerald-600 mb-1">Resposta correta</p>
                                {currentQ.explanation && <p className="text-xs text-gray-500 leading-relaxed">{currentQ.explanation}</p>}
                              </div>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-rose-600 mb-1">Não exatamente</p>
                                <p className="text-xs text-gray-600 mb-1">Resposta esperada: <span className="font-semibold text-gray-800">{currentQ.correct_answer}</span></p>
                                {currentQ.explanation && <p className="text-xs text-gray-500 leading-relaxed">{currentQ.explanation}</p>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 md:px-10 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {/* Left: Back */}
          <div>
            {currentIdx > 0 ? (
              <button onClick={handlePrev} className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors">
                <ChevronLeft size={16} /> Voltar
              </button>
            ) : (
              <div />
            )}
          </div>

          {/* Right: Submit / Next */}
          <div>
            {closingSession ? (
              <div className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Finalizando...
              </div>
            ) : isReviewing ? (
              <button onClick={handleNext} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all">
                {currentIdx < questions.length - 1 ? 'Próxima' : (answeredCount >= questions.length ? 'Ver Resultado' : 'Próxima')}
              </button>
            ) : (
              <button
                onClick={
                  currentQ.question_type === 'mcq' ? handleSubmitMC :
                  currentQ.question_type === 'true_false' ? handleSubmitTF :
                  handleSubmitOpen
                }
                disabled={
                  submittingAnswer ||
                  (currentQ.question_type === 'mcq' ? liveSelectedOption === null :
                   currentQ.question_type === 'true_false' ? !liveTFAnswer :
                   !liveTextInput.trim())
                }
                className={clsx(
                  "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                  (currentQ.question_type === 'mcq' ? liveSelectedOption !== null :
                   currentQ.question_type === 'true_false' ? !!liveTFAnswer :
                   liveTextInput.trim())
                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                {submittingAnswer && <Loader2 size={14} className="animate-spin" />}
                Verificar
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}