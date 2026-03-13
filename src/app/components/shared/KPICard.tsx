import React from 'react';
import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';
import { kpiCardClasses, iconBadgeClasses, components } from '@/app/design-system';

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  trendSlot?: React.ReactNode;
  iconColorClass?: string;
  children?: React.ReactNode;
  className?: string;
}

export function KPICard({
  icon,
  label,
  value,
  trendSlot,
  iconColorClass,
  children,
  className,
}: KPICardProps) {
  return (
    <div className={clsx(kpiCardClasses(), className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(components.kpiCard.iconBg, iconColorClass || `${components.icon.default.bg} ${components.icon.default.text}`)}>
          {icon}
        </div>
        {trendSlot}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      {children}
    </div>
  );
}

interface TrendBadgeProps {
  label: string;
  up?: boolean;
  icon?: React.ReactNode;
}

export function TrendBadge({ label, up = true, icon }: TrendBadgeProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
        up ? components.kpiCard.trend.up : components.kpiCard.trend.down,
      )}
    >
      {icon || <TrendingUp className={clsx('w-3 h-3', !up && 'rotate-180')} />}
      {label}
    </div>
  );
}
