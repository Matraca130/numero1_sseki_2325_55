// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
// PERF-70: All pages lazy-loaded to reduce initial bundle size.
// ============================================================
import type { RouteObject } from 'react-router';

const lazyPlaceholder = (title: string, desc: string, iconName: string) => ({
  lazy: async () => {
    const [{ PlaceholderPage }, lucideIcons] = await Promise.all([
      import('@/app/components/roles/PlaceholderPage'),
      import('lucide-react'),
    ]);
    const React = await import('react');
    const Icon = (lucideIcons as any)[iconName];
    const Component = () => PlaceholderPage({
      title,
      description: desc,
      icon: Icon ? React.createElement(Icon, { size: 20 }) : null,
    });
    return { Component };
  },
});

export const professorChildren: RouteObject[] = [
  { index: true,        ...lazyPlaceholder('Dashboard',   'Panel del profesor', 'LayoutDashboard') },
  { path: 'courses',    ...lazyPlaceholder('Cursos',      'Gestion de cursos', 'BookOpen') },
  { path: 'curriculum', ...lazyPlaceholder('Curriculo',   'Arbol de contenidos', 'ListTree') },
  { path: 'flashcards', ...lazyPlaceholder('Flashcards',  'Gestion de flashcards', 'Layers') },
  { path: 'quizzes',    ...lazyPlaceholder('Quizzes',     'Gestion de evaluaciones', 'ClipboardList') },
  { path: 'students',   ...lazyPlaceholder('Estudiantes', 'Seguimiento de alumnos', 'Users') },
  { path: 'ai',         ...lazyPlaceholder('IA',          'Herramientas de IA', 'Sparkles') },
  { path: 'settings',   ...lazyPlaceholder('Ajustes',     'Configuracion del profesor', 'Settings') },
];