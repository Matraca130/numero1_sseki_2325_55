// ============================================================
// Axon — Student API: Telegram Integration
// Handles linking/unlinking Telegram accounts via bot
// ============================================================

import { apiCall } from '@/app/lib/api';

// ══════════════════ TYPES ══════════════════

export interface TelegramLinkStatus {
  is_linked: boolean;
  username?: string;
  linked_at?: string;
}

export interface TelegramLinkCodeResponse {
  code: string;
  expiresIn: number;
  instructions: string;
  botUrl: string;
}

// ══════════════════ API CALLS ══════════════════

/** Check if the student's Telegram account is linked */
export async function getTelegramLinkStatus(): Promise<TelegramLinkStatus> {
  return apiCall<TelegramLinkStatus>('/telegram/link-status');
}

/** Generate a 6-digit code for linking Telegram via the bot */
export async function generateTelegramLinkCode(): Promise<TelegramLinkCodeResponse> {
  return apiCall<TelegramLinkCodeResponse>('/telegram/link-code', { method: 'POST' });
}

/** Unlink the student's Telegram account */
export async function unlinkTelegram(): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/telegram/unlink', { method: 'POST' });
}
