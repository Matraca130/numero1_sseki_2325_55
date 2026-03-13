// ============================================================
// Axon — KeywordRow (expandable row with subtopics)
// Extracted from MasteryOverview.tsx for modularization.
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { devLog } from '@/app/utils/devLog';
import {
  type KeywordMastery,
  type SubtopicMastery,
  getMasteryColor,
  getMasteryDot,
} from './masteryOverviewTypes';

interface KeywordRowProps {
  item: KeywordMastery;
  expanded: boolean;
  onToggle: () => void;
  subtopics?: SubtopicMastery[];
}

export const KeywordRow = React.memo(function KeywordRow({ item, expanded, onToggle, subtopics }: KeywordRowProps) {
  const mc = getMasteryColor(item.pKnow);
  const pct = item.pKnow !== null ? Math.round(item.pKnow * 100) : null;
  const showRepeat = item.pKnow === null || item.pKnow < 0.7;

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Main row */}
      <div
        onClick={item.subtopicCount > 0 ? onToggle : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          item.subtopicCount > 0 ? 'cursor-pointer hover:bg-gray-50' : ''
        } ${expanded ? 'bg-gray-50' : ''}`}
      >
        {/* Expand icon */}
        <div className="w-4 shrink-0">
          {item.subtopicCount > 0 ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : null}
        </div>

        {/* Color dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getMasteryDot(item.pKnow)}`} />

        {/* Name */}
        <span className="text-sm text-gray-700 flex-1 truncate">{item.keyword.name}</span>

        {/* Percentage */}
        <span className={`text-xs font-medium w-10 text-right shrink-0 ${mc.text}`}>
          {pct !== null ? `${pct}%` : '\u2014'}
        </span>

        {/* Progress bar */}
        <div className="w-20 sm:w-28 h-2 rounded-full bg-gray-100 shrink-0 overflow-hidden">
          {pct !== null && (
            <div
              className={`h-full rounded-full ${mc.bar} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>

        {/* Subtopic count */}
        {item.subtopicCount > 0 && (
          <span className="text-[11px] text-gray-400 w-16 sm:w-20 text-right shrink-0 hidden sm:block">
            {item.subtopicCount} subtopic{item.subtopicCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Repeat button */}
        {showRepeat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              devLog('[MasteryOverview] Repetir:', item.keyword.id, item.keyword.name);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-[#2a8c7a] hover:bg-[#e6f5f1] transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Repetir</span>
          </button>
        )}
      </div>

      {/* Expanded subtopics */}
      <AnimatePresence>
        {expanded && subtopics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-9 pl-3 border-l border-gray-200 py-1 space-y-0.5">
              {subtopics.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Sin subtopics</p>
              ) : (
                subtopics.map((sub) => {
                  const smc = getMasteryColor(sub.pKnow);
                  const sPct = sub.pKnow !== null ? Math.round(sub.pKnow * 100) : null;
                  return (
                    <div
                      key={sub.subtopic.id}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${getMasteryDot(sub.pKnow)}`} />
                      <span className="text-xs text-gray-500 flex-1 truncate">
                        {sub.subtopic.name}
                      </span>
                      <span className={`text-[11px] font-medium w-10 text-right ${smc.text}`}>
                        {sPct !== null ? `${sPct}%` : '\u2014'}
                      </span>
                      <div className="w-16 sm:w-20 h-1.5 rounded-full bg-gray-100 shrink-0 overflow-hidden">
                        {sPct !== null && (
                          <div
                            className={`h-full rounded-full ${smc.bar}`}
                            style={{ width: `${sPct}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});