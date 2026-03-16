// ============================================================
// Axon — Admin: Settings
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// CONTEXT (usePlatformData):
//   Reads:    institution
//   Refresh:  (none — personal settings only)
//   Wrappers: (none)
//
// Sections:
//   - Messaging Integrations (Telegram + WhatsApp)
//   - (Future: Perfil, Notificaciones, Preferencias)
// ============================================================
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Button } from '@/app/components/ui/button';
import { Settings, MessageCircle, ChevronRight, User, Bell, Palette } from 'lucide-react';
import { AdminMessagingSettingsPage } from './AdminMessagingSettingsPage';

type SettingsSection = 'home' | 'messaging';

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
      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
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

export function AdminSettingsPage() {
  const [section, setSection] = useState<SettingsSection>('home');

  if (section === 'messaging') {
    return <AdminMessagingSettingsPage onBack={() => setSection('home')} />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader
        icon={<Settings size={22} />}
        title="Configuracion"
        subtitle="Ajustes de la institucion"
        accent="blue"
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
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
