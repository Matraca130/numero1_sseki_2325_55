// ============================================================
// Axon — StudentBlockReader (Immersive full-page block reader)
//
// V1+V2+V6 of visual parity: replaces the minimal wrapper in
// SummaryView.tsx for the student block-based path.
//
// Features:
//   - Sticky compact header (#1B3B36 / #0d0e11 dark)
//   - Back button (ChevronLeft + "AXON" + "Resúmenes")
//   - Toolbar icons: Search, Highlight, Annotations, Bookmarks,
//     Timer, Settings, Sidebar toggle, Dark mode, Mastery toggle
//   - Full-page layout (no app nav/sidebar)
//   - Sidebar outline with scroll-spy
//   - Mastery legend
//   - Keyboard shortcuts: Ctrl+F, Esc
//
// Reference: Prototipo_Resumenes_Axon_FINAL.jsx lines 1564-1902
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  Search,
  Highlighter,
  MessageSquare,
  Bookmark,
  Pencil,
  Timer,
  Settings2,
  PanelLeftOpen,
  Sun,
  Moon,
  Activity,
  Undo2,
  Redo2,
  X,
} from 'lucide-react';
import { SummaryViewer } from './SummaryViewer';
import { SidebarOutline } from './SidebarOutline';
import { ReadingSettingsPanel, type ReadingSettings } from './ReadingSettingsPanel';
import { useSummaryBlocksQuery } from '@/app/hooks/queries/useSummaryBlocksQuery';
import { useSummaryBlockMastery } from '@/app/hooks/queries/useSummaryBlockMastery';
import type { Summary } from '@/app/services/summariesApi';

// ── Design tokens (match prototype) ─────────────────────────

const HEADER_BG_LIGHT = '#1B3B36';
const HEADER_BG_DARK = '#0d0e11';
const ICON_COLOR = '#b4d9d1';
const SEPARATOR_COLOR = '#6b9e95';
const TEAL_ACCENT = '#2a8c7a';
const PAGE_BG_LIGHT = '#F0F2F5';
const PAGE_BG_DARK = '#111215';

const MASTERY_LEGEND = [
  { bg: '#a1a1aa', label: 'Por descubrir' },
  { bg: '#ef4444', label: 'Emergente' },
  { bg: '#f59e0b', label: 'En progreso' },
  { bg: '#10b981', label: 'Consolidado' },
  { bg: '#3b82f6', label: 'Maestría' },
];

// ── Props ────────────────────────────────────────────────────

interface StudentBlockReaderProps {
  summary: Summary;
  topicName: string;
  onBack: () => void;
}

// ── Component ────────────────────────────────────────────────

export function StudentBlockReader({ summary, topicName, onBack }: StudentBlockReaderProps) {
  // Theme detection
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  // Observe dark class changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // UI state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMastery, setShowMastery] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readingSettings, setReadingSettings] = useState<ReadingSettings>({
    fontSize: 15,
    lineHeight: 1.6,
    fontFamily: 'Inter, sans-serif',
  });

  // Scroll-spy state
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data
  const { data: blocks = [] } = useSummaryBlocksQuery(summary.id);
  const { data: masteryLevels = {} } = useSummaryBlockMastery(summary.id);

  // ── Scroll spy via IntersectionObserver ────────────────────
  useEffect(() => {
    if (blocks.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-block-id');
            if (id) setActiveBlockId(id);
          }
        }
      },
      { threshold: 0.3, rootMargin: '-60px 0px -50% 0px' },
    );
    const els = contentRef.current?.querySelectorAll('[data-block-id]') ?? [];
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [blocks]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => {
          if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
          return !prev;
        });
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Block click from sidebar ───────────────────────────────
  const scrollToBlock = useCallback((blockId: string) => {
    const el = contentRef.current?.querySelector(`[data-block-id="${blockId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Search filter ──────────────────────────────────────────
  const searchResultCount = useMemo(() => {
    if (!searchQuery.trim()) return blocks.length;
    const q = searchQuery.toLowerCase();
    return blocks.filter((b) => {
      const text = JSON.stringify(b.content ?? {}).toLowerCase();
      return text.includes(q);
    }).length;
  }, [blocks, searchQuery]);

  // ── Toggle dark mode ───────────────────────────────────────
  const toggleDark = useCallback(() => {
    document.documentElement.classList.toggle('dark');
  }, []);

  // ── Sorted blocks for sidebar ──────────────────────────────
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [blocks],
  );

  const headerBg = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const pageBg = isDark ? PAGE_BG_DARK : PAGE_BG_LIGHT;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: pageBg }}>
      {/* ── Reading progress bar ─────────────────────────────── */}
      <ReadingProgress containerRef={contentRef} />

      {/* ── Sticky compact header ────────────────────────────── */}
      <header
        className="flex items-center justify-between shrink-0"
        style={{
          background: headerBg,
          padding: '10px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: isDark ? '1px solid #2d2e34' : 'none',
        }}
      >
        {/* Left: back + brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[#b4d9d1] hover:text-white transition-colors"
            aria-label="Volver a resúmenes"
          >
            <ChevronLeft size={18} />
          </button>
          <span
            className="text-base font-bold"
            style={{ color: isDark ? '#3cc9a8' : TEAL_ACCENT, fontFamily: 'Space Grotesk, sans-serif' }}
          >
            AXON
          </span>
          <span className="text-[13px]" style={{ color: ICON_COLOR }}>
            Resúmenes
          </span>
        </div>

        {/* Right: toolbar icons — matches prototype order (lines 1588-1696) */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <ToolbarButton
            icon={Search}
            active={searchOpen}
            onClick={() => {
              setSearchOpen((p) => !p);
              if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            title="Buscar (Ctrl+F)"
          />

          {/* Timer */}
          <ToolbarButton icon={Timer} onClick={() => {}} title="Temporizador" />

          {/* Settings */}
          <div className="relative">
            <ToolbarButton
              icon={Settings2}
              active={settingsOpen}
              onClick={() => setSettingsOpen((p) => !p)}
              title="Configuración de lectura"
            />
            {settingsOpen && (
              <ReadingSettingsPanel
                settings={readingSettings}
                onChange={setReadingSettings}
                onClose={() => setSettingsOpen(false)}
              />
            )}
          </div>

          <ToolbarSeparator />

          {/* Sidebar toggle */}
          <ToolbarButton
            icon={PanelLeftOpen}
            active={sidebarOpen}
            onClick={() => setSidebarOpen((p) => !p)}
            title="Estructura"
          />

          {/* Dark mode */}
          <ToolbarButton
            icon={isDark ? Sun : Moon}
            onClick={toggleDark}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          />

          <ToolbarSeparator />

          {/* Mastery toggle */}
          <button
            onClick={() => setShowMastery((p) => !p)}
            className="flex items-center gap-1.5 rounded-full text-[11px] font-semibold transition-all"
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: `1px solid ${showMastery ? TEAL_ACCENT : SEPARATOR_COLOR}`,
              background: showMastery ? 'rgba(42,140,122,0.15)' : 'transparent',
              color: showMastery ? (isDark ? '#3cc9a8' : TEAL_ACCENT) : ICON_COLOR,
            }}
          >
            <Activity size={13} /> Mastery
          </button>
        </div>
      </header>

      {/* ── Search bar (below header) ────────────────────────── */}
      {searchOpen && (
        <div
          className="flex items-center gap-3 shrink-0"
          style={{
            padding: '8px 16px',
            background: isDark ? '#1e1f25' : '#FFFFFF',
            borderBottom: `1px solid ${isDark ? '#2d2e34' : '#E5E7EB'}`,
          }}
        >
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en el resumen..."
            className="flex-1 border-none outline-none text-sm bg-transparent text-gray-800 dark:text-gray-200"
            autoFocus
          />
          {searchQuery && (
            <span className="text-xs text-gray-400">
              {searchResultCount} resultado{searchResultCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Main layout: sidebar + content ───────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {/* Sidebar — collapsed (52px) stays in flow, expanded overlays */}
        {sidebarOpen && (
          <div className="relative" style={{ width: 52, flexShrink: 0 }}>
            <SidebarOutline
              blocks={sortedBlocks.map((b) => ({
                id: b.id,
                type: b.type,
                content: b.content as Record<string, unknown> | undefined,
              }))}
              activeBlockId={activeBlockId}
              onBlockClick={scrollToBlock}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
              masteryLevels={showMastery ? masteryLevels : undefined}
            />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 min-w-0 overflow-y-auto" ref={contentRef}>
          {/* Summary header */}
          <div style={{ margin: '0 auto', padding: '20px 20px 0' }}>
            {/* Tags */}
            <div className="flex gap-2 mb-2.5 flex-wrap">
              {topicName && (
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[10px]"
                  style={{
                    background: isDark ? '#1a2e2a' : '#e8f5f1',
                    color: isDark ? '#3cc9a8' : TEAL_ACCENT,
                  }}
                >
                  {topicName}
                </span>
              )}
              <span
                className="text-[11px] py-0.5 px-2.5 rounded-[10px]"
                style={{
                  background: pageBg,
                  color: isDark ? '#6b7280' : '#9CA3AF',
                  border: `1px solid ${isDark ? '#2d2e34' : '#E5E7EB'}`,
                }}
              >
                {blocks.length} bloques
              </span>
            </div>

            {/* Title */}
            <h1
              className="mb-1.5"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 30,
                fontWeight: 700,
                color: isDark ? '#3cc9a8' : '#1B3B36',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {summary.title || 'Resumen'}
            </h1>

            {/* Subtitle */}
            {summary.description && (
              <p className="text-sm mb-1.5" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                {summary.description}
              </p>
            )}

            {/* Mastery legend */}
            {showMastery && (
              <div
                className="flex gap-2.5 flex-wrap mt-2 mb-2 py-2 px-3.5 rounded-[10px]"
                style={{
                  background: isDark ? '#1e1f25' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#2d2e34' : '#E5E7EB'}`,
                }}
              >
                <span className="text-[11px] font-semibold mr-1" style={{ color: isDark ? '#6b7280' : '#9CA3AF' }}>
                  Tu dominio:
                </span>
                {MASTERY_LEGEND.map((m) => (
                  <span key={m.label} className="flex items-center gap-1 text-[11px]">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ background: m.bg }}
                    />
                    <span className="font-semibold" style={{ color: isDark ? '#9ca3af' : '#52525b' }}>
                      {m.label}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Block content (wrapped in card) */}
          <div
            style={{
              maxWidth: 'none',
              margin: '12px auto 0',
              padding: '28px 32px 48px',
              background: isDark ? '#1e1f25' : '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: `1px solid ${isDark ? '#2d2e34' : '#E5E7EB'}`,
            }}
          >
            <SummaryViewer
              summaryId={summary.id}
              readingSettings={readingSettings}
              layout="flow"
            />
          </div>

          {/* Bottom padding */}
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}

// ── Toolbar button helper ────────────────────────────────────

function ToolbarButton({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ size?: number }>;
  active?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors"
      style={{
        background: active ? 'rgba(42,140,122,0.15)' : 'none',
        border: 'none',
        padding: 6,
        cursor: 'pointer',
        color: active ? '#3cc9a8' : ICON_COLOR,
      }}
    >
      <Icon size={16} />
    </button>
  );
}

// ── Toolbar separator ────────────────────────────────────────

function ToolbarSeparator() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: SEPARATOR_COLOR,
        margin: '0 4px',
      }}
    />
  );
}

// ── Reading progress bar ─────────────────────────────────────

function ReadingProgress({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      setProgress(scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  return (
    <div
      className="fixed top-0 left-0 z-[150]"
      style={{
        height: 3,
        width: `${progress}%`,
        background: '#2a8c7a',
        transition: 'width 0.1s',
      }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso de lectura"
    />
  );
}
