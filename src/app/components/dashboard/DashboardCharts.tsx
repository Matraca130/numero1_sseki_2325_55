// ============================================================
// Axon — Dashboard Charts (RESPONSIVE VERSION)
//
// Changes from original:
//   1. ActivityChart legend: flex-wrap for mobile
//   2. ActivityChart header: stacks on mobile (flex-col sm:flex-row)
//   3. Chart heights: min-h reduced on mobile
//   4. MasteryDonut: responsive inner/outer radius not needed
//      (ResponsiveContainer handles it)
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { headingStyle, components, colors } from '@/app/design-system';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';

// ── Types ──
export interface ActivityDataPoint {
  date: string;
  videos: number;
  cards: number;
  amt: number;
}

export interface MasteryDataPoint {
  name: string;
  value: number;
  color: string;
}

// ── Activity Chart (Stacked Bar) ──
interface ActivityChartProps {
  data: ActivityDataPoint[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`lg:col-span-2 ${components.chartCard.base} min-w-0`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900" style={headingStyle}>Actividad de Estudio</h3>
          <p className="text-sm text-gray-500">Comparativo de videos vs. flashcards</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-medium text-gray-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-axon-accent" />
            Flashcards
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-500" />
            Videos
          </div>
        </div>
      </div>

      <div className="h-[220px] sm:h-[300px] w-full min-w-0">
        <ChartErrorBoundary height="100%">
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
            <BarChart data={data} barSize={24} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="cards" stackId="a" fill={colors.chart.flashcards} radius={[0, 0, 4, 4]} isAnimationActive={false} />
              <Bar dataKey="videos" stackId="a" fill={colors.chart.videos} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>
    </motion.div>
  );
}

// ── Mastery Distribution (Donut) ──
interface MasteryDonutProps {
  data: MasteryDataPoint[];
  totalCards: number;
}

export function MasteryDonut({ data, totalCards }: MasteryDonutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`${components.chartCard.base} min-w-0`}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-1" style={headingStyle}>Nivel de Dominio</h3>
      <p className="text-sm text-gray-500 mb-4 sm:mb-6">Basado en la metodologia SM2</p>

      <div className="h-[180px] sm:h-[220px] relative min-w-0">
        <ChartErrorBoundary height="100%">
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="75%"
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900">{totalCards || '\u2014'}</span>
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide">Total Temas</span>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3 mt-4">
        {data.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-600 truncate">{item.name}</span>
            </div>
            <span className="font-semibold text-gray-900 shrink-0 ml-2">{totalCards > 0 ? Math.round((item.value / totalCards) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
