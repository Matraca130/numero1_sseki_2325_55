// ============================================================
// Axon — Student API: Telegram Integration
//
// Student-facing Telegram link/unlink endpoints.
// FIX: All calls include institution_id as query param
// (backend requires institution context for all endpoints).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ──────────────────────────────────────────────

export interface TelegramLinkStatus {
  linked: boolean;
  telegram_username: string | null;
  linked_at: string | null;
}

export interface TelegramLinkCode {
  code: string;
  expires_at: string;
  bot_username: string;
}

// ── API Calls ──────────────────────────────────────────

/**
 * Check whether the current student has linked their Telegram account.
 * FIX: institution_id is required — backend needs institution context.
 */
export async function getTelegramLinkStatus(
  institution_id: string
): Promise<TelegramLinkStatus | null> {
  try {
    return await apiCall<TelegramLinkStatus>(
      `/telegram/link-status?institution_id=${institution_id}`
    );
  } catch {
    return null;
  }
}

/**
 * Generate a one-time code the student can send to the Telegram bot to link their account.
 * FIX: institution_id is required — backend needs institution context.
 */
export async function generateTelegramLinkCode(
  institution_id: string
): Promise<TelegramLinkCode | null> {
  try {
    return await apiCall<TelegramLinkCode>(
      `/telegram/generate-link-code?institution_id=${institution_id}`,
      { method: 'POST' }
    );
  } catch {
    return null;
  }
}

/**
 * Unlink the student's Telegram account.
 * FIX: institution_id is required — backend needs institution context.
 */
export async function unlinkTelegram(
  institution_id: string
): Promise<{ success: boolean } | null> {
  try {
    return await apiCall<{ success: boolean }>(
      `/telegram/unlink?institution_id=${institution_id}`,
      { method: 'POST' }
    );
  } catch {
    return null;
  }
}
