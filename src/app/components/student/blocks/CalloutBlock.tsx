import type { LucideProps } from 'lucide-react';
import {
  Lightbulb, AlertTriangle, Stethoscope, Brain, Target,
} from 'lucide-react';
import type { SummaryBlock } from '@/app/services/summariesApi';

interface CalloutConfig {
  icon: React.FC<LucideProps>;
  label: string;
  light: { bg: string; border: string; accent: string };
  dark: { bg: string; border: string; accent: string };
}

const VARIANTS: Record<string, CalloutConfig> = {
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    light: { bg: 'bg-[#f0fdf4]', border: 'border-l-emerald-500', accent: 'text-[#065f46]' },
    dark: { bg: 'dark:bg-[#0f2a1d]', border: 'dark:border-l-emerald-500', accent: 'dark:text-emerald-300' },
  },
  warning: {
    icon: AlertTriangle,
    label: 'Atenci\u00f3n',
    light: { bg: 'bg-[#fffbeb]', border: 'border-l-amber-500', accent: 'text-[#92400e]' },
    dark: { bg: 'dark:bg-[#2a2010]', border: 'dark:border-l-amber-500', accent: 'dark:text-amber-300' },
  },
  clinical: {
    icon: Stethoscope,
    label: 'Correlaci\u00f3n Cl\u00ednica',
    light: { bg: 'bg-[#eff6ff]', border: 'border-l-blue-500', accent: 'text-[#1e40af]' },
    dark: { bg: 'dark:bg-[#0f1a2e]', border: 'dark:border-l-blue-500', accent: 'dark:text-blue-300' },
  },
  mnemonic: {
    icon: Brain,
    label: 'Mnemotecnia',
    light: { bg: 'bg-[#f5f3ff]', border: 'border-l-violet-500', accent: 'text-[#5b21b6]' },
    dark: { bg: 'dark:bg-[#1a1530]', border: 'dark:border-l-violet-500', accent: 'dark:text-violet-300' },
  },
  exam: {
    icon: Target,
    label: 'Importante para Examen',
    light: { bg: 'bg-[#fef2f2]', border: 'border-l-red-500', accent: 'text-[#b91c1c]' },
    dark: { bg: 'dark:bg-[#2a1215]', border: 'dark:border-l-red-500', accent: 'dark:text-red-300' },
  },
};

export default function CalloutBlock({ block }: { block: SummaryBlock }) {
  const variantKey = block.content?.variant as string | undefined;
  const title = block.content?.title as string | undefined;
  const content = block.content?.content as string | undefined;
  const v = VARIANTS[variantKey ?? ''] ?? VARIANTS.tip;
  const Icon = v.icon;

  return (
    <div
      className={`rounded-xl px-5 py-4 border-l-4 ${v.light.bg} ${v.light.border} ${v.dark.bg} ${v.dark.border}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={`${v.light.accent} ${v.dark.accent}`} />
        <span className={`text-xs font-bold uppercase tracking-[0.05em] ${v.light.accent} ${v.dark.accent}`}>
          {v.label}
        </span>
      </div>
      {title && (
        <div className="font-serif text-base font-bold text-gray-900 dark:text-gray-200 mb-1.5">
          {title}
        </div>
      )}
      {content && (
        <div className="text-sm leading-[1.6] text-gray-500 dark:text-gray-400 whitespace-pre-line">
          {content}
        </div>
      )}
    </div>
  );
}
