// ============================================================
// Axon — Platform API: Messaging Admin Settings
//
// Endpoints consumed:
//   GET  /settings/messaging/:channel        — Get settings
//   PUT  /settings/messaging/:channel        — Update settings
//   POST /settings/messaging/:channel/test   — Test connection
// ============================================================

import { apiCall } from '@/app/lib/api';

const request = apiCall;

// ─── Types ──────────────────────────────────────────────

export type MessagingChannel = 'whatsapp' | 'telegram';

export interface TelegramSettingsResponse {
  bot_token: string | null;
  bot_username: string | null;
  webhook_secret: string | null;
  has_bot_token: boolean;
  has_webhook_secret: boolean;
}

export interface WhatsAppSettingsResponse {
  phone_number_id: string | null;
  access_token: string | null;
  app_secret: string | null;
  verify_token: string | null;
  business_account_id: string | null;
  has_access_token: boolean;
  has_app_secret: boolean;
  has_verify_token: boolean;
}

export interface MessagingSettingsData {
  channel: MessagingChannel;
  is_enabled: boolean;
  settings: TelegramSettingsResponse | WhatsAppSettingsResponse | Record<string, never>;
  updated_at?: string;
  message?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
  bot?: { id: number; username: string; first_name: string };
  phone?: Record<string, unknown>;
}

// ─── API Calls ──────────────────────────────────────────

export async function getMessagingSettings(
  channel: MessagingChannel,
): Promise<MessagingSettingsData> {
  return request<MessagingSettingsData>(`/settings/messaging/${channel}`);
}

export async function updateMessagingSettings(
  channel: MessagingChannel,
  payload: {
    settings?: Record<string, string>;
    is_enabled?: boolean;
  },
): Promise<MessagingSettingsData> {
  return request<MessagingSettingsData>(`/settings/messaging/${channel}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function testMessagingConnection(
  channel: MessagingChannel,
): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/settings/messaging/${channel}/test`, {
    method: 'POST',
  });
}
