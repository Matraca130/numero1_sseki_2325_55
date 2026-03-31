/**
 * Constants and types for AxonAIAssistant.
 */

import { Lightbulb, Brain, Zap } from 'lucide-react';

export type AssistantMode = 'chat' | 'flashcards' | 'quiz' | 'explain' | 'voice';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export const QUICK_PROMPTS = [
  { icon: Lightbulb, label: 'Explique o ciclo de Krebs', color: 'text-amber-500' },
  { icon: Brain, label: 'Mecanismo de ação dos betabloqueadores', color: 'text-blue-500' },
  { icon: Zap, label: 'Diferença entre artérias e veias', color: 'text-rose-500' },
];
