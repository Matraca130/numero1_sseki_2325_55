/**
 * DashboardLayout — Header, mobile tabs, and responsive layout wrapper.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon, Plus, ListTodo, BarChart3,
} from 'lucide-react';
import clsx from 'clsx';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { PlanCalendarSidebar } from '@/app/components/schedule/PlanCalendarSidebar';
import { PlanProgressSidebar } from '@/app/components/schedule/PlanProgressSidebar';

type MobileTab = 'tasks' | 'calendar' | 'progress';

interface DashboardLayoutProps {
  isMobile: boolean;
  mobileTab: MobileTab;
  onMobileTabChange: (tab: MobileTab) => void;
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
  tasksForDateCount: number;
  plansCount: number;
  onNavigateNewPlan: () => void;
  calendarSidebarProps: any;
  progressSidebarProps: any;
  renderTasksPanel: () => React.ReactNode;
}

export function DashboardLayout({
  isMobile, mobileTab, onMobileTabChange,
  completedTasks, totalTasks, progressPercent, tasksForDateCount, plansCount,
  onNavigateNewPlan, calendarSidebarProps, progressSidebarProps, renderTasksPanel,
}: DashboardLayoutProps) {
  return (
    <div className="h-full flex flex-col bg-surface-dashboard">
      <div className="shrink-0">
        <AxonPageHeader
          title="Cronograma"
          subtitle="Plan de Estudios Activo"
          statsLeft={
            <p className="text-gray-500 text-sm">
              <span className="font-semibold text-[#1a2332]">{completedTasks}</span> de <span className="font-semibold text-[#1a2332]">{totalTasks}</span>
              &nbsp;<span className="text-[#34D399] font-semibold">{progressPercent}%</span> completo
            </p>
          }
          statsRight={
            <div className="hidden md:flex items-center gap-5">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs text-gray-500"><span className="text-emerald-600 font-semibold">{completedTasks}</span> completadas</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs text-gray-500"><span className="text-amber-600 font-semibold">{tasksForDateCount}</span> para hoy</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#2a8c7a]" /><span className="text-xs text-gray-500"><span className="text-[#2a8c7a] font-semibold">{plansCount}</span> planes</span></div>
            </div>
          }
          actionButton={
            <button onClick={onNavigateNewPlan} className="flex items-center gap-2 px-4 lg:px-6 py-2.5 min-h-[44px] bg-[#1B3B36] hover:bg-[#244e47] rounded-full text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0">
              <Plus size={15} /> <span className="hidden sm:inline">Nuevo Plan</span><span className="sm:hidden">Nuevo</span>
            </button>
          }
        />
      </div>

      {isMobile && (
        <div className="shrink-0 bg-white border-b border-gray-200 flex">
          {([
            { key: 'tasks' as MobileTab, label: 'Tareas', icon: <ListTodo size={16} />, count: tasksForDateCount },
            { key: 'calendar' as MobileTab, label: 'Calendario', icon: <CalendarIcon size={16} />, count: undefined },
            { key: 'progress' as MobileTab, label: 'Progreso', icon: <BarChart3 size={16} />, count: undefined },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => onMobileTabChange(tab.key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 min-h-[48px] text-sm font-semibold transition-all border-b-2',
                mobileTab === tab.key ? 'text-[#1B3B36] border-[#2a8c7a] bg-[#e6f5f1]/30' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50',
              )}>
              {tab.icon}<span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] font-bold bg-[#2a8c7a] text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {isMobile ? (
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileTab === 'tasks' && (
              <motion.div key="tasks" className="h-full" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
                {renderTasksPanel()}
              </motion.div>
            )}
            {mobileTab === 'calendar' && (
              <motion.div key="calendar" className="h-full overflow-y-auto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
                <PlanCalendarSidebar {...calendarSidebarProps} embedded />
              </motion.div>
            )}
            {mobileTab === 'progress' && (
              <motion.div key="progress" className="h-full overflow-y-auto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
                <PlanProgressSidebar {...progressSidebarProps} embedded />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-1 w-full overflow-hidden">
          <PlanCalendarSidebar {...calendarSidebarProps} />
          {renderTasksPanel()}
          <PlanProgressSidebar {...progressSidebarProps} />
        </div>
      )}
    </div>
  );
}
