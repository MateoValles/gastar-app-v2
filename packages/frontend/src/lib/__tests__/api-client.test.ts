import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiFetch,
  setAccessToken,
  clearAccessToken,
  get,
  post,
  patch,
  del,
} from '../api-client.js';
import { ApiError } from '../api-error.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock window.location
const mockLocation = { href: '' };
vi.stubGlobal('window', { location: mockLocation, matchMedia: vi.fn() });

// Mock import.meta.env
vi.mock('../../../vite-env', () => ({}));

function mockResponse(status: number, body: unknown, ok?: boolean): Response {
  return {
    status,
    ok: ok ?? (status >= 200 && status < 300),
    headers: {
      get: (name: string) => (name === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
  } as unknown as Response;
}

describe('api-client', () => {
  beforeEach(() => {
    clearAccessToken();
    mockFetch.mockReset();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('apiFetch', () => {
    it('makes a GET request and returns data', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, data: { id: '1' } }));

      const result = await apiFetch<{ success: boolean; data: { id: string } }>('/test');

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(result).toEqual({ success: true, data: { id: '1' } });
    });

    it('includes Authorization header when token is set', async () => {
      setAccessToken('test-token');
      mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true }));

      await apiFetch('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('does not include Authorization header when no token', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true }));

      await apiFetch('/test');

      const call = mockFetch.mock.calls[0];
      expect(call?.[1]?.headers?.Authorization).toBeUndefined();
    });

    it('throws ApiError on non-success response', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(404, { error: { code: 'NOT_FOUND', message: 'Not found' } }, false),
      );

      await expect(apiFetch('/test')).rejects.toThrow(ApiError);
    });

    it('throws ApiError with correct properties', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(404, { error: { code: 'NOT_FOUND', message: 'Resource not found' } }, false),
      );

      try {
        await apiFetch('/test');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(404);
        expect(apiErr.code).toBe('NOT_FOUND');
        expect(apiErr.message).toBe('Resource not found');
      }
    });
  });

  describe('401 refresh queue — HIGH RISK', () => {
    it('calls refresh exactly once when multiple 401s fire simultaneously', async () => {
      setAccessToken('old-token');

      // All three requests return 401 first
      mockFetch
        .mockResolvedValueOnce(mockResponse(401, {}, false)) // req1 401
        .mockResolvedValueOnce(mockResponse(401, {}, false)) // req2 401
        .mockResolvedValueOnce(mockResponse(401, {}, false)) // req3 401
        .mockResolvedValueOnce(mockResponse(200, { data: { accessToken: 'new-token' } })) // refresh call
        .mockResolvedValueOnce(mockResponse(200, { data: 'result1' })) // req1 retry
        .mockResolvedValueOnce(mockResponse(200, { data: 'result2' })) // req2 retry
        .mockResolvedValueOnce(mockResponse(200, { data: 'result3' })); // req3 retry

      // Fire all three simultaneously
      const [r1, r2, r3] = await Promise.all([
        apiFetch('/endpoint1'),
        apiFetch('/endpoint2'),
        apiFetch('/endpoint3'),
      ]);

      expect(r1).toEqual({ data: 'result1' });
      expect(r2).toEqual({ data: 'result2' });
      expect(r3).toEqual({ data: 'result3' });

      // Verify refresh was called exactly once
      const refreshCalls = mockFetch.mock.calls.filter(
        (call) => typeof call[0] === 'string' && (call[0] as string).includes('/auth/refresh'),
      );
      expect(refreshCalls).toHaveLength(1);
    });

    it('redirects to /login and throws when refresh fails', async () => {
      setAccessToken('old-token');

      mockFetch
        .mockResolvedValueOnce(mockResponse(401, {}, false)) // req 401
        .mockResolvedValueOnce(mockResponse(401, {}, false)); // refresh fails with 401

      await expect(apiFetch('/test')).rejects.toThrow(ApiError);
      expect(mockLocation.href).toBe('/login');
    });
  });

  describe('convenience methods', () => {
    it('get() uses GET method', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, {}));
      await get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('post() uses POST method and serializes body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, {}));
      await post('/test', { name: 'test' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        }),
      );
    });

    it('patch() uses PATCH method', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, {}));
      await patch('/test', { name: 'updated' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('del() uses DELETE method', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, {}));
      await del('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
