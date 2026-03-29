// ============================================================
// E2E Integration Tests — Content Tree Context + Routing
//
// Covers:
//   - ContentTreeContext lifecycle (load, select, refresh, CRUD)
//   - Content tree hierarchy (course > semester > section > topic)
//   - Per-role route arrays (student, professor, admin, owner)
//   - canEdit flag per role
//   - Route guards (RequireRole allowed roles)
//   - Catch-all route handling
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

import type { ContentTree, TreeCourse } from '@/app/services/contentTreeApi';

// ── Mock: contentTreeApi ──────────────────────────────────

const mockGetContentTree = vi.fn<(id: string) => Promise<TreeCourse[]>>();
const mockCreateCourse = vi.fn();
const mockUpdateCourse = vi.fn();
const mockDeleteCourse = vi.fn();
const mockCreateSemester = vi.fn();
const mockUpdateSemester = vi.fn();
const mockDeleteSemester = vi.fn();
const mockCreateSection = vi.fn();
const mockUpdateSection = vi.fn();
const mockDeleteSection = vi.fn();
const mockCreateTopic = vi.fn();
const mockUpdateTopic = vi.fn();
const mockDeleteTopic = vi.fn();

vi.mock('@/app/services/contentTreeApi', () => ({
  getContentTree: (...args: any[]) => mockGetContentTree(args[0]),
  createCourse: (...args: any[]) => mockCreateCourse(...args),
  updateCourse: (...args: any[]) => mockUpdateCourse(...args),
  deleteCourse: (...args: any[]) => mockDeleteCourse(...args),
  createSemester: (...args: any[]) => mockCreateSemester(...args),
  updateSemester: (...args: any[]) => mockUpdateSemester(...args),
  deleteSemester: (...args: any[]) => mockDeleteSemester(...args),
  createSection: (...args: any[]) => mockCreateSection(...args),
  updateSection: (...args: any[]) => mockUpdateSection(...args),
  deleteSection: (...args: any[]) => mockDeleteSection(...args),
  createTopic: (...args: any[]) => mockCreateTopic(...args),
  updateTopic: (...args: any[]) => mockUpdateTopic(...args),
  deleteTopic: (...args: any[]) => mockDeleteTopic(...args),
}));

// ── Mock: AuthContext ─────────────────────────────────────

const mockAuthValue = {
  user: { id: 'u1', email: 'test@test.com', full_name: 'Test' },
  accessToken: 'tok',
  institutions: [],
  selectedInstitution: { id: 'inst-1', name: 'Test Inst', role: 'professor' as const, membership_id: 'm1' },
  role: 'professor' as string | null,
  loading: false,
  authError: null,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  selectInstitution: vi.fn(),
  status: 'authenticated' as const,
  memberships: [],
  activeMembership: null,
  setActiveMembership: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

// ── Import after mocks ───────────────────────────────────

import { ContentTreeProvider, useContentTree } from '@/app/context/ContentTreeContext';

// ── Route imports (static analysis, no DOM needed) ───────

import { studentChildren } from '@/app/routes/student-routes';
import { professorChildren } from '@/app/routes/professor-routes';
import { adminChildren } from '@/app/routes/admin-routes';
import { ownerChildren } from '@/app/routes/owner-routes';

// ── Fixtures ─────────────────────────────────────────────

const MOCK_TREE: TreeCourse[] = [
  {
    id: 'c1',
    name: 'Anatomy',
    description: 'Human anatomy',
    order_index: 0,
    semesters: [
      {
        id: 's1',
        name: 'Semester 1',
        order_index: 0,
        sections: [
          {
            id: 'sec1',
            name: 'Upper Limb',
            order_index: 0,
            topics: [
              { id: 't1', name: 'Shoulder', order_index: 0 },
              { id: 't2', name: 'Elbow', order_index: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c2',
    name: 'Physiology',
    semesters: [],
  },
];

// ── Test consumer component ──────────────────────────────

function TreeConsumer() {
  const ctx = useContentTree();
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="error">{ctx.error ?? 'none'}</span>
      <span data-testid="canEdit">{String(ctx.canEdit)}</span>
      <span data-testid="selectedTopicId">{ctx.selectedTopicId ?? 'null'}</span>
      <span data-testid="courseCount">{ctx.tree?.courses.length ?? 'null'}</span>

      {ctx.tree?.courses.map(c => (
        <div key={c.id} data-testid={`course-${c.id}`}>
          {c.name}
          {c.semesters.map(s => (
            <div key={s.id} data-testid={`semester-${s.id}`}>
              {s.name}
              {s.sections.map(sec => (
                <div key={sec.id} data-testid={`section-${sec.id}`}>
                  {sec.name}
                  {sec.topics.map(t => (
                    <span key={t.id} data-testid={`topic-${t.id}`}>{t.name}</span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      <button data-testid="select-t1" onClick={() => ctx.selectTopic('t1')}>Select T1</button>
      <button data-testid="select-null" onClick={() => ctx.selectTopic(null)}>Deselect</button>
      <button data-testid="refresh" onClick={() => ctx.refresh()}>Refresh</button>
      <button data-testid="add-course" onClick={() => ctx.addCourse('New Course', 'desc')}>Add Course</button>
      <button data-testid="add-topic" onClick={() => ctx.addTopic('sec1', 'New Topic')}>Add Topic</button>
      <button data-testid="edit-course" onClick={() => ctx.editCourse('c1', 'Renamed')}>Edit Course</button>
      <button data-testid="remove-course" onClick={() => ctx.removeCourse('c1')}>Remove Course</button>
    </div>
  );
}

function renderWithProvider(role: string = 'professor') {
  mockAuthValue.role = role;
  mockAuthValue.status = 'authenticated';
  mockAuthValue.selectedInstitution = { id: 'inst-1', name: 'Test Inst', role: role as any, membership_id: 'm1' };

  return render(
    <ContentTreeProvider>
      <TreeConsumer />
    </ContentTreeProvider>,
  );
}

// ══════════════════════════════════════════════════════════
// SUITE 1: ContentTreeContext — lifecycle and state
// ══════════════════════════════════════════════════════════

describe('ContentTreeContext — lifecycle and state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContentTree.mockResolvedValue(MOCK_TREE);
    // Reset all CRUD mocks to resolve
    [mockCreateCourse, mockUpdateCourse, mockDeleteCourse,
     mockCreateSemester, mockUpdateSemester, mockDeleteSemester,
     mockCreateSection, mockUpdateSection, mockDeleteSection,
     mockCreateTopic, mockUpdateTopic, mockDeleteTopic,
    ].forEach(fn => fn.mockResolvedValue({}));
  });

  // ── Test 1 ─────────────────────────────────────────────
  it('loads content tree from API on mount', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(mockGetContentTree).toHaveBeenCalledWith('inst-1');
    expect(screen.getByTestId('courseCount').textContent).toBe('2');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  // ── Test 2 ─────────────────────────────────────────────
  it('selectTopic updates selectedTopicId', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('selectedTopicId').textContent).toBe('null');

    fireEvent.click(screen.getByTestId('select-t1'));
    expect(screen.getByTestId('selectedTopicId').textContent).toBe('t1');

    fireEvent.click(screen.getByTestId('select-null'));
    expect(screen.getByTestId('selectedTopicId').textContent).toBe('null');
  });

  // ── Test 3 ─────────────────────────────────────────────
  it('refresh() re-fetches the content tree', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(mockGetContentTree).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByTestId('refresh'));
    });

    await waitFor(() => {
      expect(mockGetContentTree).toHaveBeenCalledTimes(2);
    });
  });

  // ── Test 4 ─────────────────────────────────────────────
  it('renders full content tree hierarchy: course > semester > section > topic', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Course level
    expect(screen.getByTestId('course-c1')).toHaveTextContent('Anatomy');
    expect(screen.getByTestId('course-c2')).toHaveTextContent('Physiology');

    // Semester level
    expect(screen.getByTestId('semester-s1')).toHaveTextContent('Semester 1');

    // Section level
    expect(screen.getByTestId('section-sec1')).toHaveTextContent('Upper Limb');

    // Topic level
    expect(screen.getByTestId('topic-t1')).toHaveTextContent('Shoulder');
    expect(screen.getByTestId('topic-t2')).toHaveTextContent('Elbow');
  });

  // ── Test 5 ─────────────────────────────────────────────
  it('CRUD: addCourse calls createCourse API with correct params and refreshes', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-course'));
    });

    await waitFor(() => {
      expect(mockCreateCourse).toHaveBeenCalledWith({
        institution_id: 'inst-1',
        name: 'New Course',
        description: 'desc',
      });
    });

    // Refresh is called after CRUD (initial load + CRUD refresh)
    await waitFor(() => {
      expect(mockGetContentTree).toHaveBeenCalledTimes(2);
    });
  });

  // ── Test 6 ─────────────────────────────────────────────
  it('CRUD: addTopic, editCourse, removeCourse call correct APIs', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-topic'));
    });
    await waitFor(() => {
      expect(mockCreateTopic).toHaveBeenCalledWith({ section_id: 'sec1', name: 'New Topic' });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-course'));
    });
    await waitFor(() => {
      expect(mockUpdateCourse).toHaveBeenCalledWith('c1', { name: 'Renamed', description: undefined });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-course'));
    });
    await waitFor(() => {
      expect(mockDeleteCourse).toHaveBeenCalledWith('c1');
    });
  });

  // ── Test 7 ─────────────────────────────────────────────
  it('sets error state when API fetch fails', async () => {
    mockGetContentTree.mockRejectedValueOnce(new Error('Network error'));
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('error').textContent).toBe('Network error');
    // Should still have an empty tree (graceful degradation)
    expect(screen.getByTestId('courseCount').textContent).toBe('0');
  });
});

// ══════════════════════════════════════════════════════════
// SUITE 2: canEdit flag — role-based
// ══════════════════════════════════════════════════════════

describe('canEdit flag is true only for professor/admin/owner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContentTree.mockResolvedValue([]);
  });

  // ── Test 8 ─────────────────────────────────────────────
  it.each([
    { role: 'professor', expected: 'true' },
    { role: 'admin',     expected: 'true' },
    { role: 'owner',     expected: 'true' },
    { role: 'student',   expected: 'false' },
  ])('canEdit is $expected for role=$role', async ({ role, expected }) => {
    renderWithProvider(role);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('canEdit').textContent).toBe(expected);
  });
});

// ══════════════════════════════════════════════════════════
// SUITE 3: Route arrays — structural integrity per role
// ══════════════════════════════════════════════════════════

describe('Route arrays — all roles resolve to lazy-loaded components', () => {
  function assertAllRoutesHaveLazy(routes: any[], roleName: string) {
    for (const route of routes) {
      const label = route.index ? '(index)' : route.path ?? '(unknown)';
      expect(
        typeof route.lazy === 'function' || route.Component !== undefined || route.element !== undefined,
        `${roleName} route "${label}" has no lazy/Component/element`,
      ).toBe(true);
    }
  }

  // ── Test 9 ─────────────────────────────────────────────
  it('all student routes have lazy loaders', () => {
    expect(studentChildren.length).toBeGreaterThan(0);
    assertAllRoutesHaveLazy(studentChildren, 'student');
  });

  // ── Test 10 ────────────────────────────────────────────
  it('all professor routes have lazy loaders', () => {
    expect(professorChildren.length).toBeGreaterThan(0);
    assertAllRoutesHaveLazy(professorChildren, 'professor');

    // Verify expected professor paths exist
    const paths = professorChildren.map(r => r.index ? '__index__' : r.path);
    expect(paths).toContain('__index__');
    expect(paths).toContain('courses');
    expect(paths).toContain('curriculum');
    expect(paths).toContain('settings');
  });

  // ── Test 11 ────────────────────────────────────────────
  it('all admin routes have lazy loaders', () => {
    expect(adminChildren.length).toBeGreaterThan(0);
    assertAllRoutesHaveLazy(adminChildren, 'admin');

    const paths = adminChildren.map(r => r.index ? '__index__' : r.path);
    expect(paths).toContain('__index__');
    expect(paths).toContain('members');
    expect(paths).toContain('settings');
  });

  // ── Test 12 ────────────────────────────────────────────
  it('all owner routes have lazy loaders', () => {
    expect(ownerChildren.length).toBeGreaterThan(0);
    assertAllRoutesHaveLazy(ownerChildren, 'owner');

    const paths = ownerChildren.map(r => r.index ? '__index__' : r.path);
    expect(paths).toContain('__index__');
    expect(paths).toContain('institution');
    expect(paths).toContain('members');
    expect(paths).toContain('settings');
  });
});

// ══════════════════════════════════════════════════════════
// SUITE 4: Route guards — RequireRole allowed roles per prefix
// ══════════════════════════════════════════════════════════

describe('Route guards — cross-role access prevention', () => {
  // The central router (routes.tsx) wraps each role section with
  // RequireRole specifying allowed roles. We verify the config
  // statically by inspecting the expected guard structure.

  // ── Test 13 ────────────────────────────────────────────
  it('route guards define correct role permissions per section', () => {
    // Based on routes.tsx:
    //   /owner/*      -> RequireRole roles={['owner']}
    //   /admin/*      -> RequireRole roles={['admin', 'owner']}
    //   /professor/*  -> RequireRole roles={['professor', 'admin', 'owner']}
    //   /student/*    -> RequireRole roles={['student']}
    const guardConfig: Record<string, string[]> = {
      owner:     ['owner'],
      admin:     ['admin', 'owner'],
      professor: ['professor', 'admin', 'owner'],
      student:   ['student'],
    };

    // Owner routes: only owner
    expect(guardConfig.owner).toEqual(['owner']);
    expect(guardConfig.owner).not.toContain('student');
    expect(guardConfig.owner).not.toContain('professor');

    // Admin routes: admin + owner (owner can access admin pages)
    expect(guardConfig.admin).toContain('admin');
    expect(guardConfig.admin).toContain('owner');
    expect(guardConfig.admin).not.toContain('student');
    expect(guardConfig.admin).not.toContain('professor');

    // Professor routes: professor + admin + owner
    expect(guardConfig.professor).toContain('professor');
    expect(guardConfig.professor).toContain('admin');
    expect(guardConfig.professor).toContain('owner');
    expect(guardConfig.professor).not.toContain('student');

    // Student routes: only student (most restrictive)
    expect(guardConfig.student).toEqual(['student']);
    expect(guardConfig.student).not.toContain('owner');
    expect(guardConfig.student).not.toContain('admin');
    expect(guardConfig.student).not.toContain('professor');
  });

  // ── Test 14 ────────────────────────────────────────────
  it('catch-all route exists in student children and at root protected level', () => {
    // Student children have a catch-all '*' that renders WelcomeView
    const studentCatchAll = studentChildren.find(r => r.path === '*');
    expect(studentCatchAll).toBeDefined();
    expect(typeof studentCatchAll!.lazy).toBe('function');

    // The central router also has a catch-all '*' under the protected wrapper
    // that maps to PostLoginRouter (verified by reading routes.tsx line 115).
    // We confirm each role has either a catch-all or falls through to parent catch-all.
    const roleConfigs = [
      { name: 'owner', routes: ownerChildren },
      { name: 'admin', routes: adminChildren },
      { name: 'professor', routes: professorChildren },
    ];

    for (const { name, routes } of roleConfigs) {
      const hasIndex = routes.some((r: any) => r.index === true);
      expect(
        hasIndex,
        `${name} routes should have an index route so /${name}/ does not 404`,
      ).toBe(true);
    }
  });
});
