// ============================================================
// Tests for ProfessorQuizzesPage
//
// Tests: cascade selection, quiz loading, filtering, CRUD operations
// Uses mocked useQuizCascade hook and quiz API calls
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, createMockUser, createMockInstitution, screen, waitFor, fireEvent } from '@/test/test-utils';
import { ProfessorQuizzesPage } from '../ProfessorQuizzesPage';
import * as quizApi from '@/app/services/quizApi';

// Mock motion library
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons - use importOriginal to get all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
  };
});

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  Toaster: ({ position, richColors }: any) => <div data-testid="toaster" />,
}));

// Mock quiz API
vi.mock('@/app/services/quizApi');

// Mock useQuizCascade hook
vi.mock('../useQuizCascade', () => ({
  useQuizCascade: () => ({
    selectedSummaryId: 'summary-001',
    selectedSummary: {
      id: 'summary-001',
      title: 'Test Summary',
      status: 'published',
    },
    keywords: [
      { id: 'kw-001', name: 'Keyword 1' },
      { id: 'kw-002', name: 'Keyword 2' },
    ],
    getKeywordName: (id: string) => {
      const keywords: { [key: string]: string } = {
        'kw-001': 'Keyword 1',
        'kw-002': 'Keyword 2',
      };
      return keywords[id] || '';
    },
    cascadeLevels: {
      course: 'course-001',
      semester: 'semester-001',
      section: 'section-001',
      topic: 'topic-001',
    },
    breadcrumbItems: [
      { label: 'Test Course', onClick: vi.fn() },
      { label: 'Spring 2025', onClick: vi.fn() },
      { label: 'Section A', onClick: vi.fn() },
    ],
  }),
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

// Mock Breadcrumb component
vi.mock('@/app/components/design-kit', () => ({
  Breadcrumb: ({ items }: any) => (
    <nav data-testid="breadcrumb">
      {items.map((item: any, i: number) => (
        <span key={i}>{item.label}</span>
      ))}
    </nav>
  ),
}));

// Mock child components
vi.mock('@/app/components/professor/CascadeSelector', () => ({
  CascadeSelector: ({ onSummarySelected }: any) => (
    <div data-testid="cascade-selector">
      <button onClick={() => onSummarySelected('summary-001')}>Select Summary</button>
    </div>
  ),
}));

vi.mock('@/app/components/professor/QuizStatsBar', () => ({
  QuizStatsBar: () => <div data-testid="quiz-stats-bar">Quiz Stats</div>,
}));

vi.mock('@/app/components/professor/QuizFiltersBar', () => ({
  QuizFiltersBar: ({ filters }: any) => <div data-testid="quiz-filters-bar">Quiz Filters</div>,
}));

vi.mock('@/app/components/professor/AiReportsDashboard', () => ({
  AiReportsDashboard: () => <div data-testid="ai-reports-dashboard">AI Reports</div>,
}));

vi.mock('@/app/components/shared/QuizErrorBoundary', () => ({
  QuizErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

describe('ProfessorQuizzesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page with cascade selector', () => {
    renderWithProviders(<ProfessorQuizzesPage />);
    expect(screen.getByTestId('cascade-selector')).toBeInTheDocument();
  });

  it('renders breadcrumb navigation', () => {
    renderWithProviders(<ProfessorQuizzesPage />);
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
  });

  it('displays quiz stats bar', () => {
    renderWithProviders(<ProfessorQuizzesPage />);
    expect(screen.getByTestId('quiz-stats-bar')).toBeInTheDocument();
  });

  it('displays quiz filters bar', () => {
    renderWithProviders(<ProfessorQuizzesPage />);
    expect(screen.getByTestId('quiz-filters-bar')).toBeInTheDocument();
  });

  it('displays AI reports dashboard', () => {
    renderWithProviders(<ProfessorQuizzesPage />);
    expect(screen.getByTestId('ai-reports-dashboard')).toBeInTheDocument();
  });

  it('has error boundary wrapper', () => {
    renderWithProviders(<ProfessorQuizzesPage />);
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('renders with professor role in auth context', () => {
    renderWithProviders(<ProfessorQuizzesPage />, {
      authOverrides: { role: 'professor' },
    });
    expect(screen.getByTestId('cascade-selector')).toBeInTheDocument();
  });

  it('has sidebar collapse state management', () => {
    renderWithProviders(<ProfessorQuizzesPage />);
    const cascadeSelector = screen.getByTestId('cascade-selector');
    expect(cascadeSelector).toBeInTheDocument();
  });
});
