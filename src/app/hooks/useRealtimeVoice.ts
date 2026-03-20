// ============================================================
// useRealtimeVoice — React hook for OpenAI Realtime voice calls
//
// Manages: microphone capture, audio playback, WebSocket lifecycle
// Audio format: PCM16, 24kHz, mono (OpenAI Realtime spec)
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
  /** Push-to-talk: call on press (clears noise buffer) */
  onTalkStart: () => void;
  /** Push-to-talk: call on release (commits audio + triggers response) */
  onTalkEnd: () => void;
  /** Last error message */
  error: string | null;
}

const SAMPLE_RATE = 24000; // OpenAI Realtime requires 24kHz
const BUFFER_SIZE = 4096;  // Samples per audio processing frame

export function useRealtimeVoice(): UseRealtimeVoiceReturn {
  const [state, setState] = useState<VoiceCallState>('idle');
  const [aiState, setAiState] = useState<AISpeakingState>('listening');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<RealtimeVoiceClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // ── Audio Playback ────────────────────────────────────────

  const getPlaybackCtx = useCallback(() => {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    // Chrome suspends AudioContext created outside user gesture — resume it
    if (playbackCtxRef.current.state === 'suspended') {
      playbackCtxRef.current.resume();
    }
    return playbackCtxRef.current;
  }, []);

  const playNextChunk = useCallback(() => {
    const queue = playbackQueueRef.current;
    if (queue.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const samples = queue.shift()!;
    const ctx = getPlaybackCtx();
    const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = playNextChunk;
    source.start();
  }, [getPlaybackCtx]);

  const enqueueAudio = useCallback((base64Audio: string) => {
    // Decode base64 → PCM16 Int16Array → Float32Array
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

  // ── Microphone Capture ────────────────────────────────────

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

    // Use ScriptProcessorNode for PCM16 capture
    // (AudioWorklet would be cleaner but requires a separate file)
    const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!client.isConnected) return;

      const input = e.inputBuffer.getChannelData(0);
      // Float32 → Int16 (PCM16)
      const int16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Int16 → base64
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      client.sendAudio(base64);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // Stop microphone
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());

    processorRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;

    // Stop playback
    playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;
    playbackQueueRef.current = [];
    isPlayingRef.current = false;

    // Disconnect WebSocket
    clientRef.current?.disconnect();
    clientRef.current = null;
  }, []);

  // ── Start Call ────────────────────────────────────────────

  const startCall = useCallback(async (summaryId?: string) => {
    setError(null);
    setState('connecting');
    setUserTranscript('');
    setAiTranscript('');

    try {
      // 0. Pre-create playback AudioContext during user gesture (click)
      // so Chrome doesn't suspend it when we try to play audio later
      getPlaybackCtx();

      // 1. Get ephemeral token from backend
      const session = await createRealtimeSession(summaryId);

      // 2. Create voice client with callbacks
      const client = new RealtimeVoiceClient({
        onStateChange: setState,
        onAISpeakingChange: setAiState,
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

      // 4. Wait for WebSocket to open (poll with timeout)
      await new Promise<void>((resolve) => {
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          resolve();
        };
        const intervalId = setInterval(() => {
          if (client.isConnected) settle();
        }, 100);
        const timeoutId = setTimeout(settle, 10000);
      });

      if (client.isConnected) {
        await startMicrophone(client);
      } else {
        throw new Error('Tiempo de espera agotado al conectar');
      }
    } catch (e) {
      const msg = (e as Error).message || 'Error al iniciar la llamada';
      setError(msg);
      setState('error');
      cleanup();
    }
  }, [enqueueAudio, startMicrophone, cleanup]);

  // ── Push-to-Talk ─────────────────────────────────────────

  /** Call when user presses the talk button — clears noise buffer */
  const onTalkStart = useCallback(() => {
    clientRef.current?.clearAudioBuffer();
    setAiState('listening');
  }, []);

  /** Call when user releases the talk button — commits audio + triggers response */
  const onTalkEnd = useCallback(() => {
    clientRef.current?.commitAudio();
    clientRef.current?.createResponse();
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
  };
}
