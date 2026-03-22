// ============================================================
// Axon — Admin: Messaging Integrations
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// Dedicated page for configuring Telegram and WhatsApp bot
// integrations. Accessed from AdminSettingsPage.
//
// CONTEXT (usePlatformData):
//   Reads:    institution, institutionId
//   Refresh:  (none — messaging settings are fetched independently)
//
// API DIRECT:
//   getMessagingSettings, updateMessagingSettings, testMessagingConnection
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import {
  getMessagingSettings,
  updateMessagingSettings,
  testMessagingConnection,
} from '@/app/services/platform-api/pa-messaging';
import type {
  MessagingChannel,
  MessagingSettingsData,
  TelegramSettingsResponse,
  WhatsAppSettingsResponse,
} from '@/app/services/platform-api/pa-messaging';
import { motion } from 'motion/react';
import { toast, Toaster } from 'sonner';

// UI
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { PageHeader } from '@/app/components/shared/PageHeader';

// Icons
import {
  MessageCircle,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Zap,
  ArrowLeft,
} from 'lucide-react';

// ─── Loading Skeleton ───────────────────────────────────

function MessagingSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Error State ────────────────────────────────────────

function MessagingError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw size={14} />
          Reintentar
        </Button>
      </div>
    </div>
  );
}

// ─── Channel Card ───────────────────────────────────────

interface ChannelCardProps {
  channel: MessagingChannel;
  icon: React.ReactNode;
  title: string;
  description: string;
  data: MessagingSettingsData | null;
  loading: boolean;
  onSave: (channel: MessagingChannel, settings: Record<string, string>, isEnabled: boolean) => Promise<void>;
  onTest: (channel: MessagingChannel) => Promise<void>;
}

function ChannelCard({ channel, icon, title, description, data, loading, onSave, onTest }: ChannelCardProps) {
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  // Channel-specific form fields
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramWebhookSecret, setTelegramWebhookSecret] = useState('');

  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waAppSecret, setWaAppSecret] = useState('');
  const [waVerifyToken, setWaVerifyToken] = useState('');
  const [waBusinessAccountId, setWaBusinessAccountId] = useState('');

  // Sync from fetched data
  useEffect(() => {
    if (!data) return;
    setEnabled(data.is_enabled);

    if (channel === 'telegram') {
      const s = data.settings as TelegramSettingsResponse;
      setTelegramUsername(s.bot_username || '');
    } else {
      const s = data.settings as WhatsAppSettingsResponse;
      setWaPhoneNumberId(s.phone_number_id || '');
      setWaBusinessAccountId(s.business_account_id || '');
    }
  }, [data, channel]);

  const hasCredentials = channel === 'telegram'
    ? (data?.settings as TelegramSettingsResponse)?.has_bot_token
    : (data?.settings as WhatsAppSettingsResponse)?.has_access_token;

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings: Record<string, string> = {};
      if (channel === 'telegram') {
        if (telegramToken) settings.bot_token = telegramToken;
        if (telegramUsername) settings.bot_username = telegramUsername;
        if (telegramWebhookSecret) settings.webhook_secret = telegramWebhookSecret;
      } else {
        if (waPhoneNumberId) settings.phone_number_id = waPhoneNumberId;
        if (waAccessToken) settings.access_token = waAccessToken;
        if (waAppSecret) settings.app_secret = waAppSecret;
        if (waVerifyToken) settings.verify_token = waVerifyToken;
        if (waBusinessAccountId) settings.business_account_id = waBusinessAccountId;
      }
      await onSave(channel, settings, enabled);
      // Clear sensitive fields after save
      setTelegramToken('');
      setTelegramWebhookSecret('');
      setWaAccessToken('');
      setWaAppSecret('');
      setWaVerifyToken('');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTest(channel);
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              {hasCredentials ? (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
                  Configurado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-400 border-gray-200 text-xs">
                  Sin configurar
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{enabled ? 'Activo' : 'Inactivo'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Body: Form fields */}
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : channel === 'telegram' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`${channel}-token`} className="text-sm text-gray-700">
                Bot Token
              </Label>
              <div className="relative">
                <Input
                  id={`${channel}-token`}
                  type={showTokens ? 'text' : 'password'}
                  placeholder={hasCredentials ? '••••••••  (ya configurado — dejar vacío para mantener)' : 'Pegar bot token de @BotFather'}
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTokens(!showTokens)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showTokens ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${channel}-username`} className="text-sm text-gray-700">
                Bot Username
              </Label>
              <Input
                id={`${channel}-username`}
                type="text"
                placeholder="@mi_bot"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${channel}-webhook`} className="text-sm text-gray-700">
                Webhook Secret <span className="text-gray-400">(opcional)</span>
              </Label>
              <Input
                id={`${channel}-webhook`}
                type={showTokens ? 'text' : 'password'}
                placeholder={
                  (data?.settings as TelegramSettingsResponse)?.has_webhook_secret
                    ? '••••••••  (ya configurado)'
                    : 'Secret para validar webhooks'
                }
                value={telegramWebhookSecret}
                onChange={(e) => setTelegramWebhookSecret(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wa-phone" className="text-sm text-gray-700">
                  Phone Number ID
                </Label>
                <Input
                  id="wa-phone"
                  type="text"
                  placeholder="Ej: 123456789012345"
                  value={waPhoneNumberId}
                  onChange={(e) => setWaPhoneNumberId(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-business" className="text-sm text-gray-700">
                  Business Account ID <span className="text-gray-400">(opcional)</span>
                </Label>
                <Input
                  id="wa-business"
                  type="text"
                  placeholder="Ej: 987654321012345"
                  value={waBusinessAccountId}
                  onChange={(e) => setWaBusinessAccountId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wa-access-token" className="text-sm text-gray-700">
                Access Token
              </Label>
              <div className="relative">
                <Input
                  id="wa-access-token"
                  type={showTokens ? 'text' : 'password'}
                  placeholder={hasCredentials ? '••••••••  (ya configurado)' : 'Token de acceso de Meta Business'}
                  value={waAccessToken}
                  onChange={(e) => setWaAccessToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTokens(!showTokens)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showTokens ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wa-app-secret" className="text-sm text-gray-700">
                  App Secret
                </Label>
                <Input
                  id="wa-app-secret"
                  type={showTokens ? 'text' : 'password'}
                  placeholder={
                    (data?.settings as WhatsAppSettingsResponse)?.has_app_secret
                      ? '••••••••  (ya configurado)'
                      : 'App Secret de Meta'
                  }
                  value={waAppSecret}
                  onChange={(e) => setWaAppSecret(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-verify-token" className="text-sm text-gray-700">
                  Verify Token
                </Label>
                <Input
                  id="wa-verify-token"
                  type={showTokens ? 'text' : 'password'}
                  placeholder={
                    (data?.settings as WhatsAppSettingsResponse)?.has_verify_token
                      ? '••••••••  (ya configurado)'
                      : 'Token de verificación del webhook'
                  }
                  value={waVerifyToken}
                  onChange={(e) => setWaVerifyToken(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer: Actions */}
      <div className="px-5 pb-5 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testing || !hasCredentials}
          className="gap-2"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Probar conexión
        </Button>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Guardar
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────

interface AdminMessagingSettingsPageProps {
  onBack?: () => void;
}

export function AdminMessagingSettingsPage({ onBack }: AdminMessagingSettingsPageProps) {
  const { institutionId } = usePlatformData();

  const [telegramData, setTelegramData] = useState<MessagingSettingsData | null>(null);
  const [whatsappData, setWhatsappData] = useState<MessagingSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    setError(null);
    try {
      const [tg, wa] = await Promise.all([
        getMessagingSettings('telegram'),
        getMessagingSettings('whatsapp'),
      ]);
      setTelegramData(tg);
      setWhatsappData(wa);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = useCallback(async (
    channel: MessagingChannel,
    settings: Record<string, string>,
    isEnabled: boolean,
  ) => {
    try {
      const result = await updateMessagingSettings(channel, { settings, is_enabled: isEnabled });
      if (channel === 'telegram') {
        setTelegramData((prev) => prev ? { ...prev, ...result, is_enabled: isEnabled } : result);
      } else {
        setWhatsappData((prev) => prev ? { ...prev, ...result, is_enabled: isEnabled } : result);
      }
      toast.success(`Configuración de ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'} guardada`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error: ${msg}`);
      throw err;
    }
  }, []);

  const handleTest = useCallback(async (channel: MessagingChannel) => {
    try {
      const result = await testMessagingConnection(channel);
      if (result.success) {
        toast.success(result.message || 'Conexión exitosa');
      } else {
        toast.error(result.error || 'La conexión falló');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error: ${msg}`);
    }
  }, []);

  if (loading) return <MessagingSkeleton />;
  if (error) return <MessagingError message={error} onRetry={fetchSettings} />;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Toaster position="top-right" richColors closeButton />

      <PageHeader
        icon={<MessageCircle size={22} />}
        title="Integraciones de Mensajería"
        subtitle="Configura los bots de Telegram y WhatsApp para tu institución"
        accent="teal"
        actions={
          onBack ? (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft size={14} />
              Volver
            </Button>
          ) : undefined
        }
      />

      {/* Info banner */}
      <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-teal-500 mt-0.5 shrink-0" />
        <div className="text-sm text-teal-700">
          <p className="font-medium mb-1">Cómo obtener los tokens</p>
          <ul className="space-y-1 text-teal-600">
            <li><strong>Telegram:</strong> Habla con <code className="bg-teal-100 px-1 rounded">@BotFather</code> en Telegram y usa <code className="bg-teal-100 px-1 rounded">/newbot</code> para crear tu bot y obtener el token.</li>
            <li><strong>WhatsApp:</strong> Ve a <code className="bg-teal-100 px-1 rounded">developers.facebook.com</code>, crea una app de tipo Business y configura la API de WhatsApp Cloud.</li>
          </ul>
        </div>
      </div>

      {/* Channel cards */}
      <ChannelCard
        channel="telegram"
        icon={<Send size={20} />}
        title="Telegram Bot"
        description="Conecta un bot de Telegram para que tus estudiantes estudien desde el chat"
        data={telegramData}
        loading={loading}
        onSave={handleSave}
        onTest={handleTest}
      />

      <ChannelCard
        channel="whatsapp"
        icon={<MessageCircle size={20} />}
        title="WhatsApp Business"
        description="Integra WhatsApp Business API para comunicación con estudiantes"
        data={whatsappData}
        loading={loading}
        onSave={handleSave}
        onTest={handleTest}
      />
    </div>
  );
}
