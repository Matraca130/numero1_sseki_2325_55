// ============================================================
// Axon — Admin: Settings
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// CONTEXT (usePlatformData):
//   Reads:    institution, institutionId
//   Refresh:  refreshInstitution
//   Wrappers: (none)
//
// Sections:
//   - Inteligencia Artificial (AI model selector)
//   - Messaging Integrations (Telegram + WhatsApp)
//   - (Future: Perfil, Notificaciones, Preferencias)
// ============================================================
import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Button } from '@/app/components/ui/button';
import { headingStyle } from '@/app/design-system';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import { updateInstitution } from '@/app/services/platform-api/pa-institutions';
import { toast, Toaster } from 'sonner';
import {
  Settings,
  MessageCircle,
  ChevronRight,
  User,
  Bell,
  Palette,
  Brain,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { AdminMessagingSettingsPage } from './AdminMessagingSettingsPage';

type SettingsSection = 'home' | 'messaging' | 'ai';

function SettingsCard({
  icon,
  title,
  description,
  onClick,
  ready,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  ready?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition-all hover:shadow-md hover:border-gray-200 ${
        !ready ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={!ready}
    >
      <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
      <ChevronRight size={18} className="text-gray-300 shrink-0" />
    </button>
  );
}

// ─── AI Model Selector Section ──────────────────────────────

type AiModelValue = 'sonnet' | 'opus';

const AI_MODELS: { value: AiModelValue; label: string; description: string }[] = [
  {
    value: 'sonnet',
    label: 'Claude Sonnet',
    description: 'Rapido, recomendado para uso general',
  },
  {
    value: 'opus',
    label: 'Claude Opus',
    description: 'Mas inteligente, mas lento',
  },
];

function AdminAISettingsSection({ onBack }: { onBack: () => void }) {
  const { institution, institutionId, refreshInstitution } = usePlatformData();

  const currentModel: AiModelValue =
    (institution?.settings?.ai_model as AiModelValue) || 'sonnet';

  const [selected, setSelected] = useState<AiModelValue>(currentModel);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!institutionId) return;
    setSaving(true);
    try {
      await updateInstitution(institutionId, {
        settings: {
          ...(institution?.settings ?? {}),
          ai_model: selected,
        },
      });
      await refreshInstitution();
      toast.success('Modelo de IA actualizado correctamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [institutionId, institution, selected, refreshInstitution]);

  const hasChanged = selected !== currentModel;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Toaster position="top-right" richColors closeButton />

      <PageHeader
        icon={<Brain size={22} />}
        title="Inteligencia Artificial"
        subtitle="Configura el modelo de IA para tu institución"
        accent="blue"
        actions={
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft size={14} />
            Volver
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900" style={headingStyle}>
            Modelo de IA
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Selecciona el modelo que se usara para generacion de contenido, planes de estudio y funciones de IA.
          </p>
        </div>

        <div className="p-5 space-y-3">
          {AI_MODELS.map((model) => (
            <label
              key={model.value}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected === model.value
                  ? 'border-teal-500 bg-teal-50/50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="ai_model"
                value={model.value}
                checked={selected === model.value}
                onChange={() => setSelected(model.value)}
                className="accent-teal-500 w-4 h-4"
              />
              <div className="flex-1">
                <span className="font-semibold text-gray-900">{model.label}</span>
                <p className="text-sm text-gray-500">{model.description}</p>
              </div>
              {model.value === 'sonnet' && (
                <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
              )}
            </label>
          ))}
        </div>

        <div className="px-5 pb-5 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanged}
            className="gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────────

export function AdminSettingsPage() {
  const [section, setSection] = useState<SettingsSection>('home');

  if (section === 'messaging') {
    return <AdminMessagingSettingsPage onBack={() => setSection('home')} />;
  }

  if (section === 'ai') {
    return <AdminAISettingsSection onBack={() => setSection('home')} />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Toaster position="top-right" richColors closeButton />

      <PageHeader
        icon={<Settings size={22} />}
        title="Configuración"
        subtitle="Ajustes de la institución"
        accent="blue"
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <SettingsCard
          icon={<Brain size={20} />}
          title="Inteligencia Artificial"
          description="Selecciona el modelo de IA para tu institución"
          onClick={() => setSection('ai')}
          ready
        />

        <SettingsCard
          icon={<MessageCircle size={20} />}
          title="Integraciones de Mensajeria"
          description="Configura Telegram y WhatsApp para tu institucion"
          onClick={() => setSection('messaging')}
          ready
        />

        <SettingsCard
          icon={<User size={20} />}
          title="Perfil"
          description="Datos de la institucion y administradores"
          onClick={() => {}}
          ready={false}
        />

        <SettingsCard
          icon={<Bell size={20} />}
          title="Notificaciones"
          description="Preferencias de alertas y comunicaciones"
          onClick={() => {}}
          ready={false}
        />

        <SettingsCard
          icon={<Palette size={20} />}
          title="Preferencias de interfaz"
          description="Temas, idioma y personalizacion"
          onClick={() => {}}
          ready={false}
        />
      </motion.div>
    </div>
  );
}
