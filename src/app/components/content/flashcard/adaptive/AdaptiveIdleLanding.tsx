// AdaptiveIdleLanding -- Landing screen before session starts
import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowLeft, Zap } from 'lucide-react';

export interface AdaptiveIdleLandingProps {
  topicTitle: string;
  cardCount: number;
  onStart: () => void;
  onBack: () => void;
}

export function AdaptiveIdleLanding({ topicTitle, cardCount, onStart, onBack }: AdaptiveIdleLandingProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0.04) 50%, transparent 100%)' }} />
      <div className="relative z-10 flex flex-col items-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2dd4a8] to-[#2a8c7a] flex items-center justify-center mb-6 shadow-xl shadow-[#2a8c7a]/25">
          <Sparkles size={36} className="text-white" />
        </div>
        <h1 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>Sesi{'\u00F3'}n Adaptativa</h1>
        <p className="text-sm text-gray-500 mb-2">{topicTitle}</p>
        <p className="text-xs text-gray-400 mb-8 max-w-sm">
          Revisa las flashcards del profesor primero. Despu{'\u00E9'}s, la IA generar{'\u00E1'} flashcards enfocadas en tus {'\u00E1'}reas m{'\u00E1'}s d{'\u00E9'}biles. Puedes repetir cuantas rondas quieras.
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-gray-200/60 text-sm text-gray-600 mb-8">
          <Zap size={14} className="text-[#2a8c7a]" />
          <span><span style={{ fontWeight: 600 }} className="text-gray-800">{cardCount}</span> flashcards del profesor</span>
        </div>
        <div className="flex items-center gap-3 mb-10 text-xs text-gray-400">
          <span className="px-2 py-1 rounded bg-[#e6f5f1] text-[#2a8c7a] border border-[#2a8c7a]/20" style={{ fontWeight: 500 }}>Profesor</span>
          <span>{'\u2192'}</span>
          <span className="px-2 py-1 rounded bg-violet-50 text-violet-600 border border-violet-200" style={{ fontWeight: 500 }}>IA genera</span>
          <span>{'\u2192'}</span>
          <span className="px-2 py-1 rounded bg-violet-50 text-violet-600 border border-violet-200" style={{ fontWeight: 500 }}>Revisar IA</span>
          <span>{'\u2192'}</span>
          <span className="px-2 py-1 rounded bg-[#F0F2F5] text-gray-500 border border-gray-200" style={{ fontWeight: 500 }}>Repetir {'\u221E'}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white/80 transition-colors" style={{ fontWeight: 500 }}><ArrowLeft size={14} className="inline mr-1.5" />Volver</button>
          <button onClick={onStart} className="px-7 py-2.5 rounded-xl bg-[#2a8c7a] text-white text-sm shadow-lg shadow-[#2a8c7a]/25 hover:bg-[#244e47] hover:-translate-y-0.5 transition-all flex items-center gap-2" style={{ fontWeight: 600 }}><Sparkles size={14} />Iniciar Sesi{'\u00F3'}n</button>
        </div>
      </div>
    </motion.div>
  );
}
