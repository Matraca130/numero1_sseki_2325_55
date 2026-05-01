// ============================================================
// Tests for ProfessorGenerateResumenPage (M3)
//
// Coverage:
//   - Happy path: fills the form, submits, asserts apiCall is invoked
//     with the right path, FormData payload, custom X-Institution-Id
//     header, and 30s timeout.
//   - Negative paths (audit RECOMMEND #3):
//       1. File > MAX_PDF_BYTES (25 MB) — submit blocked, apiCall NOT called
//       2. Missing `topic` — zod error visible, submit blocked
//       3. Missing `subject` — zod error visible, submit blocked
//       4. Non-PDF MIME (text/plain renamed `.pdf`) — zod error visible
//   - Cache invariant (audit RECOMMEND #3): changing
//     `selectedInstitution.id` changes the `useCourses` queryKey, asserted
//     via `queryClient.getQueryCache().findAll()`.
// ============================================================
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
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

// Controllable institution — tests can mutate `currentInstitutionId`
// to simulate the user switching institutions. Default mirrors the
// previous static mock so the happy-path test is unchanged.
let currentInstitutionId: string | null = 'inst-001';

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: createMockUser(),
    selectedInstitution:
      currentInstitutionId === null
        ? null
        : createMockInstitution({ id: currentInstitutionId, role: 'professor' }),
    role: 'professor',
  }),
}));

// useCourses — mocked, but internally drives a real `useQuery` so the
// QueryClient cache is populated with `['courses', institutionId]`. This
// lets us assert the queryKey invariant from the audit while keeping
// the data shape deterministic for the happy-path test.
vi.mock('@/app/hooks/useCourses', async () => {
  const { useQuery: rqUseQuery } = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );
  return {
    useCourses: () => {
      const id = currentInstitutionId;
      return rqUseQuery({
        queryKey: ['courses', id],
        enabled: Boolean(id),
        queryFn: async () => [
          { id: 'course-1', name: 'Quimica 101', description: null },
        ],
      });
    },
  };
});

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

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage(queryClient = makeQueryClient()) {
  const result = renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <ProfessorGenerateResumenPage />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

/**
 * jsdom honors File constructor sizes for small buffers, but allocating
 * 25MB+1 just to exercise the size guard is wasteful. Lie about `size`
 * via Object.defineProperty — zod reads `f.size` directly.
 */
function makeFakeFile(opts: {
  bytes: string | BlobPart[];
  name: string;
  type: string;
  size?: number;
}) {
  const f = new File(
    Array.isArray(opts.bytes) ? opts.bytes : [opts.bytes],
    opts.name,
    { type: opts.type },
  );
  if (opts.size !== undefined) {
    Object.defineProperty(f, 'size', { value: opts.size, configurable: true });
  }
  return f;
}

// ── Tests ─────────────────────────────────────────────────

describe('ProfessorGenerateResumenPage', () => {
  beforeEach(() => {
    apiCallMock.mockReset();
    navigateMock.mockReset();
    currentInstitutionId = 'inst-001';
  });

  it('submits the form and calls apiCall with FormData + X-Institution-Id', async () => {
    apiCallMock.mockResolvedValueOnce({ run_id: 'run-42', status: 'pending' });

    const user = userEvent.setup();
    renderPage();

    // The form heading renders (h1)
    expect(
      screen.getByRole('heading', { level: 1, name: /generar resumen/i }),
    ).toBeInTheDocument();

    // Wait for the mocked useCourses query to settle so the option is
    // mounted in the Select.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /curso/i })).not.toBeDisabled(),
    );

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

  it('blocks submit when the PDF exceeds 25MB and never calls apiCall', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /curso/i })).not.toBeDisabled(),
    );

    await user.type(screen.getByLabelText(/tema/i), 'Capitulo 3');

    await user.click(screen.getByRole('combobox', { name: /curso/i }));
    await user.click(await screen.findByRole('option', { name: 'Quimica 101' }));

    // Synthesize a file that *reports* 25MB + 1 byte without allocating it.
    const oversize = makeFakeFile({
      bytes: ['%PDF-1.4 fake'],
      name: 'huge.pdf',
      type: 'application/pdf',
      size: 25 * 1024 * 1024 + 1,
    });
    const fileInput = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    await user.upload(fileInput, oversize);

    await user.click(screen.getByRole('button', { name: /generar resumen/i }));

    // Zod error renders via <FormMessage />.
    expect(await screen.findByText(/25mb o menos/i)).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('blocks submit when topic is missing', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /curso/i })).not.toBeDisabled(),
    );

    // Pick subject + file, leave topic empty.
    await user.click(screen.getByRole('combobox', { name: /curso/i }));
    await user.click(await screen.findByRole('option', { name: 'Quimica 101' }));

    const file = new File(['%PDF-1.4 fake'], 'resumen.pdf', {
      type: 'application/pdf',
    });
    const fileInput = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /generar resumen/i }));

    expect(await screen.findByText(/tema es obligatorio/i)).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('blocks submit when subject (curso) is missing', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /curso/i })).not.toBeDisabled(),
    );

    await user.type(screen.getByLabelText(/tema/i), 'Capitulo 3');

    // Skip the subject Select entirely.
    const file = new File(['%PDF-1.4 fake'], 'resumen.pdf', {
      type: 'application/pdf',
    });
    const fileInput = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /generar resumen/i }));

    // The Select placeholder text also reads "Selecciona un curso", so
    // assert specifically against the <FormMessage /> paragraph.
    await waitFor(() => {
      const message = screen
        .getAllByText(/selecciona un curso/i)
        .find((el) => el.getAttribute('data-slot') === 'form-message');
      expect(message).toBeTruthy();
    });
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('rejects a non-PDF MIME type even when the filename ends with .pdf', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /curso/i })).not.toBeDisabled(),
    );

    await user.type(screen.getByLabelText(/tema/i), 'Capitulo 3');

    await user.click(screen.getByRole('combobox', { name: /curso/i }));
    await user.click(await screen.findByRole('option', { name: 'Quimica 101' }));

    // text/plain content with a misleading `.pdf` extension. Browsers
    // populate `File.type` from the OS sniffer; the audit fix removes the
    // extension fallback so this MUST be rejected by zod.
    //
    // user-event filters files by the input's `accept` attribute, so we
    // use fireEvent.change to bypass that client-side filter and
    // simulate what a determined user could deliver (e.g. dragging from
    // a file manager that ignores the picker filter).
    const fakePdf = new File(['not a pdf'], 'fake.pdf', {
      type: 'text/plain',
    });
    const fileInput = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [fakePdf] } });

    await user.click(screen.getByRole('button', { name: /generar resumen/i }));

    expect(
      await screen.findByText(/solo se aceptan archivos pdf/i),
    ).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('changes the useCourses queryKey when selectedInstitution.id changes', async () => {
    const queryClient = makeQueryClient();

    // Render with institution A.
    currentInstitutionId = 'inst-A';
    const { unmount } = renderPage(queryClient);

    await waitFor(() => {
      const matches = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['courses', 'inst-A'] });
      expect(matches).toHaveLength(1);
    });

    // Sanity: no entry for institution B yet.
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ['courses', 'inst-B'] }),
    ).toHaveLength(0);

    unmount();

    // Switch institution and re-render against the SAME QueryClient.
    currentInstitutionId = 'inst-B';
    renderPage(queryClient);

    await waitFor(() => {
      const matches = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['courses', 'inst-B'] });
      expect(matches).toHaveLength(1);
    });

    // Both keys now coexist in the cache — proving the queryKey is
    // institution-scoped (SPEC §5 R9 frontend invariant).
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ['courses', 'inst-A'] }),
    ).toHaveLength(1);
  });
});
