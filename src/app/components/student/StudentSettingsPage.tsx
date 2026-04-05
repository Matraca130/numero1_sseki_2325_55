// ============================================================
// Axon — Student Settings Page
//
// Allows students to manage account settings including
// Telegram bot linking for notifications.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle, components, animation } from '@/app/design-system';
import {
  Settings,
  Send,
  Link2,
  Unlink,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getTelegramLinkStatus,
  generateTelegramLinkCode,
  unlinkTelegram,
  type TelegramLinkStatus,
  type TelegramLinkCodeResponse,
} from '@/app/services/student-api/sa-telegram';

// ── Constants ──────────────────────────────────────────────

const LINK_CODE_EXPIRY_SECONDS = 300; // 5 minutes

// ── Main Component ─────────────────────────────────────────

export function StudentSettingsPage() {
  return (
    <div className="min-h-full bg-[#F0F2F5]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className={`${components.icon.sizes.lg} ${components.icon.container} ${components.icon.default.bg}`}>
            <Settings size={24} className={components.icon.default.text} />
          </div>
          <div>
            <h1
              className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-gray-900"
              style={headingStyle}
            >
              Configuración
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Gestiona tu cuenta y preferencias
            </p>
          </div>
        </div>

        {/* Telegram Section */}
        <TelegramCard />
      </div>
    </div>
  );
}

// ── Telegram Card ──────────────────────────────────────────

function TelegramCard() {
  const queryClient = useQueryClient();

  const {
    data: status,
    isLoading,
    isError,
  } = useQuery<TelegramLinkStatus>({
    queryKey: ['telegram', 'link-status'],
    queryFn: getTelegramLinkStatus,
    staleTime: 30_000,
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram', 'link-status'] });
      toast.success('Telegram desvinculado exitosamente');
    },
    onError: () => {
      toast.error('Error al desvincular Telegram');
    },
  });

  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  const handleUnlink = () => {
    unlinkMutation.mutate();
    setShowUnlinkConfirm(false);
  };

  return (
    <div className={`${components.card.base} ${components.card.paddingLg}`}>
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`${components.icon.sizes.md} ${components.icon.container} bg-sky-50`}>
          <Send size={18} className="text-sky-500" />
        </div>
        <div>
          <h2
            className="text-lg font-semibold text-gray-900"
            style={headingStyle}
          >
            Telegram
          </h2>
          <p className="text-sm text-gray-500">
            Recibe notificaciones y recordatorios de estudio
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-teal-500 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex items-center gap-2 py-4 px-4 rounded-xl bg-red-50 text-red-600 text-sm">
          <AlertTriangle size={16} />
          <span>No se pudo obtener el estado de vinculacion. Intenta de nuevo.</span>
        </div>
      )}

      {/* Linked State */}
      {status?.is_linked && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800">Vinculado</p>
              {status.username && (
                <p className="text-sm text-emerald-600 truncate">@{status.username}</p>
              )}
              {status.linked_at && (
                <p className="text-xs text-emerald-500 mt-0.5">
                  Desde {new Date(status.linked_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Unlink Button */}
          {!showUnlinkConfirm ? (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <Unlink size={16} />
              Desvincular
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 py-3 px-4 rounded-xl bg-red-50 border border-red-200"
            >
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 flex-1">
                Dejaras de recibir notificaciones por Telegram.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={unlinkMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors disabled:opacity-50"
                >
                  {unlinkMutation.isPending ? 'Desvinculando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Unlinked State */}
      {status && !status.is_linked && <TelegramLinkFlow />}
    </div>
  );
}

// ── Link Flow (code generation + timer) ────────────────────

function TelegramLinkFlow() {
  const [linkData, setLinkData] = useState<TelegramLinkCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const data = await generateTelegramLinkCode();
      setLinkData(data);
      setSecondsLeft(data.expiresIn || LINK_CODE_EXPIRY_SECONDS);
      setCopied(false);
    } catch {
      toast.error('Error al generar el codigo de vinculacion');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setLinkData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Poll for link status while code is active
  useEffect(() => {
    if (!linkData) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['telegram', 'link-status'] });
    }, 5000);
    return () => clearInterval(interval);
  }, [linkData, queryClient]);

  const handleCopy = async () => {
    if (!linkData) return;
    try {
      await navigator.clipboard.writeText(linkData.code);
      setCopied(true);
      toast.success('Codigo copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el codigo');
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Description when no code yet */}
      {!linkData && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Vincula tu cuenta de Telegram para recibir recordatorios de repaso,
            notificaciones de logros y actualizaciones de tus cursos directamente
            en tu chat.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`${components.buttonPrimary.base} ${components.buttonPrimary.sizes.md} inline-flex items-center gap-2`}
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            {isGenerating ? 'Generando...' : 'Vincular Telegram'}
          </button>
        </div>
      )}

      {/* Code Display */}
      <AnimatePresence mode="wait">
        {linkData && (
          <motion.div
            key="code-display"
            initial={animation.fadeUp.initial}
            animate={animation.fadeUp.animate}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: animation.fadeUp.duration }}
            className="space-y-4"
          >
            {/* Code Box */}
            <div className="relative py-5 px-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                Tu codigo de vinculacion
              </p>
              <div className="flex items-center justify-center gap-3">
                <p
                  className="text-3xl sm:text-4xl font-bold tracking-[0.3em] text-gray-900 font-mono"
                  aria-label={`Codigo: ${linkData.code}`}
                >
                  {linkData.code}
                </p>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg text-gray-400 hover:text-teal-500 hover:bg-teal-50 transition-colors"
                  title="Copiar codigo"
                >
                  {copied ? <Check size={18} className="text-teal-500" /> : <Copy size={18} />}
                </button>
              </div>
              {/* Timer */}
              <p className={`text-xs font-medium mt-2 ${secondsLeft < 60 ? 'text-red-500' : 'text-gray-400'}`}>
                Expira en {formatTime(secondsLeft)}
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                {linkData.instructions || 'Abre nuestro bot de Telegram y envia este codigo para completar la vinculacion.'}
              </p>
              <a
                href={linkData.botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${components.buttonPrimary.base} ${components.buttonPrimary.sizes.md} inline-flex items-center gap-2`}
              >
                <Send size={16} />
                Abrir Bot en Telegram
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Generate new code */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="text-sm text-gray-500 hover:text-teal-600 font-medium transition-colors"
            >
              Generar un nuevo codigo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
