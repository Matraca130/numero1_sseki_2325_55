// ============================================================
// TEST: 3DP-2 — Auto-thumbnail upload function
//
// Verifies the uploadThumbnail function:
//   1. Sends FormData with correct file to /upload-model-3d
//   2. Uses proper auth headers (Bearer ANON_KEY + X-Access-Token)
//   3. Returns file_url from response
//   4. Handles errors gracefully
//   5. Does NOT set Content-Type (browser handles multipart boundary)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock api module ──
vi.mock('@/app/lib/api', () => ({
  API_BASE: 'https://test.supabase.co/functions/v1/server',
  ANON_KEY: 'test-anon-key',
  getAccessToken: vi.fn(() => 'test-user-jwt'),
  apiCall: vi.fn(),
}));

// Mock apiConfig (transitive dep via models3dApi → apiConfig)
vi.mock('@/app/services/apiConfig', () => ({
  realRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.status = status;
    }
  },
}));

vi.mock('@/app/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { uploadThumbnail } from '../model3d-api';

describe('uploadThumbnail — 3DP-2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should POST a PNG file to /upload-model-3d', async () => {
    // Setup: successful upload response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          file_url: 'https://storage.example.com/thumbnails/thumb-model-123.png',
          file_size_bytes: 45000,
          file_format: 'png',
        },
      }),
    });

    const file = new File(['fake-png-data'], 'thumbnail-model-123.png', { type: 'image/png' });
    const result = await uploadThumbnail(file, 'model-123');

    // Verify fetch was called
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];

    // Verify URL
    expect(url).toBe('https://test.supabase.co/functions/v1/server/upload-model-3d');

    // Verify method
    expect(options.method).toBe('POST');

    // Verify auth headers
    expect(options.headers['Authorization']).toBe('Bearer test-anon-key');
    expect(options.headers['X-Access-Token']).toBe('test-user-jwt');

    // Verify Content-Type is NOT set (browser sets multipart boundary)
    expect(options.headers['Content-Type']).toBeUndefined();

    // Verify body is FormData
    expect(options.body).toBeInstanceOf(FormData);

    // Verify result
    expect(result).toBe('https://storage.example.com/thumbnails/thumb-model-123.png');
  });

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Storage quota exceeded' }),
    });

    const file = new File(['data'], 'thumb.png', { type: 'image/png' });

    await expect(uploadThumbnail(file, 'model-x'))
      .rejects
      .toThrow('Storage quota exceeded');
  });

  it('should throw if response has no file_url', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { file_size_bytes: 100 } }),
    });

    const file = new File(['data'], 'thumb.png', { type: 'image/png' });

    await expect(uploadThumbnail(file, 'model-y'))
      .rejects
      .toThrow('No file_url in thumbnail response');
  });

  it('should handle both response envelope shapes', async () => {
    // Some endpoints return { file_url } directly instead of { data: { file_url } }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        file_url: 'https://storage.example.com/direct-url.png',
      }),
    });

    const file = new File(['data'], 'thumb.png', { type: 'image/png' });
    const result = await uploadThumbnail(file, 'model-z');

    expect(result).toBe('https://storage.example.com/direct-url.png');
  });
});
