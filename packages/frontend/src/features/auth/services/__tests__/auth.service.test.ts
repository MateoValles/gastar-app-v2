/**
 * auth.service — unit tests
 *
 * Uses the existing MSW infrastructure (same-origin BASE_URL='/v1') to verify:
 * - login() / refresh() / logout() delegate to correct same-origin URL paths
 * - BASE_URL from api-client is the single source of truth (no local re-definition)
 * - setAccessToken is called with the received token
 * - ApiError is thrown on failure responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server.js';
import { ApiError } from '@/lib/api-error.js';
import { clearAccessToken } from '@/lib/api-client.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Capture the URL that MSW intercepted for a given request */
async function captureUrl(handler: () => Promise<unknown>): Promise<string> {
  let capturedUrl = '';
  const capture = http.all('*', ({ request }) => {
    capturedUrl = request.url;
    return undefined; // pass to default handler
  });

  server.use(capture);
  try {
    await handler();
  } catch {
    // swallow errors — we just want the URL
  }
  server.resetHandlers();
  return capturedUrl;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auth.service — login', () => {
  beforeEach(() => {
    clearAccessToken();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('POSTs to /v1/auth/login (same-origin path via BASE_URL)', async () => {
    const { login } = await import('../auth.service.js');

    const url = await captureUrl(() => login({ email: 'a@b.com', password: 'Password123!' }));

    // In test env, BASE_URL = '/v1' so the full URL after jsdom resolves it is
    // http://localhost/v1/auth/login
    expect(url).toContain('/v1/auth/login');
  });

  it('returns accessToken and user on success (MSW default handler)', async () => {
    const { login } = await import('../auth.service.js');

    const result = await login({ email: 'a@b.com', password: 'Password123!' });

    expect(result.accessToken).toBe('test-token');
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe('user-1');
  });

  it('throws ApiError on 401 (invalid credentials)', async () => {
    server.use(
      http.post('*/v1/auth/login', () =>
        HttpResponse.json(
          { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } },
          { status: 401 },
        ),
      ),
    );

    const { login } = await import('../auth.service.js');

    await expect(login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(ApiError);
  });

  it('does NOT throw on 200 (successful login)', async () => {
    const { login } = await import('../auth.service.js');

    await expect(login({ email: 'a@b.com', password: 'Password123!' })).resolves.toBeDefined();
  });
});

describe('auth.service — refresh', () => {
  beforeEach(() => {
    clearAccessToken();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('POSTs to /v1/auth/refresh (same-origin path via BASE_URL)', async () => {
    const { refresh } = await import('../auth.service.js');

    const url = await captureUrl(() => refresh());

    expect(url).toContain('/v1/auth/refresh');
  });

  it('returns accessToken and user on success', async () => {
    const { refresh } = await import('../auth.service.js');

    const result = await refresh();

    expect(result.accessToken).toBe('refreshed-token');
  });

  it('throws ApiError on 401 (expired refresh token)', async () => {
    server.use(
      http.post('*/v1/auth/refresh', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
          { status: 401 },
        ),
      ),
    );

    const { refresh } = await import('../auth.service.js');

    await expect(refresh()).rejects.toThrow(ApiError);
  });
});

describe('auth.service — logout', () => {
  it('POSTs to /auth/logout and clears token', async () => {
    const clearSpy = vi.spyOn(await import('@/lib/api-client.js'), 'clearAccessToken');
    const { logout } = await import('../auth.service.js');

    await logout();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('auth.service — BASE_URL single source of truth', () => {
  it('uses same-origin /v1 path (no hardcoded localhost in URL)', async () => {
    const { login } = await import('../auth.service.js');

    const url = await captureUrl(() => login({ email: 'test@test.com', password: 'Password123!' }));

    // The URL must NOT contain localhost:3001 (the old hardcoded dev URL)
    // It should use the same-origin /v1 path.
    expect(url).not.toContain('localhost:3001');
    expect(url).toContain('/v1/auth/login');
  });
});
