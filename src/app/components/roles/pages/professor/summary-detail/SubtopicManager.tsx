/**
 * SubtopicManager — Expanded subtopic list for a keyword.
 * Shows subtopic list with inline add/delete.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Plus, X, Loader2, Layers } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import type { Subtopic } from '@/app/services/summariesApi';

interface SubtopicManagerProps {
  keywordId: string;
  subtopics: Subtopic[];
  loading: boolean;
  newSubtopicName: string;
  onNewSubtopicNameChange: (name: string) => void;
  onCreateSubtopic: (keywordId: string) => void;
  onDeleteSubtopic: (subtopicId: string, keywordId: string) => void;
  createPending: boolean;
}

export function SubtopicManager({
  keywordId, subtopics, loading, newSubtopicName,
  onNewSubtopicNameChange, onCreateSubtopic, onDeleteSubtopic, createPending,
}: SubtopicManagerProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 pl-10">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Layers size={11} className="text-gray-400" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>
            Subtemas
          </span>
          <span className="text-[10px] text-gray-400">
            ({subtopics.filter(s => s.is_active !== false).length})
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 size={12} className="animate-spin text-gray-400" />
            <span className="text-xs text-gray-400">Cargando...</span>
          </div>
        ) : subtopics.length === 0 ? (
          <p className="text-[11px] text-gray-400 py-1 italic">Sin subtemas aun</p>
        ) : (
          <div className="space-y-0.5 mb-2">
            {subtopics.map(st => (
              <div
                key={st.id}
                className="flex items-center justify-between group/st py-1 px-2 -mx-2 rounded-md hover:bg-white/80 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                  <span className={`text-xs truncate ${st.is_active ? 'text-gray-600' : 'text-red-400 line-through'}`}>
                    {st.name}
                  </span>
                </div>
                {st.is_active && (
                  <button
                    onClick={() => onDeleteSubtopic(st.id, keywordId)}
                    className="p-0.5 rounded opacity-0 group-hover/st:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add subtopic inline */}
        <div className="flex items-center gap-2 mt-2.5">
          <Input
            value={newSubtopicName}
            onChange={(e) => onNewSubtopicNameChange(e.target.value)}
            placeholder="Agregar subtema..."
            className="h-7 text-xs bg-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onCreateSubtopic(keywordId);
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 shrink-0"
            disabled={createPending || !newSubtopicName.trim()}
            onClick={() => onCreateSubtopic(keywordId)}
          >
            {createPending ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
