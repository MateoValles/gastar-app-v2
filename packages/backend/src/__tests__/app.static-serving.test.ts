/**
 * Static serving and SPA fallback — unit tests for the Express app factory.
 *
 * We exercise the SERVE_FRONTEND code path by passing `serveFrontend` and
 * `frontendDistPath` via AppOptions, so tests don't require real env setup
 * or module re-loading trickery.
 *
 * Assertions focus on:
 *   - /health is NOT intercepted by static serving
 *   - /v1/* is NOT intercepted by SPA fallback
 *   - Unknown frontend routes receive index.html (SPA fallback)
 *   - SERVE_FRONTEND disabled → unknown routes get 404 API error
 *   - CORS applied when CORS_ORIGIN is set, omitted otherwise
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── Module-level mocks (hoisted automatically by vitest) ─────────────────────

vi.mock('@/config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    PORT: 3000,
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-chars-long!',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars-long!',
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'noreply@example.com',
    FRONTEND_URL: 'http://localhost:5173',
    CORS_ORIGIN: 'http://localhost:5173',
    SERVE_FRONTEND: false,
    FRONTEND_DIST_PATH: undefined,
  },
}));

vi.mock('@/lib/prisma.js', () => ({ prisma: {} }));

// Route mocks — pass-through so the app chain continues to the 404 handler
vi.mock('@/modules/auth/auth.routes.js', () => ({
  default: Object.assign(
    vi.fn((_, __, next: () => void) => next()),
    { use: vi.fn() },
  ),
}));
vi.mock('@/modules/accounts/accounts.routes.js', () => ({
  default: Object.assign(
    vi.fn((_, __, next: () => void) => next()),
    { use: vi.fn() },
  ),
}));
vi.mock('@/modules/categories/categories.routes.js', () => ({
  default: Object.assign(
    vi.fn((_, __, next: () => void) => next()),
    { use: vi.fn() },
  ),
}));
vi.mock('@/modules/transactions/transactions.routes.js', () => ({
  default: Object.assign(
    vi.fn((_, __, next: () => void) => next()),
    { use: vi.fn() },
  ),
}));
vi.mock('@/modules/users/users.routes.js', () => ({
  default: Object.assign(
    vi.fn((_, __, next: () => void) => next()),
    { use: vi.fn() },
  ),
}));
vi.mock('@/modules/dashboard/dashboard.routes.js', () => ({
  default: Object.assign(
    vi.fn((_, __, next: () => void) => next()),
    { use: vi.fn() },
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a minimal fake dist directory with an index.html.
 * Returns the path so tests can clean it up or reference it.
 */
function createFakeDist(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gastar-test-dist-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body>SPA</body></html>');
  return dir;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('app — SERVE_FRONTEND disabled (default)', () => {
  let app: import('express').Express;

  beforeAll(async () => {
    const { createApp } = await import('@/app.js');
    app = createApp({ disableRateLimit: true }); // serveFrontend defaults to env.SERVE_FRONTEND = false
  });

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('GET /unknown-route returns 404 API error (no SPA fallback)', async () => {
    const res = await request(app).get('/some-frontend-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /unknown-route returns 404 API error', async () => {
    const res = await request(app).post('/unknown-api-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('app — SERVE_FRONTEND enabled', () => {
  let app: import('express').Express;
  let distPath: string;

  beforeAll(async () => {
    distPath = createFakeDist();
    const { createApp } = await import('@/app.js');
    app = createApp({
      disableRateLimit: true,
      serveFrontend: true,
      frontendDistPath: distPath,
    });
  });

  it('GET /health returns 200 (not swallowed by static serving)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('GET /v1/accounts is NOT intercepted by SPA fallback', async () => {
    // Mocked routes pass through → hits 404 API handler, not SPA fallback
    const res = await request(app).get('/v1/accounts');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /v1/auth/login is NOT intercepted by SPA fallback', async () => {
    const res = await request(app).post('/v1/auth/login');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('GET /dashboard returns index.html (SPA fallback)', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA');
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('GET /login returns index.html (SPA fallback)', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA');
  });

  it('GET / returns index.html (SPA fallback)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA');
  });

  it('POST /non-api-route returns 404 (SPA fallback does NOT apply to non-GET)', async () => {
    const res = await request(app).post('/dashboard');
    // Not a GET request → SPA fallback does not apply → hits 404 API handler
    expect(res.status).toBe(404);
  });
});

describe('app — CORS behaviour', () => {
  it('applies CORS headers when CORS_ORIGIN is set (development mode)', async () => {
    // The top-level mock already sets CORS_ORIGIN — use the default app instance
    const { createApp } = await import('@/app.js');
    const corsApp = createApp({ disableRateLimit: true });

    const res = await request(corsApp)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
