import {
  Activity, Heart, Pill, Stethoscope, Shield, FlaskConical,
  Clock, Lightbulb, Target, AlertCircle, Brain, Info,
  AlertTriangle, HelpCircle, CheckCircle2, CircleDot,
} from 'lucide-react';

const ICONS: Record<string, React.FC<any>> = {
  Activity, Heart, Pill, Stethoscope, Shield, FlaskConical,
  Clock, Lightbulb, Target, AlertCircle, Brain, Info,
  AlertTriangle, HelpCircle, CheckCircle2,
};

export default function IconByName({ name, size = 16, className }: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[name] || CircleDot;
  return <Icon size={size} className={className} />;
}
