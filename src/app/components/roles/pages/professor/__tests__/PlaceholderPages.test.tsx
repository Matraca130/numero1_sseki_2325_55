// ============================================================
// Tests for Professor Placeholder Pages
//
// Covers: ProfessorCoursesPage, ProfessorSettingsPage, ProfessorStudentsPage
// Tests: title, description, features, backend routes, auth context
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithAuth, createMockUser, createMockInstitution, screen } from '@/test/test-utils';
import { ProfessorCoursesPage } from '../ProfessorCoursesPage';
import { ProfessorSettingsPage } from '../ProfessorSettingsPage';
import { ProfessorStudentsPage } from '../ProfessorStudentsPage';

// Mock motion library
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BookOpen: ({ size, ...props }: any) => <div data-testid="book-open-icon" {...props} />,
  Settings: ({ size, ...props }: any) => <div data-testid="settings-icon" {...props} />,
  Users: ({ size, ...props }: any) => <div data-testid="users-icon" {...props} />,
  Construction: ({ size, ...props }: any) => <div data-testid="construction-icon" {...props} />,
  CalendarDays: ({ size, ...props }: any) => <div data-testid="calendar-days-icon" {...props} />,
}));

// Mock useAuth
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => {
    const institution = createMockInstitution({ role: 'professor' });
    return {
      user: createMockUser(),
      selectedInstitution: institution,
      role: 'professor',
      activeMembership: { role: 'professor', institution, id: 'mem-001' },
    };
  },
}));

describe('ProfessorCoursesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct title and description', () => {
    renderWithAuth(<ProfessorCoursesPage />);
    expect(screen.getByText('Mis Cursos')).toBeInTheDocument();
    expect(screen.getByText('Gestiona los cursos que dictas')).toBeInTheDocument();
  });

  it('displays BookOpen icon', () => {
    renderWithAuth(<ProfessorCoursesPage />);
    expect(screen.getByTestId('book-open-icon')).toBeInTheDocument();
  });

  it('displays course-related features', () => {
    renderWithAuth(<ProfessorCoursesPage />);
    expect(screen.getByText('Ver cursos asignados')).toBeInTheDocument();
    expect(screen.getByText('Contenido por curso')).toBeInTheDocument();
    expect(screen.getByText('Progreso de estudiantes por curso')).toBeInTheDocument();
    expect(screen.getByText('Materiales de estudio')).toBeInTheDocument();
  });

  it('displays backend routes for courses API', () => {
    renderWithAuth(<ProfessorCoursesPage />);
    expect(screen.getByText('GET /server/curriculum')).toBeInTheDocument();
    expect(screen.getByText('GET /server/content/:courseId')).toBeInTheDocument();
  });
});

describe('ProfessorSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct title and description', () => {
    renderWithAuth(<ProfessorSettingsPage />);
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Ajustes del profesor')).toBeInTheDocument();
  });

  it('displays Settings icon', () => {
    renderWithAuth(<ProfessorSettingsPage />);
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('displays settings features', () => {
    renderWithAuth(<ProfessorSettingsPage />);
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    expect(screen.getByText('Preferencias de IA')).toBeInTheDocument();
    expect(screen.getByText('Tema de la interfaz')).toBeInTheDocument();
  });
});

describe('ProfessorStudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct title and description', () => {
    renderWithAuth(<ProfessorStudentsPage />);
    expect(screen.getByText('Estudiantes')).toBeInTheDocument();
    expect(screen.getByText('Monitorea el progreso de tus estudiantes')).toBeInTheDocument();
  });

  it('displays Users icon', () => {
    renderWithAuth(<ProfessorStudentsPage />);
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
  });

  it('displays student-related features', () => {
    renderWithAuth(<ProfessorStudentsPage />);
    expect(screen.getByText('Lista de estudiantes por curso')).toBeInTheDocument();
    expect(screen.getByText('Progreso individual')).toBeInTheDocument();
    expect(screen.getByText('Mastery por topico')).toBeInTheDocument();
    expect(screen.getByText('Rendimiento en quizzes')).toBeInTheDocument();
  });

  it('displays backend routes for students API', () => {
    renderWithAuth(<ProfessorStudentsPage />);
    expect(screen.getByText('GET /server/admin-students')).toBeInTheDocument();
    expect(screen.getByText('GET /server/admin-students/:id/progress')).toBeInTheDocument();
  });
});
