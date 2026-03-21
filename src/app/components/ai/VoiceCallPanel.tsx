// ============================================================
// VoiceCallPanel — Real-time voice call UI for AxonAIAssistant
//
// States: idle -> connecting -> active (listening/thinking/speaking) -> idle
// Uses OpenAI Realtime API via useRealtimeVoice hook
// VAD-only mode — no push-to-talk, user just speaks naturally
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  PhoneOff,
  Loader2,
  AlertCircle,
  Mic,
  Volume2,
  Brain,
} from 'lucide-react';
import { useRealtimeVoice } from '@/app/hooks/useRealtimeVoice';

interface VoiceCallPanelProps {
  summaryId?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

// -- Audio Wave Visualization (reactive to audio level) -------

function AudioWaves({ level = 0 }: { level?: number }) {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4];
  return (
    <div className="flex items-end justify-center gap-1 h-8">
      {bars.map((barScale, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-teal-400 transition-all duration-75"
          style={{ height: `${Math.max(4, level * barScale * 32)}px` }}
        />
      ))}
    </div>
  );
}

// -- Status Indicator -----------------------------------------

function StatusIndicator({
  aiState,
  level,
}: {
  aiState: 'listening' | 'thinking' | 'speaking';
  level: number;
}) {
  const config = {
    listening: {
      icon: Mic,
      label: 'Escuchando...',
      color: 'text-teal-500',
      bgColor: 'bg-teal-50',
    },
    thinking: {
      icon: Brain,
      label: 'Pensando...',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
    speaking: {
      icon: Volume2,
      label: 'Hablando...',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  }[aiState];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Pulsing circle with icon */}
      <motion.div
        className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center`}
        animate={
          aiState === 'listening'
            ? { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }
            : aiState === 'speaking'
              ? { scale: [1, 1.05, 1] }
              : {}
        }
        transition={{
          duration: aiState === 'listening' ? 2 : 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon size={32} className={config.color} />
      </motion.div>

      {/* Audio level visualization */}
      <AudioWaves level={aiState === 'thinking' ? 0 : level} />

      {/* Status label */}
      <span
        className={`font-medium font-sans ${config.color}`}
        style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
      >
        {config.label}
      </span>
    </div>
  );
}

// -- Call Duration Timer --------------------------------------

function CallTimer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return (
    <span
      className="font-sans text-gray-400 tabular-nums"
      style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)' }}
    >
      {m}:{s}
    </span>
  );
}

// -- Main Component -------------------------------------------

export function VoiceCallPanel({ summaryId }: VoiceCallPanelProps) {
  const {
    state,
    aiState,
    userTranscript,
    aiTranscript,
    startCall,
    endCall,
    error,
    ...rest
  } = useRealtimeVoice();

  // Defensive: audioLevel may not exist yet (Agent 2 adds it)
  const level = ((rest as Record<string, unknown>).audioLevel as number | undefined) ?? 0;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // -- Call duration timer --
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (state === 'active') {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // -- Accumulate user transcript --
  useEffect(() => {
    if (userTranscript && userTranscript.trim()) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'user') {
          return [...prev.slice(0, -1), { role: 'user', text: userTranscript }];
        }
        return [...prev, { role: 'user', text: userTranscript }];
      });
    }
  }, [userTranscript]);

  // -- Accumulate AI transcript --
  useEffect(() => {
    if (aiTranscript && aiTranscript.trim()) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'ai') {
          return [...prev.slice(0, -1), { role: 'ai', text: aiTranscript }];
        }
        return [...prev, { role: 'ai', text: aiTranscript }];
      });
    }
  }, [aiTranscript]);

  // -- Auto-scroll chat --
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isActive = state === 'active';
  const isConnecting = state === 'connecting';
  const isError = state === 'error';
  const isReconnecting = isConnecting && messages.length > 0;

  // Check if error is mic-permission related
  const isMicError =
    error &&
    (error.toLowerCase().includes('microfono') ||
      error.toLowerCase().includes('microphone') ||
      error.toLowerCase().includes('permission'));

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 min-h-0">
      {/* -- Idle State -- */}
      {state === 'idle' && !isError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center">
            <Phone size={32} className="text-teal-500" />
          </div>

          <div className="text-center">
            <h3
              className="font-semibold text-gray-800"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
              }}
            >
              Llamada de voz
            </h3>
            <p
              className="text-gray-500 mt-1 max-w-[280px] font-sans"
              style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}
            >
              Habla con tu tutor de IA en tiempo real. Te conoce, sabe tus
              dificultades y te ayuda a estudiar.
            </p>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              startCall(summaryId);
            }}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-teal-500 text-white font-medium shadow-lg shadow-teal-200 hover:bg-teal-600 hover:shadow-xl hover:shadow-teal-300 transition-all active:scale-95"
            style={{ touchAction: 'none' }}
          >
            <Phone size={18} />
            Iniciar llamada
          </button>
        </div>
      )}

      {/* -- Connecting / Reconnecting State -- */}
      {isConnecting && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 size={40} className="text-teal-500" />
          </motion.div>
          <p
            className="text-gray-500 font-sans"
            style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}
          >
            {isReconnecting
              ? 'Reconectando con tu tutor...'
              : 'Conectando con tu tutor...'}
          </p>
        </div>
      )}

      {/* -- Active Call -- */}
      {isActive && (
        <>
          {/* Status + Timer */}
          <div className="flex-none pt-4 flex flex-col items-center gap-1">
            <StatusIndicator aiState={aiState} level={level} />
            <CallTimer seconds={duration} />
          </div>

          {/* Transcript chat history */}
          <div className="flex-1 w-full mt-4 mb-4 min-h-0 overflow-y-auto px-2">
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => (
                  <motion.div
                    key={`${msg.role}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-teal-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p
                        className="font-sans"
                        style={{
                          fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                        }}
                      >
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Hang up button (only action — no PTT) */}
          <div className="flex-none pb-4 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                endCall();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                endCall();
              }}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 transition-all active:scale-95"
              style={{ touchAction: 'none' }}
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </>
      )}

      {/* -- Error State -- */}
      {isError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="bg-red-50 rounded-2xl p-6 text-center max-w-[320px]">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />

            <p
              className="font-medium text-gray-800 font-sans"
              style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}
            >
              {isMicError ? 'Permiso de microfono' : 'Error en la llamada'}
            </p>
            <p
              className="text-red-600 mt-2 font-sans"
              style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)' }}
            >
              {error || 'No se pudo conectar con el tutor.'}
            </p>

            {isMicError && (
              <p
                className="text-gray-500 mt-2 font-sans"
                style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)' }}
              >
                Verifica que tu navegador tenga permiso para usar el microfono e
                intentalo de nuevo.
              </p>
            )}

            <button
              onClick={(e) => {
                e.preventDefault();
                startCall(summaryId);
              }}
              className="mt-4 px-6 py-2 rounded-full bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
              style={{ touchAction: 'none' }}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
