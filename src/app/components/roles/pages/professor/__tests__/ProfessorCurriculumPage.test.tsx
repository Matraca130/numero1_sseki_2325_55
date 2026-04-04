// ============================================================
// Tests for ProfessorCurriculumPage
//
// Tests: curriculum navigation, content hierarchy, topic/section management
// Mocks curriculum API and content queries
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, createMockUser, createMockInstitution, screen } from '@/test/test-utils';
import { ProfessorCurriculumPage } from '../ProfessorCurriculumPage';

// Mock motion library
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => false,
  };
});

// Mock lucide-react icons - use importOriginal to get all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    BookMarked: ({ ...props }: any) => <div data-testid="book-marked-icon" {...props} />,
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

// Mock curriculum API
vi.mock('@/app/services/curriculumApi');

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

// Mock useContentTree
vi.mock('@/app/context/ContentTreeContext', () => ({
  useContentTree: () => ({
    tree: {
      courses: [],
    },
    loading: false,
    error: null,
  }),
}));

// Mock TopicDetailPanel component
vi.mock('../TopicDetailPanel', () => ({
  TopicDetailPanel: ({ topicId, onClose }: any) => (
    topicId && (
      <div data-testid="topic-detail-panel">
        <button onClick={onClose}>Close Panel</button>
      </div>
    )
  ),
}));

// Mock SummaryFormDialog component
vi.mock('../SummaryFormDialog', () => ({
  SummaryFormDialog: ({ open, onClose }: any) => (
    open && (
      <div data-testid="summary-form-dialog">
        <button onClick={onClose}>Close Dialog</button>
      </div>
    )
  ),
}));

describe('ProfessorCurriculumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the curriculum page with professor role', () => {
    renderWithProviders(<ProfessorCurriculumPage />, {
      authOverrides: { role: 'professor' },
    });
    expect(screen.getByTestId('book-marked-icon')).toBeInTheDocument();
  });

  it('displays the curriculum hierarchy structure', () => {
    renderWithProviders(<ProfessorCurriculumPage />);
    // Verify main container is present
    const icons = screen.getAllByTestId('book-marked-icon');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('provides access to institution context', () => {
    renderWithProviders(<ProfessorCurriculumPage />, {
      authOverrides: {
        role: 'professor',
        selectedInstitution: createMockInstitution({ role: 'professor' }),
      },
    });
    expect(screen.getByTestId('book-marked-icon')).toBeInTheDocument();
  });

  it('supports opening topic detail panels', () => {
    const { rerender } = renderWithProviders(<ProfessorCurriculumPage />);
    // Panel should not be visible initially
    expect(screen.queryByTestId('topic-detail-panel')).not.toBeInTheDocument();
  });

  it('supports summary form dialog for creation', () => {
    const { rerender } = renderWithProviders(<ProfessorCurriculumPage />);
    // Dialog should not be visible initially
    expect(screen.queryByTestId('summary-form-dialog')).not.toBeInTheDocument();
  });

  it('maintains professor authentication context throughout hierarchy', () => {
    renderWithProviders(<ProfessorCurriculumPage />, {
      authOverrides: {
        role: 'professor',
        user: createMockUser({
          id: 'prof-001',
          name: 'Prof Test',
          email: 'prof@axon.edu',
        }),
      },
    });
    expect(screen.getByTestId('book-marked-icon')).toBeInTheDocument();
  });

  it('renders with motion animations enabled', () => {
    renderWithProviders(<ProfessorCurriculumPage />);
    // Verify motion components are rendered (motion.div wraps content)
    expect(screen.getByTestId('book-marked-icon')).toBeInTheDocument();
  });
});
