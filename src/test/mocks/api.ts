// ============================================================
// Axon — Shared API Mocks
//
// Helpers for mocking apiCall and apiCallStream from @/app/lib/api.
// Pattern follows quiz-api-contracts.test.ts: mock the module
// BEFORE importing API consumers.
//
// Usage:
//   const { mockApiCall, mockApiCallStream } = createApiMocks();
//   vi.mock('@/app/lib/api', () => ({
//     apiCall: (...args: unknown[]) => mockApiCall(...args),
//     apiCallStream: (...args: unknown[]) => mockApiCallStream(...args),
//     API_BASE: 'https://mock.supabase.co/functions/v1/server',
//     ANON_KEY: 'mock-anon-key',
//     setAccessToken: vi.fn(),
//     getAccessToken: vi.fn(),
//     ensureGeneralKeyword: vi.fn(),
//   }));
// ============================================================

/**
 * Create fresh mock functions for apiCall and apiCallStream.
 * Returns mockApiCall and mockApiCallStream — both are vi.fn()
 * instances that can be configured per test.
 *
 * @param defaultResponse Default resolved value for apiCall (default: [])
 */
export function createApiMocks(defaultResponse: unknown = []) {
  const mockApiCall = vi.fn().mockResolvedValue(defaultResponse);

  // apiCallStream returns an async generator. Default yields nothing.
  const mockApiCallStream = vi.fn().mockImplementation(
    async function* () {
      // noop generator — tests override with mockImplementation as needed
    },
  );

  return { mockApiCall, mockApiCallStream };
}

/**
 * Configure mockApiCall to return different values based on the URL path.
 *
 * @example
 *   const { mockApiCall } = createApiMocks();
 *   configureApiRoutes(mockApiCall, {
 *     '/keywords': [{ id: 'kw-1', name: 'General' }],
 *     '/flashcards': { items: [], total: 0 },
 *   });
 */
export function configureApiRoutes(
  mockApiCall: ReturnType<typeof vi.fn>,
  routes: Record<string, unknown>,
) {
  mockApiCall.mockImplementation((path: string) => {
    for (const [pattern, response] of Object.entries(routes)) {
      if (path.startsWith(pattern)) {
        return Promise.resolve(response);
      }
    }
    return Promise.resolve(undefined);
  });
}
