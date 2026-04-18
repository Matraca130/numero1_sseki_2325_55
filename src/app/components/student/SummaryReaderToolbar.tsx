// Axon — SummaryReaderToolbar
// Extracted from StudentSummaryReader.tsx (Phase C.2).
// Sticky header with title, metadata and tool icons (mark read, search,
// timer, theme, settings, sidebar toggle).
import React from 'react';
import {
  ChevronLeft, CheckCircle2, Clock, Loader2,
  Search as SearchIcon, Timer, Settings, PanelLeftOpen,
  StickyNote, Bookmark,
} from 'lucide-react';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { ThemeToggle } from '@/app/components/student/ThemeToggle';
import ReadingSettingsPanel, { type ReadingSettings } from '@/app/components/student/ReadingSettingsPanel';
import { colors } from '@/app/design-system';

interface SummaryReaderToolbarProps {
  summary: Summary;
  readingState: ReadingState | null;
  isDark: boolean;
  isCompleted: boolean;
  markingRead: boolean;
  searchOpen: boolean;
  showTimer: boolean;
  showSettings: boolean;
  showStickyNotes: boolean;
  showBookmarks: boolean;
  sidebarCollapsed: boolean;
  readingSettings: ReadingSettings;
  onBack: () => void;
  onToggleRead: () => void;
  onToggleSearch: () => void;
  onToggleTimer: () => void;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onToggleSidebar: () => void;
  onToggleStickyNotes: () => void;
  onToggleBookmarks: () => void;
  onUpdateReadingSettings: (s: ReadingSettings) => void;
}

const toolbarBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 10,
  cursor: 'pointer',
  color: colors.reader.iconDefault,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 44,
  minHeight: 44,
  borderRadius: 6,
};

export function SummaryReaderToolbar({
  summary,
  readingState,
  isDark,
  isCompleted,
  markingRead,
  searchOpen,
  showTimer,
  showSettings,
  showStickyNotes,
  showBookmarks,
  sidebarCollapsed,
  readingSettings,
  onBack,
  onToggleRead,
  onToggleSearch,
  onToggleTimer,
  onToggleTheme,
  onToggleSettings,
  onCloseSettings,
  onToggleSidebar,
  onToggleStickyNotes,
  onToggleBookmarks,
  onUpdateReadingSettings,
}: SummaryReaderToolbarProps) {
  return (
    <header
      role="banner"
      aria-label="Barra de herramientas del resumen"
      className="flex items-center justify-between"
      style={{
        background: isDark ? colors.reader.headerBgDark : colors.reader.headerBg,
        padding: '10px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: isDark ? '1px solid #2d2e34' : '1px solid transparent',
        borderRadius: '12px 12px 0 0',
      }}
    >
      {/* Left side: back + title */}
      <div className="flex items-center min-w-0" style={{ gap: 10 }}>
        <button
          onClick={onBack}
          aria-label="Volver a resúmenes"
          style={{ ...toolbarBtnStyle, flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1
            className="truncate"
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {summary.title || 'Sin título'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span style={{ color: colors.reader.iconSubtle, fontSize: 11 }}>
              {new Date(summary.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {readingState?.time_spent_seconds != null && readingState.time_spent_seconds > 0 && (
              <span className="flex items-center gap-1" style={{ color: colors.reader.iconSubtle, fontSize: 11 }}>
                <Clock className="w-3 h-3" />
                {Math.round(readingState.time_spent_seconds / 60)} min
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: 'rgba(16,185,129,0.2)', color: colors.reader.iconActive }}>
                <CheckCircle2 className="w-2.5 h-2.5" /> Leído
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: tool icons */}
      <div className="flex items-center" style={{ gap: 6 }}>
        {/* Mark complete */}
        <button
          onClick={onToggleRead}
          disabled={markingRead}
          title={isCompleted ? 'Marcar no leído' : 'Marcar como leído'}
          aria-label={isCompleted ? 'Marcar no leído' : 'Marcar como leído'}
          aria-pressed={isCompleted}
          style={{
            background: isCompleted ? 'rgba(16,185,129,0.2)' : 'none',
            border: 'none',
            padding: 6,
            cursor: 'pointer',
            color: isCompleted ? colors.reader.iconActive : colors.reader.iconDefault,
            display: 'flex',
            borderRadius: 6,
          }}
        >
          {markingRead ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        </button>

        {/* Search toggle */}
        <button
          onClick={onToggleSearch}
          title="Buscar (Ctrl+F)"
          aria-label="Buscar"
          aria-pressed={searchOpen}
          style={{ ...toolbarBtnStyle, background: searchOpen ? 'rgba(42,140,122,0.15)' : 'none', color: searchOpen ? '#2a8c7a' : colors.reader.iconDefault }}
        >
          <SearchIcon size={16} />
        </button>

        {/* Timer toggle */}
        <button
          onClick={onToggleTimer}
          title="Temporizador de estudio"
          aria-label={showTimer ? 'Cerrar timer' : 'Abrir timer'}
          aria-pressed={showTimer}
          style={{ ...toolbarBtnStyle, background: showTimer ? 'rgba(42,140,122,0.15)' : 'none', color: showTimer ? '#2a8c7a' : colors.reader.iconDefault }}
        >
          <Timer size={16} />
        </button>

        {/* Sticky notes toggle */}
        <button
          onClick={onToggleStickyNotes}
          title="Notas flotantes"
          aria-label={showStickyNotes ? 'Cerrar notas flotantes' : 'Abrir notas flotantes'}
          aria-pressed={showStickyNotes}
          style={{ ...toolbarBtnStyle, background: showStickyNotes ? 'rgba(42,140,122,0.15)' : 'none', color: showStickyNotes ? '#2a8c7a' : colors.reader.iconDefault }}
        >
          <StickyNote size={16} />
        </button>

        {/* Bookmarks toggle */}
        <button
          onClick={onToggleBookmarks}
          title="Marcadores"
          aria-label={showBookmarks ? 'Cerrar marcadores' : 'Abrir marcadores'}
          aria-pressed={showBookmarks}
          style={{ ...toolbarBtnStyle, background: showBookmarks ? 'rgba(42,140,122,0.15)' : 'none', color: showBookmarks ? '#2a8c7a' : colors.reader.iconDefault }}
        >
          <Bookmark size={16} />
        </button>

        {/* Separator */}
        <div role="separator" aria-hidden="true" style={{ width: 1, height: 20, background: '#6b9e95', margin: '0 4px' }} />

        {/* Theme toggle */}
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />

        {/* Settings toggle */}
        <div className="relative">
          <button
            onClick={onToggleSettings}
            title="Configuración de lectura"
            aria-label={showSettings ? 'Cerrar configuración' : 'Configuración de lectura'}
            aria-pressed={showSettings}
            style={{ ...toolbarBtnStyle, background: showSettings ? 'rgba(42,140,122,0.15)' : 'none', color: showSettings ? '#2a8c7a' : colors.reader.iconDefault }}
          >
            <Settings size={16} />
          </button>
          {showSettings && (
            <ReadingSettingsPanel
              settings={readingSettings}
              onChange={onUpdateReadingSettings}
              onClose={onCloseSettings}
            />
          )}
        </div>

        {/* Separator */}
        <div role="separator" aria-hidden="true" style={{ width: 1, height: 20, background: '#6b9e95', margin: '0 4px' }} />

        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          title="Outline"
          aria-label={sidebarCollapsed ? 'Mostrar panel de estructura' : 'Ocultar panel de estructura'}
          aria-pressed={!sidebarCollapsed}
          style={{ ...toolbarBtnStyle, background: !sidebarCollapsed ? 'rgba(42,140,122,0.15)' : 'none', color: !sidebarCollapsed ? '#2a8c7a' : colors.reader.iconDefault }}
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    </header>
  );
}
