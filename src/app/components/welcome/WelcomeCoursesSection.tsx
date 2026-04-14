import { ArrowRight, Clock } from 'lucide-react';
import { headingStyle } from '@/app/design-system';
import { CourseCard } from '@/app/components/shared/CourseCard';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { GamificationCTA } from './GamificationCTA';
import { tk } from './welcomeTokens';

export interface WelcomeCourseItem {
  id: string;
  title: string;
  module: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  iconBg: string;
  progressColor: string;
  percentColor: string;
  progress: number;
  completed: number;
  total: number;
}

export function WelcomeCoursesSection({
  courseData,
  xpToday,
  streakDays,
  level,
  studiedToday,
  atRisk,
  cardsDue,
  cardsNew,
  studentLoading,
  onNavigateGamification,
  onNavigateStudyHub,
  onContinueCourse,
}: {
  courseData: WelcomeCourseItem[];
  xpToday: number;
  streakDays: number;
  level: number;
  studiedToday: boolean;
  atRisk: boolean;
  cardsDue: number;
  cardsNew: number;
  studentLoading: boolean;
  onNavigateGamification: () => void;
  onNavigateStudyHub: () => void;
  onContinueCourse: () => void;
}) {
  return (
    <div className="flex-1 min-w-0 space-y-5">
      <GamificationCTA
        xpToday={xpToday}
        streakDays={streakDays}
        level={level}
        studiedToday={studiedToday}
        atRisk={atRisk}
        cardsDue={cardsDue}
        onNavigate={onNavigateGamification}
      />

      {/* Empty study queue state */}
      {!studentLoading && cardsDue === 0 && cardsNew === 0 && (
        <EmptyState icon={Clock} title="Sin tareas pendientes" description="Estas al dia!" className="py-8" />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tk.teal }} />
          <h3
            className="text-xs text-gray-400 uppercase tracking-wider"
            style={{ ...headingStyle, fontWeight: 600 }}
          >
            Disciplinas en Curso
          </h3>
          <div className="flex-1 h-px bg-gray-100 hidden sm:block" />
        </div>
        <button
          onClick={onNavigateStudyHub}
          className="flex items-center gap-1 text-xs transition-colors ml-4 shrink-0"
          style={{ color: tk.teal, fontWeight: 500 }}
        >
          <span className="hidden sm:inline">Ver Todas</span>
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {courseData.map((course) => (
          <CourseCard
            key={course.id}
            title={course.title}
            module={course.module}
            progress={course.progress}
            progressText={
              course.total > 0 ? `${course.completed}/${course.total} Clases` : `${course.progress}% dominio`
            }
            icon={course.icon}
            iconBg={course.iconBg}
            progressColor={course.progressColor}
            percentColor={course.percentColor}
            onContinue={onContinueCourse}
          />
        ))}
      </div>
    </div>
  );
}

export default WelcomeCoursesSection;
