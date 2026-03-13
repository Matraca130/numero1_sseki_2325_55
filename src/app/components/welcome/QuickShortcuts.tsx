// ============================================================
// Axon — Quick Shortcut Cards Grid
// Renders the "Acceso Rapido" section on the Welcome page.
// Extracted from WelcomeView.tsx for modularization.
// ============================================================
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { components, headingStyle, layout } from '@/app/design-system';
import { SHORTCUT_CARDS } from '@/app/components/welcome/welcomeData';

interface QuickShortcutsProps {
  onNavigate: (view: string) => void;
}

export function QuickShortcuts({ onNavigate }: QuickShortcutsProps) {
  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-axon-accent" />
        <h3
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
          style={headingStyle}
        >
          Acceso Rapido
        </h3>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className={layout.grid.stats}>
        {SHORTCUT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={components.shortcutCard.base}
              onClick={() => onNavigate(stat.view)}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`${components.shortcutCard.iconSize} ${stat.bg} flex items-center justify-center`}
                >
                  <Icon size={20} className={stat.color} />
                </div>
                <ArrowRight size={16} className="text-gray-300" />
              </div>
              <h4 className="font-bold text-gray-900" style={headingStyle}>
                {stat.title}
              </h4>
              <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}