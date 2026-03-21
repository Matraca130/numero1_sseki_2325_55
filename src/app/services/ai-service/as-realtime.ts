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
// Features:
//   - Server-side VAD (no PTT methods)
//   - Auto-reconnection with exponential backoff (max 3 retries)
//   - Token expiry tracking with proactive refresh
//   - Dynamic model from session response
//   - Institution-scoped tool execution
//   - Handles both GA and beta event names
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
  | { type: 'response.output_audio.delta'; delta: string }
  | { type: 'response.audio_transcript.delta'; delta: string }
  | { type: 'response.output_audio_transcript.delta'; delta: string }
  | { type: 'response.audio_transcript.done'; transcript: string }
  | { type: 'response.output_audio_transcript.done'; transcript: string }
  | { type: 'response.audio.done' }
  | { type: 'response.output_audio.done' }
  | { type: 'response.created' }
  | { type: 'response.done'; response: Record<string, unknown> }
  | { type: 'response.function_call_arguments.done'; name: string; arguments: string; call_id: string }
  | { type: 'session.created' }
  | { type: 'session.updated' }
  | { type: 'session.error'; error: { message: string; type?: string; code?: string } }
  | { type: 'error'; error: { message: string; type?: string; code?: string } }
  | { type: 'input_audio_buffer.speech_started' }
  | { type: 'input_audio_buffer.speech_stopped' }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string }
  | { type: 'rate_limits.updated'; rate_limits: Array<{ name: string; limit: number; remaining: number; reset_seconds: number }> };

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
// The institutionId is injected at call time by the client.

type ToolExecutor = (
  args: Record<string, unknown>,
  institutionId?: string,
) => Promise<string>;

const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  search_course_content: async ({ query }, institutionId) => {
    try {
      const body: Record<string, unknown> = { message: query as string };
      if (institutionId) body.institution_id = institutionId;

      const result = await apiCall<{ response: string }>('/ai/rag-chat', {
        method: 'POST',
        body: JSON.stringify(body),
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

  // Reconnection
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private sessionCreator?: () => Promise<RealtimeSession>;
  private intentionalClose = false;

  // Token expiry
  private tokenExpiresAt: number | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  // Institution context for tools
  private institutionId?: string;

  // Error tracking
  private _lastError: string | null = null;

  constructor(callbacks: RealtimeCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // ── Public API ──────────────────────────────────────────────

  /** Store the session creator for auto-reconnection */
  setSessionCreator(creator: () => Promise<RealtimeSession>): void {
    this.sessionCreator = creator;
  }

  /** Set institution ID for tool execution context */
  setInstitutionId(id: string): void {
    this.institutionId = id;
  }

  /** Emit state change and track it internally */
  private emitState(state: VoiceCallState): void {
    this.currentState = state;
    if (state !== 'error') {
      this._lastError = null;
    }
    this.callbacks.onStateChange?.(state);
  }

  /** Connect to OpenAI Realtime API using ephemeral client_secret */
  connect(clientSecret: string, model?: string): void {
    this.emitState('connecting');
    this.intentionalClose = false;

    const wsModel = model || 'gpt-realtime-1.5';
    const url = `wss://api.openai.com/v1/realtime?model=${wsModel}`;

    this.ws = new WebSocket(url, [
      'realtime',
      `openai-insecure-api-key.${clientSecret}`,
    ]);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
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
      this._lastError = 'Error de conexion WebSocket';
      this.callbacks.onError?.(this._lastError);
      this.emitState('error');
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.clearExpiryTimer();

      if (this.intentionalClose) {
        // User-initiated disconnect — go idle
        if (this.currentState !== 'error') {
          this.emitState('idle');
        }
      } else {
        // Unexpected close — attempt reconnection
        this.reconnect();
      }
    };
  }

  /** Disconnect and cleanup */
  disconnect(): void {
    this.intentionalClose = true;
    this.clearExpiryTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userTranscriptBuffer = '';
    this.aiTranscriptBuffer = '';
    this.reconnectAttempts = 0;
  }

  /** Send a base64-encoded PCM16 audio chunk */
  sendAudio(base64Audio: string): void {
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  /** Check if connected */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Check if in error state */
  get hasError(): boolean {
    return this.currentState === 'error';
  }

  /** Get last error message, or null */
  get lastError(): string | null {
    return this._lastError;
  }

  // ── Private: Reconnection ──────────────────────────────────

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnects || !this.sessionCreator) {
      this._lastError = 'Conexion perdida. Intenta iniciar la llamada de nuevo.';
      this.callbacks.onError?.(this._lastError);
      this.emitState('error');
      return;
    }

    this.reconnectAttempts++;
    this.emitState('connecting');

    try {
      const session = await this.sessionCreator();
      this.trackTokenExpiry(session.expires_at);
      this.connect(session.client_secret, session.model);
    } catch {
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 8000);
      setTimeout(() => this.reconnect(), delay);
    }
  }

  // ── Private: Token Expiry ──────────────────────────────────

  /** Track token expiry and schedule proactive refresh */
  trackTokenExpiry(expiresAt: string | null): void {
    this.clearExpiryTimer();

    if (!expiresAt) return;

    const expiresMs = new Date(expiresAt).getTime();
    if (isNaN(expiresMs)) return;

    this.tokenExpiresAt = expiresMs;

    // Refresh 30 seconds before expiry
    const refreshIn = expiresMs - Date.now() - 30_000;
    if (refreshIn <= 0) return;

    this.expiryTimer = setTimeout(() => {
      // Token about to expire — trigger reconnect with fresh session
      if (this.isConnected && this.sessionCreator) {
        this.intentionalClose = true;
        this.ws?.close();
        this.ws = null;
        this.intentionalClose = false;
        this.reconnect();
      }
    }, refreshIn);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
    this.tokenExpiresAt = null;
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

      // AI audio chunk (for playback) — GA + beta event names
      case 'response.audio.delta':
      case 'response.output_audio.delta':
        this.callbacks.onAudioData?.((event as { delta: string }).delta);
        this.callbacks.onAISpeakingChange?.('speaking');
        break;

      // AI audio done — GA + beta event names
      case 'response.audio.done':
      case 'response.output_audio.done':
        // Audio stream finished — no action needed, response.done handles state
        break;

      // AI transcript chunk (for subtitles) — GA + beta event names
      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
        this.aiTranscriptBuffer += (event as { delta: string }).delta || '';
        this.callbacks.onAITranscript?.(this.aiTranscriptBuffer, false);
        break;

      // AI transcript complete — GA + beta event names
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        this.aiTranscriptBuffer = (event as { transcript: string }).transcript || this.aiTranscriptBuffer;
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

      // Errors — both session.error and generic error
      case 'session.error':
      case 'error': {
        const errMsg = (event as { error: { message: string } }).error?.message || 'Error desconocido';
        this._lastError = errMsg;
        this.callbacks.onError?.(errMsg);
        break;
      }

      // Rate limits — log for debugging
      case 'rate_limits.updated':
        if (import.meta.env.DEV) {
          console.debug('[Realtime] Rate limits:', (event as { rate_limits: unknown }).rate_limits);
        }
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
        output = await executor(args, this.institutionId);
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
