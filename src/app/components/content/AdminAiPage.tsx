// ============================================================
// Axon — AdminAiPage (v4.5, Fase F-4)
//
// Unified admin page with tabs for all AI management features:
//   - Reports moderation (ReportsModeratorPanel)
//   - RAG Analytics (RagAnalyticsDashboard)
//   - Admin Tools (AdminAiToolsPanel)
//
// USAGE:
//   <AdminAiPage institutionId={institutionId} />
//
// This component is a STANDALONE page ready to be mounted
// in routes.tsx by the layout agent. It does NOT modify
// any protected files.
//
// DEPENDENCIES:
//   - ReportsModeratorPanel, RagAnalyticsDashboard, AdminAiToolsPanel
//   - shadcn Tabs
//   - design-system tokens
// ============================================================

import React, { useState } from 'react';
import {
  Flag,
  BarChart3,
  Settings2,
  Brain,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import { ReportsModeratorPanel } from './ReportsModeratorPanel';
import { RagAnalyticsDashboard } from './RagAnalyticsDashboard';
import { AdminAiToolsPanel } from './AdminAiToolsPanel';
import { headingStyle } from '@/app/design-system';

// ── Tab config ───────────────────────────────────────

const TABS = [
  { value: 'reports',   label: 'Reportes',    icon: Flag,       description: 'Moderar reportes de calidad' },
  { value: 'analytics', label: 'Analytics',    icon: BarChart3,  description: 'Metricas RAG y embeddings' },
  { value: 'tools',     label: 'Herramientas', icon: Settings2,  description: 'Embeddings y re-chunking' },
] as const;

type TabValue = typeof TABS[number]['value'];

// ── Component ───────────────────────────────────────────

interface AdminAiPageProps {
  institutionId: string;
}

export function AdminAiPage({ institutionId }: AdminAiPageProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('reports');

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Brain size={18} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-gray-900" style={{ ...headingStyle, fontWeight: 700 }}>
              Gestion IA
            </h1>
            <p className="text-xs text-gray-400">
              Reportes de calidad, analytics RAG y herramientas de admin
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="bg-white border-b border-gray-100 px-6 shrink-0">
          <TabsList className="bg-transparent border-0 p-0 gap-0 h-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 data-[state=active]:text-teal-600 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                >
                  <Icon size={16} />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <TabsContent value="reports" className="m-0 h-full">
            <ReportsModeratorPanel institutionId={institutionId} />
          </TabsContent>

          <TabsContent value="analytics" className="m-0 h-full">
            <RagAnalyticsDashboard institutionId={institutionId} />
          </TabsContent>

          <TabsContent value="tools" className="m-0 h-full">
            <AdminAiToolsPanel institutionId={institutionId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default AdminAiPage;
