import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { Trophy, Sparkles, Activity } from 'lucide-react';
import { SmartFlashcardGenerator } from '@/app/components/ai/SmartFlashcardGenerator';
import { getTopicKeywords, getCourseKeywords } from '@/app/services/studentApi';
import type { KeywordCollection } from '@/app/types/keywords';
import { useStudentDataContext } from '@/app/context/StudentDataContext';

export function SummaryScreen({ stats, onRestart, courseColor, courseId, courseName, topicId, topicTitle, onExit }: {
  stats: number[];
  onRestart: () => void;
  courseColor: string;
  courseId: string;
  courseName: string;
  topicId: string | null;
  topicTitle: string | null;
  onExit: () => void;
}) {
  const average = stats.reduce((a, b) => a + b, 0) / stats.length;
  const mastery = (average / 5) * 100;
  const { studentId } = useStudentDataContext();

  // AI Flashcard Generator state
  const [showGenerator, setShowGenerator] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [keywords, setKeywords] = useState<KeywordCollection | null>(null);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  const handleOpenGenerator = async () => {
    setLoadingKeywords(true);
    setKeywordsError(null);
    try {
      let data: any;
      if (topicId) {
        data = await getTopicKeywords(courseId, topicId, studentId || undefined);
      } else {
        data = await getCourseKeywords(courseId, studentId || undefined);
      }
      const kw = (data?.keywords || {}) as KeywordCollection;
      setKeywords(kw);
      setShowGenerator(true);
    } catch (err: any) {
      console.error('[SummaryScreen] Error loading keywords:', err);
      // If no keywords exist yet, use empty collection so generator can still work
      if (err?.status === 404 || err?.message?.includes('404')) {
        setKeywords({});
        setShowGenerator(true);
      } else {
        setKeywordsError('Nao foi possivel carregar as keywords. Tente novamente.');
      }
    } finally {
      setLoadingKeywords(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full bg-surface-dashboard p-8 text-center relative overflow-hidden"
    >
      {/* Ambient celebration glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-gradient-to-br from-teal-200/20 via-teal-100/15 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/25">
          <Trophy size={40} className="text-white" />
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">Sessao Concluida!</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Voce completou {stats.length} flashcards com um dominio estimado de:
        </p>

        <div className="relative w-48 h-48 flex items-center justify-center mb-10">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="96" cy="96" r="88" stroke="#e2e8f0" strokeWidth="12" fill="none" />
            <motion.circle
              cx="96" cy="96" r="88"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              className="text-teal-500"
              strokeDasharray={2 * Math.PI * 88}
              initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - mastery / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900">{mastery.toFixed(0)}%</span>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Dominio</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <button onClick={onExit} className="px-6 py-3 rounded-full border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
              Voltar ao Deck
            </button>
            <button onClick={onRestart} className="px-6 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-lg shadow-teal-500/20 hover:scale-105 transition-all">
              Praticar Novamente
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full max-w-xs my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* AI Generate button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleOpenGenerator}
            disabled={loadingKeywords}
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#ec43ef] to-[#b830e8] text-white font-semibold shadow-lg shadow-[#ec43ef]/20 hover:shadow-xl hover:shadow-[#ec43ef]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center gap-2.5">
              {loadingKeywords ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Gerar Novos Flashcards com IA
                </>
              )}
            </span>
          </motion.button>

          {keywordsError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-rose-500 mt-1"
            >
              {keywordsError}
            </motion.p>
          )}

          <p className="text-[11px] text-gray-400 max-w-xs">
            A IA analisa seus gaps de conhecimento e gera flashcards focados nas keywords que mais precisam de reforco
          </p>
        </div>
      </div>

      {/* Smart Flashcard Generator Modal */}
      <AnimatePresence>
        {showGenerator && keywords !== null && (
          <SmartFlashcardGenerator
            courseId={courseId}
            topicId={topicId || courseId}
            courseName={courseName}
            topicTitle={topicTitle || courseName}
            keywords={keywords}
            onFlashcardsGenerated={(flashcards, updatedKeywords) => {
              console.log(`[SummaryScreen] Generated ${flashcards.length} flashcards`);
              setKeywords(updatedKeywords);
            }}
            onClose={() => setShowGenerator(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}