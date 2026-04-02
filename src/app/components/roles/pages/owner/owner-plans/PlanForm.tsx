/**
 * PlanForm — Shared form component for plan create/edit.
 */

import React, { useMemo } from 'react';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/app/components/ui/select';
import { DollarSign } from 'lucide-react';
import { BILLING_CYCLES } from './constants';
import type { InstitutionPlan } from '@/app/types/platform';

export interface PlanFormData {
  name: string;
  description: string;
  price_cents: number;
  billing_cycle: string;
  is_default: boolean;
}

export const DEFAULT_FORM: PlanFormData = {
  name: '',
  description: '',
  price_cents: 0,
  billing_cycle: 'monthly',
  is_default: false,
};

export function planToForm(plan: InstitutionPlan): PlanFormData {
  return {
    name: plan.name,
    description: plan.description ?? '',
    price_cents: plan.price_cents,
    billing_cycle: plan.billing_cycle,
    is_default: plan.is_default,
  };
}

interface PlanFormProps {
  form: PlanFormData;
  onChange: (form: PlanFormData) => void;
  loading: boolean;
}

export function PlanForm({ form, onChange, loading }: PlanFormProps) {
  const priceDisplay = useMemo(() => (form.price_cents / 100).toFixed(2), [form.price_cents]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="plan-name">Nombre *</Label>
        <Input
          id="plan-name" placeholder="Ej: Plan Basico, Plan Premium..."
          value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })}
          disabled={loading} autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="plan-desc">Descripcion</Label>
        <Textarea
          id="plan-desc" placeholder="Descripcion breve del plan..."
          value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })}
          disabled={loading} rows={2} className="resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="plan-price">Precio (MXN)</Label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              id="plan-price" type="number" min="0" step="0.01" placeholder="0.00"
              value={priceDisplay}
              onChange={(e) => {
                const cents = Math.round(parseFloat(e.target.value || '0') * 100);
                onChange({ ...form, price_cents: isNaN(cents) ? 0 : cents });
              }}
              disabled={loading} className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Ciclo de cobro</Label>
          <Select value={form.billing_cycle} onValueChange={(v) => onChange({ ...form, billing_cycle: v })} disabled={loading}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILLING_CYCLES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
        <div>
          <p className="text-sm font-medium text-gray-900">Plan por defecto</p>
          <p className="text-xs text-gray-400">Se asigna automaticamente a nuevos estudiantes</p>
        </div>
        <Switch checked={form.is_default} onCheckedChange={(v) => onChange({ ...form, is_default: v })} disabled={loading} />
      </div>
    </div>
  );
}
