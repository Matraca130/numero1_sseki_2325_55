import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  CheckCircle2, XCircle, ChevronLeft, Trophy, RotateCw,
  Lightbulb, GraduationCap, ChevronRight, ChevronDown,
  BookOpen, X, PenLine, TextCursorInput, ListChecks,
} from 'lucide-react';
import { Topic, QuizQuestion } from '@/app/data/courses';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { headingStyle, components } from '@/app/design-system';
import { iconBadgeClasses } from '@/app/design-system';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ── Helpers ──
function getQuestionType(q: QuizQuestion) {
  return q.type || 'multiple-choice';
}

function normalizeText(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function checkWriteInAnswer(q: QuizQuestion, userAnswer: string): boolean {
  const norm = normalizeText(userAnswer);
  if (!norm) return false;
  if (q.correctText && normalizeText(q.correctText) === norm) return true;
  if (q.acceptedVariations) {
    return q.acceptedVariations.some(v => normalizeText(v) === norm);
  }
  if (q.correctText && norm.includes(normalizeText(q.correctText))) return true;
  return false;
}

function checkFillBlankAnswer(q: QuizQuestion, userAnswer: string): boolean {
  if (!q.blankAnswer) return false;
  return normalizeText(userAnswer) === normalizeText(q.blankAnswer);
}

// ══════════════════════════════════════════════
// ── Per-question answer state ──
// ══════════════════════════════════════════════
interface SavedAnswer {
  selectedOption: number | null;   // MC
  textInput: string;               // write-in / fill-blank
  correct: boolean;
  answered: boolean;
}

function emptyAnswer(): SavedAnswer {
  return { selectedOption: null, textInput: '', correct: false, answered: false };
}

// ══════════════════════════════════════════════
// ── Main QuizView ──
// ══════════════════════════════════════════════
export function QuizView() {
  const { currentTopic, setCurrentTopic, currentCourse, quizAutoStart, setQuizAutoStart } = useApp();
  const { navigateTo } = useStudentNav();
  const [viewState, setViewState] = useState<'selection' | 'session'>('selection');

  useEffect(() => { setViewState('selection'); }, [currentCourse.id]);

  // Auto-start quiz session when navigating from SummarySession
  useEffect(() => {
    if (quizAutoStart && currentTopic && currentTopic.quizzes && currentTopic.quizzes.length > 0) {
      setViewState('session');
      setQuizAutoStart(false);
    } else if (quizAutoStart) {
      setQuizAutoStart(false);
    }
  }, [quizAutoStart, currentTopic, setQuizAutoStart]);

  const handleTopicSelect = (topic: Topic) => {
    setCurrentTopic(topic);
    setViewState('session');
  };

  const handleBackToStudy = () => {
    navigateTo('study');
  };

  return (
    <div className="h-full bg-slate-50/50 overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState === 'selection' ? (
          <QuizSelection key="selection" onSelect={handleTopicSelect} onBack={handleBackToStudy} />
        ) : (
          <QuizSession key="session" topic={currentTopic} onBack={() => setViewState('selection')} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Selection Screen ──
// ══════════════════════════════════════════════
function QuizSelection({ onSelect, onBack }: { onSelect: (topic: Topic) => void; onBack: () => void }) {
  const { currentCourse } = useApp();

  const totalQuizzes = currentCourse.semesters.reduce((acc: number, s: any) =>
    acc + s.sections.reduce((a: number, sec: any) =>
      a + sec.topics.filter((t: Topic) => t.quizzes && t.quizzes.length > 0).length, 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto bg-surface-dashboard">
      <AxonPageHeader
        title="Quizzes"
        subtitle={currentCourse.name}
        onBack={onBack}
        backLabel="Voltar"
        statsLeft={<p className="text-gray-500 text-sm">{totalQuizzes} quizzes disponíveis</p>}
        actionButton={
          <div className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 rounded-full shrink-0 shadow-sm">
            <GraduationCap size={15} className="text-white" />
            <span className="text-sm font-semibold text-white">Teste seus conhecimentos</span>
          </div>
        }
      />
      <div className="px-6 py-6 bg-surface-dashboard">
        <div className="max-w-5xl mx-auto space-y-10 pb-12">
          {currentCourse.semesters.map((semester: any) => (
            <div key={semester.id}>
              <h2 className="text-lg font-bold text-gray-900 mb-5 pl-4 border-l-4 border-teal-500 flex items-center gap-2" style={headingStyle}>{semester.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {semester.sections.map((section: any) => (
                  <div key={section.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-teal-200 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 group flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                      <div className={clsx(iconBadgeClasses(), "transition-colors group-hover:bg-teal-500 group-hover:text-white")}>
                        <BookOpen size={20} />
                      </div>
                      <h3 className="font-bold text-gray-900 leading-tight">{section.title}</h3>
                    </div>
                    <div className="space-y-1 flex-1">
                      {section.topics.map((topic: Topic) => {
                        const hasQuiz = topic.quizzes && topic.quizzes.length > 0;
                        const qCount = topic.quizzes?.length || 0;
                        const types = new Set((topic.quizzes || []).map(q => getQuestionType(q)));
                        return (
                          <button key={topic.id} disabled={!hasQuiz} onClick={() => hasQuiz && onSelect(topic)}
                            className={clsx("w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition-all text-left",
                              hasQuiz ? "hover:bg-teal-50/50 text-gray-600 hover:text-teal-600 cursor-pointer" : "opacity-40 cursor-not-allowed text-gray-400"
                            )}>
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="truncate">{topic.title}</span>
                              {hasQuiz && <span className="text-[9px] text-gray-400 font-normal shrink-0">{qCount}q</span>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {types.has('write-in') && <PenLine size={11} className="text-amber-400" />}
                              {types.has('fill-blank') && <TextCursorInput size={11} className="text-violet-400" />}
                              {types.has('multiple-choice') && <ListChecks size={11} className="text-teal-400" />}
                              {hasQuiz ? <ChevronRight size={14} className="text-gray-300 ml-1" /> : <span className="text-[10px] uppercase font-bold tracking-wider">N/A</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// ── Quiz Session (with per-question state) ──
// ══════════════════════════════════════════════
function QuizSession({ topic, onBack }: { topic: Topic | null; onBack: () => void }) {
  const questions = topic?.quizzes || [];

  // Per-question saved answers – keyed by question index
  const [savedAnswers, setSavedAnswers] = useState<Record<number, SavedAnswer>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Live input state (for the currently viewed question, before submitting)
  const [liveSelectedOption, setLiveSelectedOption] = useState<number | null>(null);
  const [liveTextInput, setLiveTextInput] = useState('');
  // Navigation direction for animation
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');

  // Reset everything when topic changes
  useEffect(() => {
    setSavedAnswers({});
    setCurrentIdx(0);
    setIsComplete(false);
    setShowHint(false);
    setLiveSelectedOption(null);
    setLiveTextInput('');
    setNavDirection('forward');
  }, [topic]);

  // Sync live inputs when navigating to a question
  const syncLiveState = useCallback((idx: number) => {
    const saved = savedAnswers[idx];
    if (saved && saved.answered) {
      setLiveSelectedOption(saved.selectedOption);
      setLiveTextInput(saved.textInput);
    } else {
      setLiveSelectedOption(null);
      setLiveTextInput('');
    }
    setShowHint(false);
  }, [savedAnswers]);

  if (!topic || questions.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lightbulb size={40} className="text-teal-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Quiz indisponível</h2>
          <button onClick={onBack} className="text-teal-600 font-bold hover:underline">Voltar para seleção</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const qType = getQuestionType(currentQ);
  const saved = savedAnswers[currentIdx];
  const isReviewing = saved?.answered === true; // viewing a previously answered question

  // Counts
  const correctCount = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
  const wrongCount = Object.values(savedAnswers).filter(a => a.answered && !a.correct).length;
  const answeredCount = Object.values(savedAnswers).filter(a => a.answered).length;

  // Derived state for rendering
  const showResult = isReviewing;
  const selectedAnswer = isReviewing ? saved.selectedOption : liveSelectedOption;
  const textAnswer = isReviewing ? saved.textInput : liveTextInput;
  const isCorrectResult = isReviewing ? saved.correct : false;

  // ── Submit handlers ──
  const handleSubmitMC = () => {
    if (liveSelectedOption === null || isReviewing) return;
    const correct = liveSelectedOption === currentQ.correctAnswer;
    setSavedAnswers(prev => ({
      ...prev,
      [currentIdx]: { selectedOption: liveSelectedOption, textInput: '', correct, answered: true }
    }));
  };

  const handleSubmitText = () => {
    if (!liveTextInput.trim() || isReviewing) return;
    let correct = false;
    if (qType === 'write-in') correct = checkWriteInAnswer(currentQ, liveTextInput);
    else if (qType === 'fill-blank') correct = checkFillBlankAnswer(currentQ, liveTextInput);
    setSavedAnswers(prev => ({
      ...prev,
      [currentIdx]: { selectedOption: null, textInput: liveTextInput, correct, answered: true }
    }));
  };

  // ── Navigation ──
  const goToQuestion = (idx: number, direction: 'forward' | 'back') => {
    setNavDirection(direction);
    setCurrentIdx(idx);
    const savedForIdx = savedAnswers[idx];
    if (savedForIdx && savedForIdx.answered) {
      setLiveSelectedOption(savedForIdx.selectedOption);
      setLiveTextInput(savedForIdx.textInput);
    } else {
      setLiveSelectedOption(null);
      setLiveTextInput('');
    }
    setShowHint(false);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      goToQuestion(currentIdx + 1, 'forward');
    } else {
      setIsComplete(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      goToQuestion(currentIdx - 1, 'back');
    }
  };

  const handleRestart = () => {
    setSavedAnswers({});
    setCurrentIdx(0);
    setIsComplete(false);
    setShowHint(false);
    setLiveSelectedOption(null);
    setLiveTextInput('');
    setNavDirection('forward');
  };

  // ── Complete Screen ──
  if (isComplete) {
    const score = correctCount;
    const pct = questions.length > 0 ? (score / questions.length) * 100 : 0;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full items-center justify-center p-8 bg-white">
        <div className="text-center max-w-lg">
          <div className="w-24 h-24 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Trophy size={48} className="text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Quiz Concluído!</h2>
          <p className="text-xl text-gray-600 mb-8">
            Você acertou <span className="font-bold text-gray-900">{score}</span> de <span className="font-bold text-gray-900">{questions.length}</span> questões
          </p>
          <div className="relative w-56 h-56 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="112" cy="112" r="100" stroke="#f1f5f9" strokeWidth="14" fill="none" />
              <motion.circle cx="112" cy="112" r="100" stroke="#0d9488" strokeWidth="14" fill="none" strokeLinecap="round"
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

          {/* Review answered questions */}
          <button
            onClick={() => { setIsComplete(false); goToQuestion(0, 'back'); }}
            className="text-sm text-teal-600 hover:text-teal-800 font-semibold mb-6 block mx-auto"
          >
            Revisar respostas
          </button>

          <div className="flex gap-4 justify-center">
            <button onClick={onBack} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">Voltar ao Menu</button>
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
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[260px]">Quiz: {topic.title}</span>
        </div>
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <X size={18} />
        </button>
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
              {/* Question type badge + reviewing badge */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                {qType === 'write-in' && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <PenLine size={10} /> Escrever por extenso
                  </span>
                )}
                {qType === 'fill-blank' && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                    <TextCursorInput size={10} /> Completar a palavra
                  </span>
                )}
                {qType === 'multiple-choice' && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    <ListChecks size={10} /> Múltipla escolha
                  </span>
                )}
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
              {qType === 'multiple-choice' && currentQ.options && (
                <div className="space-y-3 mb-6">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrectOption = idx === currentQ.correctAnswer;
                    const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
                    const wasCorrect = showResult && isCorrectOption;

                    return (
                      <button
                        key={idx}
                        onClick={() => !isReviewing && setLiveSelectedOption(idx)}
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

              {/* ── Write-In ── */}
              {qType === 'write-in' && (
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
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isReviewing) { e.preventDefault(); handleSubmitText(); } }}
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
                                <p className="text-xs text-gray-600 mb-1">Resposta esperada: <span className="font-semibold text-gray-800">{currentQ.correctText}</span></p>
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

              {/* ── Fill-in-the-Blank ── */}
              {qType === 'fill-blank' && currentQ.blankSentence && (
                <div className="mb-6">
                  <div className={clsx(
                    "rounded-xl border-2 px-5 py-5 transition-all",
                    showResult && isCorrectResult && "border-emerald-400 bg-emerald-50",
                    showResult && !isCorrectResult && "border-rose-300 bg-rose-50",
                    !showResult && "border-gray-200 bg-gray-50/50"
                  )}>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      {currentQ.blankSentence.split('___').map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className="inline-block align-bottom mx-1">
                              <input
                                type="text"
                                value={textAnswer}
                                onChange={(e) => setLiveTextInput(e.target.value)}
                                disabled={isReviewing}
                                placeholder="________"
                                className={clsx(
                                  "border-b-2 bg-transparent outline-none text-center px-2 py-0.5 min-w-[120px] text-sm font-semibold",
                                  showResult && isCorrectResult && "border-emerald-500 text-emerald-700",
                                  showResult && !isCorrectResult && "border-rose-400 text-rose-600",
                                  !showResult && "border-teal-400 text-gray-800 placeholder:text-gray-300"
                                )}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !isReviewing) { e.preventDefault(); handleSubmitText(); } }}
                              />
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </p>

                    {showResult && (
                      <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-200/50">
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
                              <p className="text-xs text-gray-600 mb-1">Palavra correta: <span className="font-semibold text-gray-800">{currentQ.blankAnswer}</span></p>
                              {currentQ.explanation && <p className="text-xs text-gray-500 leading-relaxed">{currentQ.explanation}</p>}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Show Hint ── */}
              {currentQ.hint && !isReviewing && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
                >
                  Mostrar pista <ChevronDown size={14} className={clsx("transition-transform", showHint && "rotate-180")} />
                </button>
              )}
              {showHint && currentQ.hint && !isReviewing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
                  <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">{currentQ.hint}</p>
                  </div>
                </motion.div>
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
              <div /> /* spacer */
            )}
          </div>

          {/* Right: Submit / Next */}
          <div>
            {isReviewing ? (
              /* Already answered – show Next */
              <button onClick={handleNext} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all">
                {currentIdx < questions.length - 1 ? 'Próxima' : (answeredCount >= questions.length ? 'Ver Resultado' : 'Próxima')}
              </button>
            ) : (
              /* Not yet answered – show Verify */
              <button
                onClick={qType === 'multiple-choice' ? handleSubmitMC : handleSubmitText}
                disabled={qType === 'multiple-choice' ? liveSelectedOption === null : !liveTextInput.trim()}
                className={clsx(
                  "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  (qType === 'multiple-choice' ? liveSelectedOption !== null : liveTextInput.trim())
                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                Verificar
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}