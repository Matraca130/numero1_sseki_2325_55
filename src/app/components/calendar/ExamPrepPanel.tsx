// ============================================================
// Axon — ExamPrepPanel
//
// Exam preparation panel showing prioritized topic review plan.
// Triggered from CountdownWidget exam click.
// Uses GET /schedule/exam-prep/:examId for FSRS-based topic priorities.
// ============================================================

import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { headingStyle, components } from '@/app/design-system';
import { useExamPrep, type ExamReviewPlan } from '@/app/hooks/queries/useExamPrep';

function getPriorityConfig(priority: number) {
  if (priority > 70) return { label: 'Critico', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500' };
  if (priority > 40) return { label: 'Moderado', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' };
  return { label: 'Listo', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' };
}

function TopicRow({ topic }: { topic: ExamReviewPlan }) {
  const [expanded, setExpanded] = useState(false);
  const config = getPriorityConfig(topic.priority);
  const retentionPct = Math.round(topic.peakRetrievability * 100);

  return (
    <div className={`rounded-xl border ${config.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors min-h-[52px]"
      >
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={14} className="text-[#9ba3b2]" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-[#1a2332] truncate block">{topic.topicName}</span>
        </div>

        {/* Retention bar */}
        <div className="w-20 shrink-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-[#9ba3b2]">Retencion</span>
            <span className="text-[10px] font-semibold tabular-nums text-[#4a5565]">{retentionPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${config.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${retentionPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Priority badge */}
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </button>

      <AnimatePresence>
        {expanded && topic.reviewDates.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar size={12} className="text-[#9ba3b2]" />
                <span className="text-[11px] font-semibold text-[#9ba3b2] uppercase tracking-wider">
                  Proximos repasos
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topic.reviewDates.map((date, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#f8f9fb] text-[11px] text-[#4a5565] font-medium">
                    <Clock size={10} className="text-[#9ba3b2]" />
                    {format(parseISO(date), "d MMM", { locale: es })}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-[#9ba3b2]">
                Dificultad: {topic.difficulty.toFixed(1)}/10
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ExamPrepPanelProps {
  examId: string;
  examTitle: string;
  examDate?: string;
  onClose: () => void;
}

export function ExamPrepPanel({ examId, examTitle, examDate, onClose }: ExamPrepPanelProps) {
  const { data: topics, isLoading, error } = useExamPrep(examId);

  const daysRemaining = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const sortedTopics = topics ? [...topics].sort((a, b) => b.priority - a.priority) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      className={`${components.card.base} ${components.card.paddingLg}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-[#1a2332] truncate" style={headingStyle}>
            {examTitle}
          </h3>
          {daysRemaining !== null && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                daysRemaining < 7
                  ? 'bg-red-100 text-red-700'
                  : daysRemaining < 14
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {daysRemaining === 0 ? 'Hoy' : `${daysRemaining} dias restantes`}
              </span>
              {examDate && (
                <span className="text-[11px] text-[#9ba3b2]">
                  {format(parseISO(examDate), "d 'de' MMMM", { locale: es })}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#9ba3b2] hover:text-[#4a5565] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-[13px] text-red-600 py-4">
          <AlertCircle size={16} />
          No se pudo cargar el plan de estudio para este examen.
        </div>
      ) : sortedTopics.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-[#9ba3b2]">
          <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
          <p className="text-[13px] font-medium text-[#4a5565]">Todo listo</p>
          <p className="text-[12px] mt-1">No hay temas pendientes de repaso para este examen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTopics.map((topic, i) => (
            <motion.div
              key={topic.topicName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <TopicRow topic={topic} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default ExamPrepPanel;
