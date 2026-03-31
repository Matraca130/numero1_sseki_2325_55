/**
 * PlanCard and PlansStats — Display components for OwnerPlansPage.
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { formatDate, formatPrice } from '@/app/components/shared/page-helpers';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/app/components/ui/dropdown-menu';
import {
  CreditCard, MoreVertical, Star, Trash2, Pencil,
  Users, Calendar, DollarSign, CheckCircle2,
  ToggleLeft, ToggleRight, Package,
} from 'lucide-react';
import type { InstitutionPlan } from '@/app/types/platform';
import { billingLabel } from './constants';

interface PlanCardProps {
  plan: InstitutionPlan;
  index: number;
  onEdit: (plan: InstitutionPlan) => void;
  onDelete: (plan: InstitutionPlan) => void;
  onSetDefault: (plan: InstitutionPlan) => void;
  onToggleActive: (plan: InstitutionPlan) => void;
}

export function PlanCard({ plan, index, onEdit, onDelete, onSetDefault, onToggleActive }: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className={`relative bg-white rounded-2xl border-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md ${
        plan.is_default ? 'border-amber-300 ring-1 ring-amber-100' : !plan.is_active ? 'border-gray-100 opacity-60' : 'border-gray-100'
      }`}
    >
      {plan.is_default && (
        <div className="absolute top-0 right-0">
          <div className="bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Star size={10} fill="currentColor" />Default
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              plan.is_default ? 'bg-amber-50 text-amber-500' : plan.is_active ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400'
            }`}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{plan.name}</h3>
              {!plan.is_active && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Inactivo</span>}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1"><MoreVertical size={14} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-gray-400">Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(plan)}><Pencil size={14} />Editar</DropdownMenuItem>
              {!plan.is_default && plan.is_active && (
                <DropdownMenuItem onClick={() => onSetDefault(plan)}><Star size={14} />Hacer default</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onToggleActive(plan)}>
                {plan.is_active ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                {plan.is_active ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(plan)} disabled={plan.is_default}>
                <Trash2 size={14} />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatPrice(plan.price_cents)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{plan.price_cents === 0 ? 'Sin costo' : billingLabel(plan.billing_cycle)}</p>
        </div>

        {plan.description && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{plan.description}</p>}

        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Users size={12} />
            <span className="tabular-nums font-medium text-gray-600">{plan.member_count ?? 0}</span>
            <span>miembros</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} /><span>{formatDate(plan.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PlansStats({ plans }: { plans: InstitutionPlan[] }) {
  const stats = useMemo(() => {
    const active = plans.filter(p => p.is_active);
    const totalMembers = plans.reduce((sum, p) => sum + (p.member_count ?? 0), 0);
    const avgPrice = active.length > 0 ? active.reduce((sum, p) => sum + p.price_cents, 0) / active.length : 0;
    return { total: plans.length, active: active.length, totalMembers, avgPrice };
  }, [plans]);

  const items = [
    { label: 'Total', value: stats.total, icon: <Package size={14} />, color: 'text-gray-600' },
    { label: 'Activos', value: stats.active, icon: <CheckCircle2 size={14} />, color: 'text-emerald-600' },
    { label: 'Miembros', value: stats.totalMembers, icon: <Users size={14} />, color: 'text-blue-600' },
    { label: 'Precio prom.', value: formatPrice(Math.round(stats.avgPrice)), icon: <DollarSign size={14} />, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className={`${item.color} opacity-60`}>{item.icon}</div>
          <div>
            <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{item.value}</p>
            <p className="text-[11px] text-gray-400">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
