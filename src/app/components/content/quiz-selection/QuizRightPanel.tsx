/**
 * QuizRightPanel — Right panel for quiz selection.
 * Shows filters, quiz list, overview, and practice button.
 */

import React from 'react';
import type { QuestionType, Difficulty, QuizEntity, StudySession } from '@/app/services/quizApi';
import type { Summary } from '@/app/types/platform';
import {
  ChevronRight, BookOpen, Loader2, Filter,
  Play, AlertCircle, ClipboardList, ListChecks,
} from 'lucide-react';
import { QuizOverview } from '../QuizOverview';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { SkeletonCard } from '@/app/components/shared/SkeletonCard';

interface QuizRightPanelProps {
  selectedSummary: Summary | null;
  quizzesForSummary: QuizEntity[];
  quizzesLoading: boolean;
  loadingQuizId: string | null;
  loosePracticeCount: number;
  loadError: string | null;
  filterDifficulty: Difficulty | '';
  filterType: QuestionType | '';
  maxQuestions: number;
  activeCourse: any;
  activeSemester: any;
  topicSummaries: Record<string, Summary[]>;
  loadingTopics: Set<string>;
  quizHistory: StudySession[];
  showHistory: boolean;
  onFilterDifficulty: (d: Difficulty | '') => void;
  onFilterType: (t: QuestionType | '') => void;
  onMaxQuestions: (n: number) => void;
  onToggleHistory: () => void;
  onSelectSummary: (summary: Summary) => void;
  onStartQuiz: (quiz: QuizEntity) => void;
  onPracticeAll: (summary: Summary) => void;
  summaryBlocks: { id: string; title: string; type: string }[];
  onBlockPractice: (blockId: string, blockTitle: string) => void;
}

export function QuizRightPanel({
  selectedSummary, quizzesForSummary, quizzesLoading, loadingQuizId,
  loosePracticeCount, loadError, filterDifficulty, filterType, maxQuestions,
  activeCourse, activeSemester, topicSummaries, loadingTopics,
  quizHistory, showHistory, onFilterDifficulty, onFilterType, onMaxQuestions,
  onToggleHistory, onSelectSummary, onStartQuiz, onPracticeAll,
  summaryBlocks, onBlockPractice,
}: QuizRightPanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
            <ClipboardList size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-[14px] text-zinc-900" style={{ fontWeight: 700 }}>Quizzes</h1>
            <p className="text-[10px] text-zinc-400">
              {selectedSummary
                ? selectedSummary.title || `Resumen ${selectedSummary.id.substring(0, 8)}`
                : 'Selecciona un resumen del panel izquierdo'}
            </p>
          </div>
        </div>
        {selectedSummary && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-200">
            <BookOpen size={12} className="text-teal-600" />
            <span className="text-[11px] text-teal-700" style={{ fontWeight: 600 }}>
              {quizzesForSummary.length} quiz{quizzesForSummary.length !== 1 ? 'zes' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Filters bar */}
          {selectedSummary && (
            <div className="flex items-center gap-3 mb-5 flex-wrap bg-white rounded-xl border border-zinc-200 px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Filter size={12} />
                <span className="text-[9px] uppercase tracking-wider" style={{ fontWeight: 700 }}>Filtros</span>
              </div>
              <select value={filterType} onChange={e => onFilterType(e.target.value as QuestionType | '')} className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all">
                <option value="">Todos los tipos</option>
                <option value="mcq">Opcion multiple</option>
                <option value="true_false">Verdadero / Falso</option>
                <option value="fill_blank">Completar</option>
                <option value="open">Respuesta abierta</option>
              </select>
              <select value={filterDifficulty} onChange={e => onFilterDifficulty(e.target.value as Difficulty | '')} className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all">
                <option value="">Toda dificultad</option>
                <option value="easy">Facil</option>
                <option value="medium">Media</option>
                <option value="hard">Dificil</option>
              </select>
              <select value={maxQuestions} onChange={e => onMaxQuestions(Number(e.target.value))} className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all">
                <option value={0}>Todas las preguntas</option>
                <option value={5}>5 preguntas</option>
                <option value={10}>10 preguntas</option>
                <option value={15}>15 preguntas</option>
                <option value={20}>20 preguntas</option>
              </select>
            </div>
          )}

          {/* Error message */}
          {loadError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* No summary selected: Overview */}
          {!selectedSummary ? (
            <div className="py-2">
              {activeCourse && activeSemester && (
                <QuizOverview
                  activeCourse={activeCourse}
                  activeSemester={activeSemester}
                  topicSummaries={topicSummaries}
                  loadingTopics={loadingTopics}
                  quizHistory={quizHistory}
                  showHistory={showHistory}
                  onToggleHistory={onToggleHistory}
                  onSelectSummary={onSelectSummary}
                />
              )}
            </div>
          ) : (
            <div>
              {quizzesLoading ? (
                <SkeletonCard variant="content" count={3} className="grid grid-cols-1 md:grid-cols-2 gap-3" />
              ) : (
                <div className="space-y-4">
                  {quizzesForSummary.length > 0 && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2" style={{ fontWeight: 700 }}>
                        Quizzes del profesor ({quizzesForSummary.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {quizzesForSummary.map(quiz => (
                          <button
                            key={quiz.id}
                            onClick={() => onStartQuiz(quiz)}
                            disabled={loadingQuizId === quiz.id}
                            className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 hover:border-teal-300 hover:bg-teal-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group bg-white"
                          >
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-500 transition-colors">
                              {loadingQuizId === quiz.id ? (
                                <Loader2 size={18} className="animate-spin text-teal-600" />
                              ) : (
                                <ClipboardList size={18} className="text-teal-600 group-hover:text-white transition-colors" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-zinc-800 truncate" style={{ fontWeight: 600 }}>{quiz.title}</p>
                              {quiz.description && <p className="text-[11px] text-zinc-400 truncate">{quiz.description}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200" style={{ fontWeight: 600 }}>
                                  {quiz.source === 'ai' ? 'IA' : 'Manual'}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-zinc-300 shrink-0 group-hover:text-teal-500" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {quizzesForSummary.length === 0 && loosePracticeCount === 0 && !loadError && (
                    <EmptyState icon={ListChecks} title="Sin preguntas" description="Este quiz no tiene preguntas configuradas" />
                  )}

                  {loosePracticeCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2" style={{ fontWeight: 700 }}>
                        Practica por bloque ({summaryBlocks.length})
                      </p>
                      {summaryBlocks.length > 0 ? (
                        <div className="space-y-2">
                          {summaryBlocks.map(block => (
                            <button
                              key={block.id}
                              onClick={() => onBlockPractice(block.id, block.title)}
                              disabled={loadingQuizId === `block-${block.id}`}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left group bg-white"
                            >
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-teal-500 transition-colors">
                                {loadingQuizId === `block-${block.id}` ? (
                                  <Loader2 size={14} className="animate-spin text-zinc-500" />
                                ) : (
                                  <Play size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] text-zinc-700 truncate" style={{ fontWeight: 600 }}>{block.title}</p>
                                <p className="text-[10px] text-zinc-400 capitalize">{block.type.replace(/_/g, ' ')}</p>
                              </div>
                              <ChevronRight size={14} className="text-zinc-300 shrink-0 group-hover:text-teal-500" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => onPracticeAll(selectedSummary)}
                          disabled={loadingQuizId === 'practice-all'}
                          className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-zinc-300 hover:border-teal-300 hover:bg-teal-50/20 transition-all text-left group bg-white"
                        >
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-teal-500 transition-colors">
                            {loadingQuizId === 'practice-all' ? (
                              <Loader2 size={18} className="animate-spin text-zinc-500" />
                            ) : (
                              <Play size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Practica libre</p>
                            <p className="text-[11px] text-zinc-400">
                              {loosePracticeCount} pregunta{loosePracticeCount !== 1 ? 's' : ''} disponible{loosePracticeCount !== 1 ? 's' : ''} en este resumen
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
