// ============================================================
// Tests for ProfessorDashboardPage
//
// Renders placeholder page with professor auth context
// Verifies title, description, icon, features, and backend routes
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithAuth, createMockUser, createMockInstitution, screen } from '@/test/test-utils';
import { ProfessorDashboardPage } from '../ProfessorDashboardPage';

// Mock the motion library to avoid animation timing issues in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: ({ size, ...props }: any) => <div data-testid="layout-dashboard-icon" {...props} />,
  Construction: ({ size, ...props }: any) => <div data-testid="construction-icon" {...props} />,
  CalendarDays: ({ size, ...props }: any) => <div data-testid="calendar-days-icon" {...props} />,
}));

// Mock useAuth to return professor role
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: createMockUser(),
    selectedInstitution: createMockInstitution({ role: 'professor' }),
    role: 'professor',
    activeMembership: { role: 'professor', institution: { name: 'Test Uni', slug: 'test-uni' } },
  }),
}));

describe('ProfessorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with professor auth context', () => {
    renderWithAuth(<ProfessorDashboardPage />);
    expect(screen.getByText('Dashboard del Profesor')).toBeInTheDocument();
  });

  it('displays the correct title and description', () => {
    renderWithAuth(<ProfessorDashboardPage />);
    expect(screen.getByText('Dashboard del Profesor')).toBeInTheDocument();
    expect(screen.getByText(/Visión general: cursos, estudiantes, contenido creado/)).toBeInTheDocument();
  });

  it('renders the dashboard icon', () => {
    renderWithAuth(<ProfessorDashboardPage />);
    expect(screen.getByTestId('layout-dashboard-icon')).toBeInTheDocument();
  });

  it('displays all planned features', () => {
    renderWithAuth(<ProfessorDashboardPage />);
    expect(screen.getByText('Cursos activos')).toBeInTheDocument();
    expect(screen.getByText('Estudiantes inscritos')).toBeInTheDocument();
    expect(screen.getByText('Flashcards creadas vs aprobadas')).toBeInTheDocument();
    expect(screen.getByText('Rendimiento promedio de estudiantes')).toBeInTheDocument();
    expect(screen.getByText('Reviews pendientes')).toBeInTheDocument();
    expect(screen.getByText('Proximos quizzes programados')).toBeInTheDocument();
  });

  it('displays all backend route references', () => {
    renderWithAuth(<ProfessorDashboardPage />);
    expect(screen.getByText('GET /server/flashcards/stats')).toBeInTheDocument();
    expect(screen.getByText('GET /server/quiz/stats')).toBeInTheDocument();
    expect(screen.getByText('GET /server/admin-students')).toBeInTheDocument();
  });

  it('displays construction icon in features section', () => {
    renderWithAuth(<ProfessorDashboardPage />);
    expect(screen.getByTestId('construction-icon')).toBeInTheDocument();
  });

  it('displays context card with user and institution info', () => {
    renderWithAuth(<ProfessorDashboardPage />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@axon.edu')).toBeInTheDocument();
  });
});
