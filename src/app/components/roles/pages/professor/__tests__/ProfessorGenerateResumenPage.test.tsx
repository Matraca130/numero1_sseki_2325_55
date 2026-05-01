// ============================================================
// Tests for ProfessorGenerateResumenPage (M3)
//
// Happy path: fills the form, submits, and asserts that apiCall
// is invoked with the right path, FormData payload, custom
// X-Institution-Id header, and 30s timeout.
// ============================================================
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  createMockInstitution,
  createMockUser,
  screen,
  waitFor,
} from '@/test/test-utils';

// ── Mocks ─────────────────────────────────────────────────

const apiCallMock = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => apiCallMock(...args),
}));

const navigateMock = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// useAuth — professor + selected institution
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: createMockUser(),
    selectedInstitution: createMockInstitution({
      id: 'inst-001',
      role: 'professor',
    }),
    role: 'professor',
  }),
}));

// useCourses — return one active course
vi.mock('@/app/hooks/useCourses', () => ({
  useCourses: () => ({
    data: [{ id: 'course-1', name: 'Quimica 101', description: null }],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

// sonner toast — silence side effects
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// jsdom polyfills required by Radix Select primitives.
beforeEach(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      value: () => false,
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      value: () => {},
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: () => {},
      configurable: true,
    });
  }
});

// Lazy import AFTER mocks are registered
import { ProfessorGenerateResumenPage } from '../ProfessorGenerateResumenPage';

// ── Helpers ──────────────────────────────────────────────

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <ProfessorGenerateResumenPage />
    </QueryClientProvider>,
  );
}

// ── Test ─────────────────────────────────────────────────

describe('ProfessorGenerateResumenPage', () => {
  beforeEach(() => {
    apiCallMock.mockReset();
    navigateMock.mockReset();
  });

  it('submits the form and calls apiCall with FormData + X-Institution-Id', async () => {
    apiCallMock.mockResolvedValueOnce({ run_id: 'run-42', status: 'pending' });

    const user = userEvent.setup();
    renderPage();

    // The form heading renders (h1)
    expect(
      screen.getByRole('heading', { level: 1, name: /generar resumen/i }),
    ).toBeInTheDocument();

    // Topic
    await user.type(
      screen.getByLabelText(/tema/i),
      'Capitulo 3',
    );

    // Subject — open the Radix Select trigger (the button) and pick the
    // only option. Radix renders the trigger as a combobox role.
    await user.click(screen.getByRole('combobox', { name: /curso/i }));
    await user.click(await screen.findByRole('option', { name: 'Quimica 101' }));

    // PDF file
    const file = new File(['%PDF-1.4 fake'], 'resumen.pdf', {
      type: 'application/pdf',
    });
    const fileInput = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    // Submit
    await user.click(screen.getByRole('button', { name: /generar resumen/i }));

    await waitFor(() => expect(apiCallMock).toHaveBeenCalledTimes(1));

    const [path, options] = apiCallMock.mock.calls[0];
    expect(path).toBe('/atlas/generate');
    expect(options.method).toBe('POST');
    expect(options.timeoutMs).toBe(30_000);
    expect(options.headers).toMatchObject({ 'X-Institution-Id': 'inst-001' });

    expect(options.body).toBeInstanceOf(FormData);
    const fd = options.body as FormData;
    expect(fd.get('mode')).toBe('contenido');
    expect(fd.get('topic')).toBe('Capitulo 3');
    expect(fd.get('subject')).toBe('Quimica 101');
    expect(fd.get('generate_images')).toBe('false');
    expect(fd.get('file')).toBeInstanceOf(File);

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        '/professor/mis-generaciones/run-42',
      ),
    );
  });
});
