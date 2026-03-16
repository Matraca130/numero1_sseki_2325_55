// ============================================================
// Axon — SectionStudyPlanView (Stub)
//
// Placeholder for the study plan section view.
// Referenced by study-student-routes.ts.
// TODO: Implement full study plan UI with useStudyPlans hook.
// ============================================================

import { CalendarDays, Construction } from 'lucide-react';

export function SectionStudyPlanView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: '#f0fdf4' }}
      >
        <CalendarDays className="w-8 h-8" style={{ color: '#0d9488' }} />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-lg mb-2" style={{ color: '#111827', fontWeight: 700 }}>
          Plan de Estudio
        </h2>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Organiza tu estudio por secciones con planes personalizados.
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
          style={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}
        >
          <Construction className="w-4 h-4" />
          En desarrollo
        </div>
      </div>
    </div>
  );
}

export default SectionStudyPlanView;
