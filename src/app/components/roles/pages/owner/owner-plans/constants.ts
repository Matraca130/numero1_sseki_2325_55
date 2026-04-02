/**
 * Constants for OwnerPlansPage.
 * Billing cycle options and label resolver.
 */

export const BILLING_CYCLES: { value: string; label: string }[] = [
  { value: 'monthly',   label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'biannual',  label: 'Semestral' },
  { value: 'annual',    label: 'Anual' },
  { value: 'one_time',  label: 'Pago unico' },
];

export function billingLabel(cycle: string): string {
  return BILLING_CYCLES.find(c => c.value === cycle)?.label ?? cycle;
}
