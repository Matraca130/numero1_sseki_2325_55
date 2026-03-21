// ============================================================
// useRealtimeVoice — React hook for OpenAI Realtime voice calls
//
// Manages: microphone capture, audio playback, WebSocket lifecycle
// Audio format: PCM16, 24kHz, mono (OpenAI Realtime spec)
//
// Uses AudioWorkletNode (replaces deprecated ScriptProcessorNode)
// Worklet source: /audio-processor.js
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createRealtimeSession,
  RealtimeVoiceClient,
  type VoiceCallState,
  type AISpeakingState,
} from '@/app/services/ai-service/as-realtime';

interface UseRealtimeVoiceReturn {
  /** Current call state */
  state: VoiceCallState;
  /** What the AI is doing: listening, thinking, speaking */
  aiState: AISpeakingState;
  /** Live user transcript (from Whisper) */
  userTranscript: string;
  /** Live AI transcript (for subtitles) */
  aiTranscript: string;
  /** Start a voice call */
  startCall: (summaryId?: string) => Promise<void>;
  /** End the call */
  endCall: () => void;
  /** Push-to-talk: no-op (kept for backward compatibility, VAD handles detection) */
  onTalkStart: () => void;
  /** Push-to-talk: no-op (kept for backward compatibility, VAD handles detection) */
  onTalkEnd: () => void;
  /** Last error message */
  error: string | null;
  /** Audio input level 0-1 (RMS from microphone, for visualization) */
  audioLevel: number;
}

const SAMPLE_RATE = 24000; // OpenAI Realtime requires 24kHz

export function useRealtimeVoice(): UseRealtimeVoiceReturn {
  const [state, setState] = useState<VoiceCallState>('idle');
  const [aiState, setAiState] = useState<AISpeakingState>('listening');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const clientRef = useRef<RealtimeVoiceClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // RMS ref for high-frequency updates (avoid re-renders per audio frame)
  const audioLevelRef = useRef(0);
  const rmsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Audio Playback ────────────────────────────────────────

  const getPlaybackCtx = useCallback(() => {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    return playbackCtxRef.current;
  }, []);

  /** Ensure playback context is running (must await on mobile) */
  const ensurePlaybackResumed = useCallback(async () => {
    const ctx = getPlaybackCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, [getPlaybackCtx]);

  /** Play a silent buffer to "unlock" audio on mobile browsers (iOS/Android) */
  const unlockAudio = useCallback(async () => {
    const ctx = getPlaybackCtx();
    await ensurePlaybackResumed();
    const silentBuffer = ctx.createBuffer(1, 1, SAMPLE_RATE);
    const source = ctx.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(ctx.destination);
    source.start();
  }, [getPlaybackCtx, ensurePlaybackResumed]);

  /** Flush playback queue and stop current source (used on user interruption) */
  const flushPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.onended = null;
        currentSourceRef.current.stop();
      } catch {
        // Already stopped — ignore
      }
      currentSourceRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const playNextChunk = useCallback(async () => {
    const queue = playbackQueueRef.current;
    if (queue.length === 0) {
      isPlayingRef.current = false;
      currentSourceRef.current = null;
      return;
    }

    isPlayingRef.current = true;
    const samples = queue.shift()!;
    const ctx = getPlaybackCtx();

    // Mobile browsers may re-suspend the context after inactivity — resume it
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => playNextChunk();
    currentSourceRef.current = source;
    source.start();
  }, [getPlaybackCtx]);

  const enqueueAudio = useCallback((base64Audio: string) => {
    // Decode base64 -> PCM16 Int16Array -> Float32Array
    const binaryStr = atob(base64Audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    playbackQueueRef.current.push(float32);

    if (!isPlayingRef.current) {
      playNextChunk();
    }
  }, [playNextChunk]);

  // ── Microphone Capture (AudioWorklet) ───────────────────

  const startMicrophone = useCallback(async (client: RealtimeVoiceClient) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;

    // Load AudioWorklet module and create processor node
    await audioCtx.audioWorklet.addModule('/audio-processor.js');
    const workletNode = new AudioWorkletNode(audioCtx, 'realtime-audio-processor');
    workletNodeRef.current = workletNode;

    workletNode.port.onmessage = (e: MessageEvent<{ pcm16: ArrayBuffer; rms: number }>) => {
      const { pcm16, rms } = e.data;

      if (!client.isConnected) return;

      // Convert ArrayBuffer to base64 and send to OpenAI
      const bytes = new Uint8Array(pcm16);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      client.sendAudio(btoa(binary));

      // Update RMS ref for visualization (synced to React state via interval)
      audioLevelRef.current = rms;
    };

    source.connect(workletNode);

    // Connect to a silent sink to keep the audio graph alive
    // without routing microphone audio to speakers (prevents echo)
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    workletNode.connect(silentGain);
    silentGain.connect(audioCtx.destination);

    // Sync RMS to React state at a display-friendly rate (~15fps)
    rmsIntervalRef.current = setInterval(() => {
      setAudioLevel(audioLevelRef.current);
    }, 66);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // Stop RMS sync
    if (rmsIntervalRef.current) {
      clearInterval(rmsIntervalRef.current);
      rmsIntervalRef.current = null;
    }
    audioLevelRef.current = 0;
    setAudioLevel(0);

    // Stop microphone
    workletNodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());

    workletNodeRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;

    // Stop playback
    flushPlayback();
    playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;

    // Disconnect WebSocket
    clientRef.current?.disconnect();
    clientRef.current = null;
  }, [flushPlayback]);

  // ── Start Call ────────────────────────────────────────────

  const startCall = useCallback(async (summaryId?: string) => {
    setError(null);
    setState('connecting');
    setUserTranscript('');
    setAiTranscript('');

    try {
      // 0. Pre-create playback AudioContext during user gesture (click)
      // and play silent buffer to unlock audio on mobile browsers
      await unlockAudio();

      // 1. Get ephemeral token from backend
      const session = await createRealtimeSession(summaryId);

      // 2. Create voice client with callbacks
      const client = new RealtimeVoiceClient({
        onStateChange: setState,
        onAISpeakingChange: (newAiState) => {
          setAiState(newAiState);
          // When user interrupts (VAD detects speech_started -> listening),
          // flush any queued/playing AI audio immediately
          if (newAiState === 'listening') {
            flushPlayback();
          }
        },
        onUserTranscript: (text) => setUserTranscript(text),
        onAITranscript: (text) => setAiTranscript(text),
        onAudioData: enqueueAudio,
        onError: (msg) => {
          setError(msg);
          setState('error');
        },
      });
      clientRef.current = client;

      // 3. Connect WebSocket
      client.connect(session.client_secret);

      // 4. Wait for WebSocket to open (poll with timeout + error detection)
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = (err?: Error) => {
          if (settled) return;
          settled = true;
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          if (err) reject(err);
          else resolve();
        };

        const intervalId = setInterval(() => {
          if (client.isConnected) {
            settle();
          }
        }, 100);

        const timeoutId = setTimeout(() => {
          settle(new Error('Tiempo de espera agotado al conectar'));
        }, 10000);
      });

      // 5. Start microphone capture
      await startMicrophone(client);
    } catch (e) {
      const err = e as Error;
      if (err.name === 'NotAllowedError') {
        setError(
          'Permiso de microfono denegado. Permite el acceso al microfono en la configuracion del navegador.'
        );
      } else if (err.name === 'NotFoundError') {
        setError(
          'No se encontro un microfono. Conecta un microfono e intenta de nuevo.'
        );
      } else {
        setError(err.message || 'Error al iniciar la llamada');
      }
      setState('error');
      cleanup();
    }
  }, [unlockAudio, enqueueAudio, startMicrophone, cleanup, flushPlayback]);

  // ── Push-to-Talk (no-ops — VAD handles voice detection) ──

  /** No-op: kept for backward compatibility with VoiceCallPanel */
  const onTalkStart = useCallback(() => {
    // VAD mode — no push-to-talk gating needed
  }, []);

  /** No-op: kept for backward compatibility with VoiceCallPanel */
  const onTalkEnd = useCallback(() => {
    // VAD mode — no push-to-talk gating needed
  }, []);

  // ── End Call ──────────────────────────────────────────────

  const endCall = useCallback(() => {
    cleanup();
    setState('idle');
    setAiState('listening');
  }, [cleanup]);

  // ── Cleanup on unmount ────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    aiState,
    userTranscript,
    aiTranscript,
    startCall,
    endCall,
    onTalkStart,
    onTalkEnd,
    error,
    audioLevel,
  };
}
