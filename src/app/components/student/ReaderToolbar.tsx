// ============================================================
// Axon — ReaderToolbar (immersive header toolbar for summary reader)
//
// Extracted from StudentSummaryReader.tsx (Phase B.6).
// Contains search, timer, theme, settings, and sidebar toggles.
// ============================================================
import React from 'react';
import {
  ChevronLeft, Search as SearchIcon, Timer, Settings,
  PanelLeftOpen, Minimize2,
} from 'lucide-react';
import { ThemeToggle } from '@/app/components/student/ThemeToggle';
import ReadingSettingsPanel from '@/app/components/student/ReadingSettingsPanel';
import type { ReadingSettings } from '@/app/components/student/ReadingSettingsPanel';

interface ReaderToolbarProps {
  isDark: boolean;
  onBack: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  showTimer: boolean;
  onToggleTimer: () => void;
  onToggleTheme: () => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  readingSettings: ReadingSettings;
  onReadingSettingsChange: (s: ReadingSettings) => void;
}

const toolBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(42,140,122,0.15)' : 'none',
  border: 'none',
  padding: 6,
  cursor: 'pointer',
  color: active ? '#2a8c7a' : '#b4d9d1',
  display: 'flex',
  borderRadius: 6,
});

const separator = (
  <div style={{ width: 1, height: 20, background: '#6b9e95', margin: '0 4px' }} />
);

export function ReaderToolbar({
  isDark,
  onBack,
  searchOpen,
  onToggleSearch,
  showTimer,
  onToggleTimer,
  onToggleTheme,
  showSettings,
  onToggleSettings,
  sidebarCollapsed,
  onToggleSidebar,
  readingSettings,
  onReadingSettingsChange,
}: ReaderToolbarProps) {
  return (
    <header
      role="banner"
      aria-label="Barra de herramientas del resumen"
      className="flex items-center justify-between"
      style={{
        background: isDark ? '#0d0e11' : '#1B3B36',
        padding: '10px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: isDark ? '1px solid #2d2e34' : '1px solid transparent',
        borderRadius: '12px 12px 0 0',
      }}
    >
      {/* Left side: back + brand */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <button
          onClick={onBack}
          aria-label="Volver a resúmenes"
          style={{
            background: 'none',
            border: 'none',
            padding: 6,
            cursor: 'pointer',
            color: '#b4d9d1',
            display: 'flex',
            borderRadius: 6,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#2a8c7a',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          AXON
        </span>
        <span style={{ color: '#b4d9d1', fontSize: 13, fontWeight: 300 }}>
          Resúmenes
        </span>
      </div>

      {/* Right side: tool icons */}
      <div className="flex items-center" style={{ gap: 6 }}>
        <button onClick={onToggleSearch} title="Buscar (Ctrl+F)" aria-label="Buscar" style={toolBtnStyle(searchOpen)}>
          <SearchIcon size={16} />
        </button>
        <button onClick={onToggleTimer} title="Temporizador de estudio" aria-label={showTimer ? 'Cerrar timer' : 'Abrir timer'} style={toolBtnStyle(showTimer)}>
          <Timer size={16} />
        </button>
        {separator}
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        <div className="relative">
          <button onClick={onToggleSettings} title="Configuración de lectura" aria-label={showSettings ? 'Cerrar configuración' : 'Configuración de lectura'} style={toolBtnStyle(showSettings)}>
            <Settings size={16} />
          </button>
          {showSettings && (
            <ReadingSettingsPanel
              settings={readingSettings}
              onChange={onReadingSettingsChange}
              onClose={onToggleSettings}
            />
          )}
        </div>
        {separator}
        <button onClick={onToggleSidebar} title="Outline" aria-label={sidebarCollapsed ? 'Mostrar panel de estructura' : 'Ocultar panel de estructura'} style={toolBtnStyle(!sidebarCollapsed)}>
          <PanelLeftOpen size={16} />
        </button>
      </div>
    </header>
  );
}
