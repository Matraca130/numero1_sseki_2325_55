// ============================================================
// Axon — AI Realtime Voice Service
//
// Manages OpenAI Realtime API WebSocket connections for voice calls.
// Uses ephemeral tokens obtained from the backend.
//
// Backend: POST /ai/realtime-session
// WebSocket: wss://api.openai.com/v1/realtime (direct, client-side)
//
// Architecture:
//   1. createRealtimeSession() — gets ephemeral token from backend
//   2. RealtimeVoiceClient — manages WebSocket + tool execution
//
// To add a new tool:
//   1. Backend: add to REALTIME_TOOLS in realtime-session.ts
//   2. Here: add to TOOL_EXECUTORS map below
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────────

export interface RealtimeSession {
  client_secret: string;
  expires_at: string | null;
  model: string;
  voice: string;
}

/** Discriminated union for known OpenAI Realtime API server events */
export type RealtimeServerEvent =
  | { type: 'response.audio.delta'; delta: string }
  | { type: 'response.audio_transcript.delta'; delta: string }
  | { type: 'response.audio_transcript.done'; transcript: string }
  | { type: 'response.created' }
  | { type: 'response.done'; response: Record<string, unknown> }
  | { type: 'response.function_call_arguments.done'; name: string; arguments: string; call_id: string }
  | { type: 'session.created' }
  | { type: 'session.updated' }
  | { type: 'error'; error: { message: string; type?: string; code?: string } }
  | { type: 'input_audio_buffer.speech_started' }
  | { type: 'input_audio_buffer.speech_stopped' }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string };

export type VoiceCallState = 'idle' | 'connecting' | 'active' | 'error';
export type AISpeakingState = 'listening' | 'thinking' | 'speaking';

export interface RealtimeCallbacks {
  onStateChange?: (state: VoiceCallState) => void;
  onAISpeakingChange?: (state: AISpeakingState) => void;
  onUserTranscript?: (text: string, isFinal: boolean) => void;
  onAITranscript?: (text: string, isFinal: boolean) => void;
  onAudioData?: (base64Audio: string) => void;
  onError?: (error: string) => void;
}

// ── Tool Executors (extensible map) ───────────────────────────
// To add a new tool: add a function here matching the tool name
// defined in the backend's REALTIME_TOOLS array.

const TOOL_EXECUTORS: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  search_course_content: async ({ query }) => {
    try {
      const result = await apiCall<{ response: string }>('/ai/rag-chat', {
        method: 'POST',
        body: JSON.stringify({ message: query as string }),
      });
      return result.response;
    } catch (e) {
      return `Error buscando contenido: ${(e as Error).message}`;
    }
  },

  get_study_queue: async ({ limit }) => {
    try {
      const items = await apiCall<unknown[]>(
        `/study-queue?limit=${(limit as number) || 5}`
      );
      return JSON.stringify(items);
    } catch (e) {
      return `Error obteniendo cola de estudio: ${(e as Error).message}`;
    }
  },
};

// ── Session Creator ───────────────────────────────────────────

export async function createRealtimeSession(
  summaryId?: string
): Promise<RealtimeSession> {
  const body: Record<string, unknown> = {};
  if (summaryId) body.summary_id = summaryId;

  return apiCall<RealtimeSession>('/ai/realtime-session', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Realtime Voice Client ─────────────────────────────────────

export class RealtimeVoiceClient {
  private ws: WebSocket | null = null;
  private callbacks: RealtimeCallbacks;
  private currentState: VoiceCallState = 'idle';
  private userTranscriptBuffer = '';
  private aiTranscriptBuffer = '';

  constructor(callbacks: RealtimeCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /** Emit state change and track it internally */
  private emitState(state: VoiceCallState): void {
    this.currentState = state;
    this.callbacks.onStateChange?.(state);
  }

  /** Connect to OpenAI Realtime API using ephemeral client_secret */
  connect(clientSecret: string): void {
    this.emitState('connecting');

    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

    this.ws = new WebSocket(url, [
      'realtime',
      `openai-insecure-api-key.${clientSecret}`,
    ]);

    this.ws.onopen = () => {
      // The REST endpoint /v1/realtime/client_secrets doesn't accept modalities,
      // so we must set it via session.update after WebSocket connects.
      // Without this, the AI defaults to text-only responses (no audio output).
      // NOTE: The GA Realtime API requires session.type = 'realtime'.
      this.send({
        type: 'session.update',
        session: {
          type: 'realtime',
          modalities: ['text', 'audio'],
        },
      });
      this.emitState('active');
      this.callbacks.onAISpeakingChange?.('listening');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as RealtimeServerEvent;
        this.handleServerEvent(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onError?.('Error de conexión WebSocket');
      this.emitState('error');
    };

    this.ws.onclose = () => {
      this.ws = null;
      // Don't overwrite error state — let the UI show the error
      if (this.currentState !== 'error') {
        this.emitState('idle');
      }
    };
  }

  /** Disconnect and cleanup */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userTranscriptBuffer = '';
    this.aiTranscriptBuffer = '';
  }

  /** Send a base64-encoded PCM16 audio chunk */
  sendAudio(base64Audio: string): void {
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  /** Commit the current audio buffer (signals end of user speech) */
  commitAudio(): void {
    this.send({ type: 'input_audio_buffer.commit' });
  }

  /** Trigger the AI to generate a response */
  createResponse(): void {
    this.send({ type: 'response.create' });
  }

  /** Clear the audio buffer (discard accumulated noise) */
  clearAudioBuffer(): void {
    this.send({ type: 'input_audio_buffer.clear' });
  }

  /** Check if connected */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Private: Event Handling ───────────────────────────────

  private handleServerEvent(event: RealtimeServerEvent): void {
    switch (event.type) {
      // User started speaking (VAD detected)
      case 'input_audio_buffer.speech_started':
        this.userTranscriptBuffer = '';
        this.callbacks.onAISpeakingChange?.('listening');
        break;

      // User speech transcription (incremental)
      case 'conversation.item.input_audio_transcription.completed':
        this.userTranscriptBuffer = event.transcript || '';
        this.callbacks.onUserTranscript?.(this.userTranscriptBuffer, true);
        break;

      // AI response started
      case 'response.created':
        this.aiTranscriptBuffer = '';
        this.callbacks.onAISpeakingChange?.('thinking');
        break;

      // AI audio chunk (for playback)
      case 'response.audio.delta':
        this.callbacks.onAudioData?.(event.delta);
        this.callbacks.onAISpeakingChange?.('speaking');
        break;

      // AI transcript chunk (for subtitles)
      case 'response.audio_transcript.delta':
        this.aiTranscriptBuffer += event.delta || '';
        this.callbacks.onAITranscript?.(this.aiTranscriptBuffer, false);
        break;

      // AI transcript complete
      case 'response.audio_transcript.done':
        this.aiTranscriptBuffer = event.transcript || this.aiTranscriptBuffer;
        this.callbacks.onAITranscript?.(this.aiTranscriptBuffer, true);
        break;

      // AI response done — back to listening
      case 'response.done':
        this.callbacks.onAISpeakingChange?.('listening');
        break;

      // Function call — execute tool
      case 'response.function_call_arguments.done':
        this.handleFunctionCall(event);
        break;

      // Errors
      case 'error':
        this.callbacks.onError?.(event.error?.message || 'Error desconocido');
        break;
    }
  }

  private async handleFunctionCall(
    event: Extract<RealtimeServerEvent, { type: 'response.function_call_arguments.done' }>,
  ): Promise<void> {
    const { name, call_id: callId, arguments: argsStr } = event;

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsStr);
    } catch {
      // Empty args
    }

    const executor = TOOL_EXECUTORS[name];
    let output: string;

    if (executor) {
      try {
        output = await executor(args);
      } catch (e) {
        output = `Error ejecutando ${name}: ${(e as Error).message}`;
      }
    } else {
      output = `Herramienta "${name}" no implementada`;
    }

    // Send function output back to OpenAI
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output,
      },
    });

    // Trigger AI to respond with the tool result
    this.send({ type: 'response.create' });
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
