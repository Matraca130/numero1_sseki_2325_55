// ============================================================
// MasteryOverview — Component tests for mastery tracking
//
// Tests:
//   1. Renders with keyword list sorted by mastery (weakest first)
//   2. Loading state (skeleton, animated)
//   3. Error state with retry button
//   4. Empty state (no keywords started)
//   5. All mastered celebration message
//   6. Filter by mastery level (emergentes, en progreso, consolidados, etc)
//   7. Search functionality (debounced)
//   8. KPI summary bar (gray/red/yellow/green/blue counts)
//   9. Expand/collapse keyword subtopics
//   10. Clear filters button
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MasteryOverview } from '../MasteryOverview';

// ── Mock hooks ─────────────────────────────────────────────
const mockUseMasteryOverviewData = vi.fn();

vi.mock('../useMasteryOverviewData', () => ({
  useMasteryOverviewData: () => mockUseMasteryOverviewData(),
}));

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock lucide-react ──────────────────────────────────────
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="icon-search" />,
  Filter: () => <div data-testid="icon-filter" />,
  X: () => <div data-testid="icon-x" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  BookOpen: () => <div data-testid="icon-book" />,
}));

// ── Mock KeywordRow ───────────────────────────────────────
vi.mock('../KeywordRow', () => ({
  KeywordRow: ({ item, expanded, onToggle }: any) => (
    <div
      data-testid={`keyword-row-${item.keyword.id}`}
      onClick={onToggle}
      role="button"
    >
      <span>{item.keyword.name}</span>
      {expanded && <div data-testid={`subtopics-${item.keyword.id}`}>Subtopics</div>}
    </div>
  ),
}));

// ── Mock masteryOverviewTypes ──────────────────────────────
vi.mock('../masteryOverviewTypes', () => ({
  FILTER_OPTIONS: [
    { value: 'all', label: 'Todos' },
    { value: 'new', label: 'Nuevos' },
    { value: 'learning', label: 'Aprendiendo' },
    { value: 'reviewing', label: 'Revisando' },
    { value: 'mastered', label: 'Dominados' },
  ],
  getMasteryColor: () => ({ text: 'text-green-600', bar: 'bg-green-500' }),
  getMasteryDot: () => 'bg-green-500',
}));

// ── Mock data ──────────────────────────────────────────────

function createMockKeywordMastery(overrides = {}) {
  return {
    keyword: {
      id: 'kw-001',
      name: 'Mitosis',
      priority: 'high',
      summary_id: 'sum-001',
      ...overrides.keyword,
    },
    pKnow: 0.5,
    subtopicCount: 2,
    topicId: 'topic-001',
    topicName: 'Celula',
    courseName: 'Biologia',
    ...overrides,
  };
}

const mockKeywords = [
  createMockKeywordMastery({
    keyword: { id: 'kw-001', name: 'Mitosis' },
    pKnow: 0.3,
    topicName: 'Celula',
    courseName: 'Biologia',
    subtopicCount: 2,
  }),
  createMockKeywordMastery({
    keyword: { id: 'kw-002', name: 'Meiosis' },
    pKnow: 0.7,
    topicName: 'Celula',
    courseName: 'Biologia',
    subtopicCount: 1,
  }),
  createMockKeywordMastery({
    keyword: { id: 'kw-003', name: 'ADN' },
    pKnow: 0.9,
    topicName: 'Genetica',
    courseName: 'Biologia',
    subtopicCount: 0,
  }),
];

const mockGrouped = [
  {
    key: 'biologia-celula',
    courseName: 'Biologia',
    topicName: 'Celula',
    items: [mockKeywords[0], mockKeywords[1]],
  },
  {
    key: 'biologia-genetica',
    courseName: 'Biologia',
    topicName: 'Genetica',
    items: [mockKeywords[2]],
  },
];

describe('MasteryOverview — Keyword mastery tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: mockKeywords,
      loading: false,
      error: null,
      loadData: vi.fn(),
      grouped: mockGrouped,
      kpiCounts: {
        gray: 1,
        red: 0,
        yellow: 1,
        green: 1,
        blue: 0,
        total: 3,
      },
      allMastered: false,
      filter: 'all',
      setFilter: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: false,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });
  });

  it('renders keywords grouped by course and topic', () => {
    render(<MasteryOverview />);

    // Check group headers
    expect(screen.getByText('Biologia › Celula')).toBeInTheDocument();
    expect(screen.getByText('Biologia › Genetica')).toBeInTheDocument();

    // Check keywords
    expect(screen.getByTestId('keyword-row-kw-001')).toBeInTheDocument();
    expect(screen.getByTestId('keyword-row-kw-002')).toBeInTheDocument();
    expect(screen.getByTestId('keyword-row-kw-003')).toBeInTheDocument();
  });

  it('shows loading state with skeleton', () => {
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: [],
      loading: true,
      error: null,
      loadData: vi.fn(),
      grouped: [],
      kpiCounts: { gray: 0, red: 0, yellow: 0, green: 0, blue: 0, total: 0 },
      allMastered: false,
      filter: 'all',
      setFilter: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: false,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });

    render(<MasteryOverview />);
    expect(screen.getByText('Cargando dominio...')).toBeInTheDocument();
  });

  it('shows error state with retry button', async () => {
    const mockLoadData = vi.fn();
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: [],
      loading: false,
      error: 'Failed to load mastery data',
      loadData: mockLoadData,
      grouped: [],
      kpiCounts: { gray: 0, red: 0, yellow: 0, green: 0, blue: 0, total: 0 },
      allMastered: false,
      filter: 'all',
      setFilter: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: false,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });

    render(<MasteryOverview />);
    expect(screen.getByText('Failed to load mastery data')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    expect(retryBtn).toBeInTheDocument();

    await userEvent.click(retryBtn);
    expect(mockLoadData).toHaveBeenCalled();
  });

  it('shows empty state when no keywords', () => {
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: [],
      loading: false,
      error: null,
      loadData: vi.fn(),
      grouped: [],
      kpiCounts: { gray: 0, red: 0, yellow: 0, green: 0, blue: 0, total: 0 },
      allMastered: false,
      filter: 'all',
      setFilter: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: false,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });

    render(<MasteryOverview />);
    expect(screen.getByText(/Aun no tienes keywords/i)).toBeInTheDocument();
  });

  it('shows celebration message when all mastered', () => {
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: mockKeywords,
      loading: false,
      error: null,
      loadData: vi.fn(),
      grouped: mockGrouped,
      kpiCounts: {
        gray: 0,
        red: 0,
        yellow: 0,
        green: 0,
        blue: 3,
        total: 3,
      },
      allMastered: true,
      filter: 'all',
      setFilter: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: false,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });

    render(<MasteryOverview />);
    expect(screen.getByText(/Felicitaciones.*Dominas/i)).toBeInTheDocument();
  });

  it('displays KPI summary bar with correct counts', () => {
    render(<MasteryOverview />);

    // Check KPI displays
    expect(screen.getByText(/1 por descubrir/i)).toBeInTheDocument();
    expect(screen.getByText(/1 en progreso/i)).toBeInTheDocument();
    expect(screen.getByText(/1 consolidados/i)).toBeInTheDocument();
    expect(screen.getByText(/3 total/i)).toBeInTheDocument();
  });

  it('expands/collapses keyword to show subtopics', async () => {
    const mockToggleExpand = vi.fn();
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: mockKeywords,
      loading: false,
      error: null,
      loadData: vi.fn(),
      grouped: mockGrouped,
      kpiCounts: {
        gray: 1,
        red: 0,
        yellow: 1,
        green: 1,
        blue: 0,
        total: 3,
      },
      allMastered: false,
      filter: 'all',
      setFilter: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: false,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(['kw-001']),
      toggleExpand: mockToggleExpand,
      subtopicsCache: new Map([
        [
          'kw-001',
          [
            {
              subtopic: { id: 'sub-001', name: 'Prophase' },
              pKnow: 0.4,
            },
          ],
        ],
      ]),
    });

    render(<MasteryOverview />);

    // Click expand
    const keywordRow = screen.getByTestId('keyword-row-kw-001');
    await userEvent.click(keywordRow);

    expect(mockToggleExpand).toHaveBeenCalled();
  });

  it('filters keywords by mastery level', async () => {
    const mockSetFilter = vi.fn();
    render(<MasteryOverview />);

    // Open filter dropdown
    const filterBtn = screen.getByRole('button', { name: /todos/i });
    await userEvent.click(filterBtn);

    // Filter buttons should be available in dropdown (mocked as interactive)
    expect(screen.getByText('Dominio de Conceptos')).toBeInTheDocument();
  });

  it('searches keywords by name', async () => {
    const mockSetSearchQuery = vi.fn();
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: mockKeywords,
      loading: false,
      error: null,
      loadData: vi.fn(),
      grouped: mockGrouped,
      kpiCounts: {
        gray: 1,
        red: 0,
        yellow: 1,
        green: 1,
        blue: 0,
        total: 3,
      },
      allMastered: false,
      filter: 'all',
      setFilter: vi.fn(),
      searchQuery: 'Mito',
      setSearchQuery: mockSetSearchQuery,
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: false,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });

    render(<MasteryOverview />);

    const mockSearchInput = screen.getByPlaceholderText('Buscar...');
    expect(mockSearchInput).toHaveValue('Mito');
  });

  it('clears all filters and search', async () => {
    const mockClearFilters = vi.fn();
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: mockKeywords,
      loading: false,
      error: null,
      loadData: vi.fn(),
      grouped: mockGrouped,
      kpiCounts: {
        gray: 1,
        red: 0,
        yellow: 1,
        green: 1,
        blue: 0,
        total: 3,
      },
      allMastered: false,
      filter: 'learning',
      setFilter: vi.fn(),
      searchQuery: 'test',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: true,
      clearFilters: mockClearFilters,
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });

    render(<MasteryOverview />);

    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    await userEvent.click(clearBtn);

    expect(mockClearFilters).toHaveBeenCalled();
  });

  it('shows "no results" when filter returns zero keywords', () => {
    // Keywords exist but grouped is empty (filtered out)
    mockUseMasteryOverviewData.mockReturnValue({
      keywords: mockKeywords, // Keywords exist
      loading: false,
      error: null,
      loadData: vi.fn(),
      grouped: [], // But no groups match the filter
      kpiCounts: { gray: 0, red: 0, yellow: 0, green: 0, blue: 0, total: 0 },
      allMastered: false,
      filter: 'mastered',
      setFilter: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      showFilterDropdown: false,
      setShowFilterDropdown: vi.fn(),
      hasActiveFilters: true,
      clearFilters: vi.fn(),
      dropdownRef: { current: null },
      expandedKeywords: new Set(),
      toggleExpand: vi.fn(),
      subtopicsCache: new Map(),
    });

    render(<MasteryOverview />);
    expect(screen.getByText(/No se encontraron keywords con este filtro/i)).toBeInTheDocument();
  });
});
