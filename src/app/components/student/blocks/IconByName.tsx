import type { LucideProps } from 'lucide-react';
import {
  Activity, Heart, Pill, Stethoscope, Shield, FlaskConical,
  Clock, Lightbulb, Target, AlertCircle, Brain, Info,
  AlertTriangle, HelpCircle, CheckCircle2, CircleDot,
} from 'lucide-react';

const ICONS: Record<string, React.FC<LucideProps>> = {
  Activity, Heart, Pill, Stethoscope, Shield, FlaskConical,
  Clock, Lightbulb, Target, AlertCircle, Brain, Info,
  AlertTriangle, HelpCircle, CheckCircle2,
};

export default function IconByName({ name, size = 16, className }: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = (name ? ICONS[name] : undefined) ?? CircleDot;
  return <Icon size={size} className={className} />;
}
