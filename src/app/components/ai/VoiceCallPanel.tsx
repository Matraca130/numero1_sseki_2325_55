// ============================================================
// VoiceCallPanel — Real-time voice call UI for AxonAIAssistant
//
// States: idle → connecting → active (listening/thinking/speaking) → idle
// Uses OpenAI Realtime API via useRealtimeVoice hook
// ============================================================

import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  PhoneOff,
  Mic,
  Volume2,
  Loader2,
  AlertCircle,
  Brain,
} from 'lucide-react';
import { useRealtimeVoice } from '@/app/hooks/useRealtimeVoice';

interface VoiceCallPanelProps {
  summaryId?: string;
}

// ── Audio Wave Animation (CSS-only) ──────────────────────────

function AudioWaves({ active, color = 'bg-[#2a8c7a]' }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full ${color}`}
          animate={active ? {
            height: [8, 24, 12, 28, 8],
          } : {
            height: 8,
          }}
          transition={active ? {
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          } : {
            duration: 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ── Status Indicator ─────────────────────────────────────────

function StatusIndicator({ aiState }: { aiState: 'listening' | 'thinking' | 'speaking' }) {
  const config = {
    listening: {
      icon: Mic,
      label: 'Escuchando...',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      waveColor: 'bg-emerald-400',
    },
    thinking: {
      icon: Brain,
      label: 'Pensando...',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      waveColor: 'bg-amber-400',
    },
    speaking: {
      icon: Volume2,
      label: 'Hablando...',
      color: 'text-[#2a8c7a]',
      bgColor: 'bg-[#e8f5f1]',
      waveColor: 'bg-[#2a8c7a]',
    },
  }[aiState];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pulsing circle with icon */}
      <motion.div
        className={`w-24 h-24 rounded-full ${config.bgColor} flex items-center justify-center`}
        animate={aiState === 'listening' ? {
          scale: [1, 1.08, 1],
          opacity: [0.8, 1, 0.8],
        } : aiState === 'speaking' ? {
          scale: [1, 1.05, 1],
        } : {}}
        transition={{
          duration: aiState === 'listening' ? 2 : 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon size={36} className={config.color} />
      </motion.div>

      {/* Audio waves */}
      <AudioWaves active={aiState !== 'thinking'} color={config.waveColor} />

      {/* Status label */}
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export function VoiceCallPanel({ summaryId }: VoiceCallPanelProps) {
  const {
    state,
    aiState,
    userTranscript,
    aiTranscript,
    startCall,
    endCall,
    error,
  } = useRealtimeVoice();

  const isActive = state === 'active';
  const isConnecting = state === 'connecting';
  const isError = state === 'error';

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 min-h-0">
      {/* ── Idle State ── */}
      {state === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#e8f5f1] flex items-center justify-center">
            <Phone size={32} className="text-[#2a8c7a]" />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
              Llamada de voz
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-[280px]">
              Habla con tu tutor de IA en tiempo real. Te conoce, sabe tus dificultades y te ayuda a estudiar.
            </p>
          </div>

          <button
            onClick={() => startCall(summaryId)}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#2a8c7a] text-white font-medium shadow-lg shadow-[#2a8c7a]/20 hover:bg-[#244e47] hover:shadow-xl hover:shadow-[#2a8c7a]/30 transition-all active:scale-95"
          >
            <Phone size={18} />
            Iniciar llamada
          </button>
        </div>
      )}

      {/* ── Connecting State ── */}
      {isConnecting && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 size={40} className="text-[#2a8c7a]" />
          </motion.div>
          <p className="text-sm text-gray-500">Conectando con tu tutor...</p>
        </div>
      )}

      {/* ── Active Call ── */}
      {isActive && (
        <>
          {/* Status */}
          <div className="flex-none pt-6">
            <StatusIndicator aiState={aiState} />
          </div>

          {/* Transcripts */}
          <div className="flex-1 flex flex-col gap-3 w-full mt-6 mb-4 min-h-0 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {userTranscript && (
                <motion.div
                  key="user"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-[#2a8c7a] text-white text-sm"
                >
                  {userTranscript}
                </motion.div>
              )}

              {aiTranscript && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="self-start max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-white text-gray-700 text-sm shadow-sm border border-gray-100"
                >
                  {aiTranscript}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hang up button */}
          <div className="flex-none pb-4">
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 transition-all active:scale-95"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </>
      )}

      {/* ── Error State ── */}
      {isError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-500" />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Error en la llamada</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
              {error || 'No se pudo conectar con el tutor.'}
            </p>
          </div>

          <button
            onClick={() => startCall(summaryId)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2a8c7a] text-white text-sm font-medium hover:bg-[#244e47] transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
