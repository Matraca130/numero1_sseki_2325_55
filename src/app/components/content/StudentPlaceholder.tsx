// ============================================================
// Axon — Student Placeholder Page
//
// Lightweight "coming soon" page for student routes that are
// not yet implemented. Does NOT use useAuth() — compatible
// with the student layout (AppProvider + StudentDataProvider).
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useStudentNav } from '@/app/hooks/useStudentNav';

interface StudentPlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor?: string; // tailwind color name: amber, blue, purple, teal
  features?: string[];
}

const COLOR_MAP: Record<string, { iconBg: string; iconText: string; border: string; featureDot: string }> = {
  amber:  { iconBg: 'bg-amber-50',  iconText: 'text-amber-500',  border: 'border-amber-100',  featureDot: 'bg-amber-400'  },
  blue:   { iconBg: 'bg-blue-50',   iconText: 'text-blue-500',   border: 'border-blue-100',   featureDot: 'bg-blue-400'   },
  purple: { iconBg: 'bg-purple-50', iconText: 'text-purple-500', border: 'border-purple-100', featureDot: 'bg-purple-400' },
  teal:   { iconBg: 'bg-teal-50',   iconText: 'text-teal-500',   border: 'border-teal-100',   featureDot: 'bg-teal-400'   },
};

export function StudentPlaceholder({
  title,
  description,
  icon,
  accentColor = 'teal',
  features = [],
}: StudentPlaceholderProps) {
  const { navigateTo } = useStudentNav();
  const c = COLOR_MAP[accentColor] || COLOR_MAP.teal;

  return (
    <div className="h-full flex items-center justify-center p-8 bg-gray-50/50">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${c.iconBg} ${c.iconText} flex items-center justify-center mx-auto mb-5`}>
            {icon}
          </div>

          {/* Title */}
          <h2 className="text-gray-900 mb-1">{title}</h2>
          <p className="text-sm text-gray-400 mb-6">{description}</p>

          {/* Construction badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 mb-6">
            <Construction size={13} className="text-gray-400" />
            <span className="text-xs text-gray-500">En desarrollo</span>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="text-left mb-6 pt-4 border-t border-gray-50">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Funcionalidades planificadas</p>
              <div className="space-y-1.5">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${c.featureDot} shrink-0`} />
                    <span className="text-xs text-gray-600">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft size={12} />
            Volver al inicio
          </button>
        </div>
      </motion.div>
    </div>
  );
}
