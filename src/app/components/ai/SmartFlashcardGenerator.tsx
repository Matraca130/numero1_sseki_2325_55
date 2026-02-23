// ============================================================
// Axon — Smart Flashcard Generator Component
// Intelligently generates flashcards for keywords needing coverage
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle, components, colors } from '@/app/design-system';
import {
  Sparkles,
  Target,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ZapOff,
  Play,
} from 'lucide-react';
import {
  KeywordCollection,
  getKeywordsNeedingCards,
  getKeywordStats,
} from '@/app/services/keywordManager';
import {
  smartGenerateFlashcards,
  estimateFlashcardNeeds,
  GeneratedFlashcard,
} from '@/app/services/aiFlashcardGenerator';

interface SmartFlashcardGeneratorProps {
  courseId: string;
  topicId: string;
  courseName: string;
  topicTitle: string;
  keywords: KeywordCollection;
  onFlashcardsGenerated?: (
    flashcards: GeneratedFlashcard[],
    updatedKeywords: KeywordCollection
  ) => void;
  onClose?: () => void;
}

export function SmartFlashcardGenerator({
  courseId,
  topicId,
  courseName,
  topicTitle,
  keywords,
  onFlashcardsGenerated,
  onClose,
}: SmartFlashcardGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedFlashcard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const estimate = estimateFlashcardNeeds(keywords);
  const keywordStats = getKeywordStats(keywords);
  const needingCards = getKeywordsNeedingCards(keywords, 3, 5);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    
    try {
      const result = await smartGenerateFlashcards(
        keywords,
        courseName,
        topicTitle,
        {
          maxCardsPerSession: 10,
          targetCoverage: 3,
          minNeedScore: 0.4,
        }
      );

      setGenerated(result.flashcards);
      setStats(result.stats);
      onFlashcardsGenerated?.(result.flashcards, result.updatedCollection);
    } catch (err: any) {
      console.error('[SmartFlashcardGenerator] Error:', err);
      setError(err.message || 'Erro ao gerar flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const getColorForKeyword = (color: 'red' | 'yellow' | 'green') => {
    switch (color) {
      case 'red':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ec43ef] to-[#b830e8] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Gerador Inteligente de Flashcards
                </h2>
                <p className="text-sm text-gray-600">{topicTitle}</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Analysis Section */}
          {!generated && (
            <>
              <div className="bg-gradient-to-br from-[#ec43ef]/5 to-[#b830e8]/5 rounded-xl p-5 border border-[#ec43ef]/20">
                <div className="flex items-start gap-3 mb-4">
                  <Target className="w-5 h-5 text-[#ec43ef] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Análise de Necessidades
                    </h3>
                    <p className="text-sm text-gray-700">
                      O sistema identificou <strong>{estimate.totalGap} gaps</strong> de
                      cobertura nas suas keywords. Recomendamos gerar{' '}
                      <strong>{estimate.recommendedGeneration} flashcards</strong> agora.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center border border-red-200">
                    <div className="text-2xl font-bold text-red-600">
                      {estimate.byUrgency.critical}
                    </div>
                    <div className="text-xs text-gray-600">Críticos</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">
                      {estimate.byUrgency.high}
                    </div>
                    <div className="text-xs text-gray-600">Alta Prioridade</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {estimate.byUrgency.medium}
                    </div>
                    <div className="text-xs text-gray-600">Média Prioridade</div>
                  </div>
                </div>
              </div>

              {/* Keywords needing cards */}
              {needingCards.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#ec43ef]" />
                    Keywords Prioritárias ({needingCards.length})
                  </h3>
                  <div className="space-y-2">
                    {needingCards.map(({ keyword, coverage, needScore }) => {
                      const state = keywords[keyword];
                      return (
                        <div
                          key={keyword}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`px-2 py-1 rounded text-xs font-medium border ${getColorForKeyword(
                                state.color
                              )}`}
                            >
                              {state.color}
                            </div>
                            <span className="font-medium text-gray-900">{keyword}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Cobertura: {coverage}/3</span>
                            <span>Urgência: {Math.round(needScore * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {needingCards.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="text-green-900 font-medium mb-1">
                    Cobertura Completa!
                  </p>
                  <p className="text-sm text-green-700">
                    Todas as keywords já possuem flashcards suficientes.
                  </p>
                </div>
              )}

              {/* How it works */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <strong>Como funciona:</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-blue-800">
                      <li>
                        IA prioriza keywords com <strong>alta urgência</strong> e{' '}
                        <strong>baixa cobertura</strong>
                      </li>
                      <li>
                        Gera ~2 flashcards por keyword para construir coverage gradual
                      </li>
                      <li>
                        Cada flashcard inclui keywords primárias e secundárias para
                        tracking
                      </li>
                      <li>
                        Card coverage é atualizado automaticamente após geração
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating || needingCards.length === 0}
                  className="flex-1 py-3 px-6 rounded-xl font-medium bg-gradient-to-r from-[#ec43ef] to-[#b830e8] text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Gerar Flashcards Inteligentes
                    </>
                  )}
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl font-medium border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">
                      Erro ao gerar flashcards
                    </p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Generated flashcards */}
          {generated && stats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">
                    Flashcards Gerados com Sucesso!
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.cardsGenerated}
                    </div>
                    <div className="text-xs text-gray-600">Flashcards</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.keywordsProcessed}
                    </div>
                    <div className="text-xs text-gray-600">Keywords</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      -{stats.gapReduction}
                    </div>
                    <div className="text-xs text-gray-600">Gap Reduzido</div>
                  </div>
                </div>
              </div>

              {/* Flashcard list */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Novos Flashcards ({generated.length})
                </h4>
                {generated.map((card, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#ec43ef]/10 text-[#ec43ef] font-bold flex items-center justify-center flex-shrink-0 text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Pergunta</div>
                          <div className="text-sm font-medium text-gray-900">
                            {card.question}
                          </div>
                        </div>
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Resposta</div>
                          <div className="text-sm text-gray-700">{card.answer}</div>
                        </div>
                        {card.hint && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Dica</div>
                            <div className="text-sm text-gray-600 italic">
                              {card.hint}
                            </div>
                          </div>
                        )}
                        {card.keywords && (
                          <div className="flex flex-wrap gap-2">
                            {card.keywords.primary?.map((kw) => (
                              <span
                                key={kw}
                                className="px-2 py-1 text-xs font-medium rounded bg-[#ec43ef]/10 text-[#ec43ef] border border-[#ec43ef]/20"
                              >
                                {kw}
                              </span>
                            ))}
                            {card.keywords.secondary?.map((kw) => (
                              <span
                                key={kw}
                                className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 border border-gray-200"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-6 rounded-xl font-medium bg-gradient-to-r from-[#ec43ef] to-[#b830e8] text-white hover:shadow-lg transition-all"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}