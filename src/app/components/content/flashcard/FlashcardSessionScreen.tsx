import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { CheckCircle, Brain, X, Eye } from 'lucide-react';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { RATINGS } from '@/app/hooks/flashcard-types';
import { SpeedometerGauge } from './SpeedometerGauge';

export function SessionScreen({ cards, currentIndex, isRevealed, setIsRevealed, handleRate, sessionStats, courseColor, onBack }: {
  cards: Flashcard[];
  currentIndex: number;
  isRevealed: boolean;
  setIsRevealed: (v: boolean) => void;
  handleRate: (r: number) => void;
  sessionStats: number[];
  courseColor: string;
  onBack: () => void;
}) {
  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="flex flex-col h-full relative z-10 bg-[#0a0a0f] overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-teal-600/8 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-gradient-to-tl from-teal-600/5 via-teal-500/3 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Overlaid Header (absolute, no vertical space) ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-30">
        <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100/80 backdrop-blur-sm">
          <X size={22} />
        </button>
        <AxonLogo size="xs" theme="dark" />
      </div>

      {/* ── Main Card Area (fills entire screen) ── */}
      <div className="flex-1 flex items-center justify-center p-0 relative z-10 min-h-0">
        <div className="relative w-full h-full bg-white shadow-2xl shadow-black/40 overflow-hidden flex flex-row">

          {/* ── Left Column: Content ── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">

            {/* Question */}
            <motion.div
              layout
              className={clsx(
                "p-6 md:p-8 lg:p-10 flex flex-col transition-colors duration-300 w-full",
                isRevealed ? "bg-gray-50 border-b border-gray-200 shrink-0" : "flex-1 items-center justify-center text-center bg-white"
              )}
            >
              {/* Speedometer Gauge — centered above question */}
              <div className="flex justify-center mb-4 pointer-events-none">
                <SpeedometerGauge
                  cards={cards}
                  currentIndex={currentIndex}
                  sessionStats={sessionStats}
                />
              </div>

              <div className={clsx("flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3", !isRevealed && "justify-center")}>
                <Brain size={14} /> Pergunta
              </div>
              <motion.h3
                layout="position"
                className={clsx(
                  "font-semibold leading-tight transition-all duration-300",
                  isRevealed ? "text-base text-left text-gray-500" : "text-xl md:text-3xl lg:text-4xl text-gray-900"
                )}
              >
                {currentCard.question}
              </motion.h3>
            </motion.div>

            {/* Answer */}
            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex-1 p-6 md:p-8 lg:p-10 bg-white flex flex-col justify-center overflow-y-auto min-h-0"
                >
                  <div className="flex items-center gap-2 text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-3">
                    <CheckCircle size={14} /> Resposta
                  </div>
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-relaxed text-balance">
                    {currentCard.answer}
                  </h3>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reveal overlay */}
            {!isRevealed && (
              <button
                onClick={() => setIsRevealed(true)}
                className="absolute inset-0 z-10 w-full h-full flex flex-col items-center justify-end pb-10 bg-gradient-to-t from-white/80 to-transparent hover:from-gray-50/60 transition-colors cursor-pointer group outline-none"
              >
                <div className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-gray-900/20 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all flex items-center gap-2 text-sm">
                  <Eye size={16} /> Mostrar Resposta
                </div>
                <span className="text-xs font-medium text-gray-400 mt-3 group-hover:opacity-0 transition-opacity">
                  Toque em qualquer lugar para ver a resposta
                </span>
              </button>
            )}

            {/* ── Rating Buttons (inside card, at bottom when revealed) ── */}
            <AnimatePresence mode="wait">
              {isRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="shrink-0 bg-gray-50 border-t border-gray-200 px-5 py-4"
                >
                  <div className="w-full max-w-xl mx-auto grid grid-cols-5 gap-2">
                    {RATINGS.map((rate) => (
                      <button
                        key={rate.value}
                        onClick={() => handleRate(rate.value)}
                        className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95 outline-none"
                      >
                        <div className={clsx(
                          "w-full h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-lg",
                          rate.color, rate.hover
                        )}>
                          <span className="text-base font-bold">{rate.value}</span>
                        </div>
                        <div className="text-center">
                          <span className={clsx("block text-[10px] font-bold uppercase tracking-wide", rate.text)}>{rate.label}</span>
                          <span className="block text-[9px] text-gray-400 font-medium hidden md:block">{rate.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right Column: Image / Progress Area ── */}
          <div className="hidden lg:flex w-[38%] shrink-0 border-l border-gray-100 bg-gray-50/30 flex-col relative overflow-hidden">
            {/* Subtle decorative pattern (visible when no image) */}
            {!currentCard.image && (
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #14b8a6 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${isRevealed ? 'revealed' : 'question'}-${currentIndex}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex-1 flex flex-col relative z-10 min-h-0"
              >
                {currentCard.image ? (
                  /* ── Image fills the entire right column ── */
                  <img
                    src={currentCard.image}
                    alt={currentCard.question}
                    className="flex-1 w-full object-cover min-h-0"
                  />
                ) : (
                  /* ── No image: show progress info centered ── */
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-[220px] flex flex-col items-center gap-4">
                      {/* Card counter */}
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-gray-800 tabular-nums">{currentIndex + 1}</span>
                        <span className="text-lg text-gray-300 font-light">/</span>
                        <span className="text-lg font-semibold text-gray-400 tabular-nums">{cards.length}</span>
                      </div>

                      {/* Segmented progress bar */}
                      <div className="w-full flex gap-1">
                        {cards.map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor:
                                i < currentIndex
                                  ? sessionStats[i] >= 4
                                    ? '#22c55e'
                                    : sessionStats[i] >= 3
                                    ? '#eab308'
                                    : sessionStats[i] >= 1
                                    ? '#ef4444'
                                    : '#d1d5db'
                                  : i === currentIndex
                                  ? '#14b8a6'
                                  : '#e5e7eb',
                              opacity: i === currentIndex ? 1 : i < currentIndex ? 0.8 : 0.4,
                            }}
                          />
                        ))}
                      </div>

                      {/* Percentage */}
                      <span className="text-xs font-semibold text-gray-400 tracking-wide">
                        {Math.round(progress)}% concluido
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </motion.div>
  );
}