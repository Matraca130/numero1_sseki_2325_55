// ============================================================
// Axon — Student Quiz: Recovery Prompt (P1-S03)
// ============================================================

import { motion } from 'motion/react';
import { RotateCw, Clock, PlayCircle } from 'lucide-react';
import type { QuizBackupData } from '@/app/components/student/useQuizBackup';

function formatTimeAgo(savedAt: number): string {
  const diffMs = Date.now() - savedAt;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'hace unos segundos';
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  return 'hace mas de un dia';
}

interface QuizRecoveryPromptProps {
  backup: QuizBackupData;
  onAccept: () => void;
  onDismiss: () => void;
  onBack: () => void;
}

export function QuizRecoveryPrompt({ backup, onAccept, onDismiss, onBack }: QuizRecoveryPromptProps) {
  const answeredCount = Object.values(backup.savedAnswers).filter(a => a.answered).length;
  const totalCount = backup.questionIds.length;
  const savedAgo = formatTimeAgo(backup.savedAt);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full p-8 bg-zinc-50">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <RotateCw size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white text-sm" style={{ fontWeight: 700 }}>Sesion interrumpida</h2>
                <p className="text-teal-100 text-[11px]">Se encontraron respuestas guardadas</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-zinc-800" style={{ fontWeight: 600 }}>{backup.quizTitle}</p>
              <div className="flex items-center gap-4 text-[12px] text-zinc-500">
                <span className="flex items-center gap-1.5"><PlayCircle size={13} className="text-teal-500" />{answeredCount} de {totalCount} respondidas</span>
                <span className="flex items-center gap-1.5"><Clock size={13} className="text-zinc-400" />{savedAgo}</span>
              </div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3">
              <div className="flex gap-1">
                {backup.questionIds.map((_, i) => {
                  const sa = backup.savedAnswers[i];
                  return (<div key={i} className={`h-2 flex-1 rounded-full transition-colors ${sa?.answered && sa.correct ? 'bg-emerald-400' : sa?.answered && !sa.correct ? 'bg-rose-400' : 'bg-zinc-200'}`} />);
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
                <span>{answeredCount} completadas</span>
                <span>{totalCount - answeredCount} pendientes</span>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onDismiss} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-sm" style={{ fontWeight: 600 }}>Empezar de nuevo</button>
              <button onClick={onAccept} className="flex-1 py-2.5 rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/25 text-sm inline-flex items-center justify-center gap-2" style={{ fontWeight: 700 }}><PlayCircle size={15} /> Continuar</button>
            </div>
          </div>
        </div>
        <button onClick={onBack} className="mt-4 mx-auto block text-sm text-zinc-400 hover:text-zinc-600 transition-colors" style={{ fontWeight: 500 }}>Volver al menu</button>
      </motion.div>
    </motion.div>
  );
}