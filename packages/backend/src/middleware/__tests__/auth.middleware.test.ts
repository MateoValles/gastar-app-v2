import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';

// ─── Mocks (must be declared before imports that use them) ───────────────────

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  errors: {
    JWTExpired: class JWTExpired extends Error {
      name = 'JWTExpired';
    },
  },
}));

vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));

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
  },
}));

vi.mock('@/config/auth.js', () => ({
  authConfig: {
    accessToken: {
      secret: new TextEncoder().encode('test-access-secret'),
    },
  },
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { jwtVerify, errors as joseErrors } from 'jose';
import { authMiddleware } from '../auth.middleware.js';
import { UnauthorizedError } from '@/lib/errors.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockReq(headers: Record<string, string> = {}): Request {
  return { headers } as Request;
}

function createMockRes(): Response {
  return {} as Response;
}

function createMockNext(): NextFunction {
  return vi.fn() as NextFunction;
}

const USER_ID = 'user-uuid-001';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('authMiddleware', () => {
  const mockPrisma = getMockPrisma();
  const mockJwtVerify = vi.mocked(jwtVerify);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Missing / malformed header ──────────────────────────────────────────

  it('throws UnauthorizedError when no Authorization header', async () => {
    const req = createMockReq(); // no authorization header
    const next = createMockNext();

    await expect(authMiddleware(req, createMockRes(), next)).rejects.toThrow(UnauthorizedError);

    expect(next).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedError when Authorization header does not start with Bearer', async () => {
    const req = createMockReq({ authorization: 'Basic dXNlcjpwYXNz' });
    const next = createMockNext();

    await expect(authMiddleware(req, createMockRes(), next)).rejects.toThrow(UnauthorizedError);

    expect(next).not.toHaveBeenCalled();
  });

  // ─── Invalid payload ─────────────────────────────────────────────────────

  it('throws UnauthorizedError when token payload has no sub', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockJwtVerify.mockResolvedValue({ payload: { sub: undefined } } as any);

    const req = createMockReq({ authorization: 'Bearer some-token' });
    const next = createMockNext();

    await expect(authMiddleware(req, createMockRes(), next)).rejects.toThrow(UnauthorizedError);

    expect(next).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedError when token payload has empty string sub', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockJwtVerify.mockResolvedValue({ payload: { sub: '' } } as any);

    const req = createMockReq({ authorization: 'Bearer some-token' });
    const next = createMockNext();

    await expect(authMiddleware(req, createMockRes(), next)).rejects.toThrow(UnauthorizedError);

    expect(next).not.toHaveBeenCalled();
  });

  // ─── DB check: user deleted ───────────────────────────────────────────────

  it('throws UnauthorizedError when user no longer exists in DB', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockJwtVerify.mockResolvedValue({ payload: { sub: USER_ID } } as any);
    mockPrisma.user.findUnique.mockResolvedValue(null); // user deleted

    const req = createMockReq({ authorization: 'Bearer valid-token' });
    const next = createMockNext();

    await expect(authMiddleware(req, createMockRes(), next)).rejects.toThrow(UnauthorizedError);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { id: true },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('UnauthorizedError for deleted user has message containing "no longer exists"', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockJwtVerify.mockResolvedValue({ payload: { sub: USER_ID } } as any);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createMockReq({ authorization: 'Bearer valid-token' });

    await expect(authMiddleware(req, createMockRes(), createMockNext())).rejects.toThrow(
      'no longer exists',
    );
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  it('sets req.userId and calls next() for valid token with existing user', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockJwtVerify.mockResolvedValue({ payload: { sub: USER_ID } } as any);
    mockPrisma.user.findUnique.mockResolvedValue({ id: USER_ID });

    const req = createMockReq({ authorization: 'Bearer valid-token' });
    const next = createMockNext();

    await authMiddleware(req, createMockRes(), next);

    expect((req as Request & { userId?: string }).userId).toBe(USER_ID);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('queries DB with minimal select { id: true } for existence check', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockJwtVerify.mockResolvedValue({ payload: { sub: USER_ID } } as any);
    mockPrisma.user.findUnique.mockResolvedValue({ id: USER_ID });

    const req = createMockReq({ authorization: 'Bearer valid-token' });
    await authMiddleware(req, createMockRes(), createMockNext());

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { id: true },
    });
  });

  // ─── Token expiry ─────────────────────────────────────────────────────────

  it('throws TokenExpiredError (code: TOKEN_EXPIRED) when JWT is expired', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expiredErr = new (joseErrors.JWTExpired as any)('jwt expired');
    mockJwtVerify.mockRejectedValue(expiredErr);

    const req = createMockReq({ authorization: 'Bearer expired-token' });
    const next = createMockNext();

    let thrownError: unknown;
    try {
      await authMiddleware(req, createMockRes(), next);
    } catch (err) {
      thrownError = err;
    }

    // Must be an UnauthorizedError subclass with code TOKEN_EXPIRED
    expect(thrownError).toBeInstanceOf(UnauthorizedError);
    expect((thrownError as { code: string }).code).toBe('TOKEN_EXPIRED');
    expect(next).not.toHaveBeenCalled();
  });

  // ─── Generic jose errors ──────────────────────────────────────────────────

  it('throws UnauthorizedError for invalid tokens (generic jose errors)', async () => {
    const genericJoseErr = new Error('JWTInvalid: some jose error');
    genericJoseErr.name = 'JWTInvalid';
    mockJwtVerify.mockRejectedValue(genericJoseErr);

    const req = createMockReq({ authorization: 'Bearer garbage-token' });
    const next = createMockNext();

    await expect(authMiddleware(req, createMockRes(), next)).rejects.toThrow(UnauthorizedError);

    expect(next).not.toHaveBeenCalled();
  });

  it('UnauthorizedError for invalid token has code UNAUTHORIZED', async () => {
    mockJwtVerify.mockRejectedValue(new Error('some jose error'));

    const req = createMockReq({ authorization: 'Bearer bad-token' });
    const next = createMockNext();

    let thrownError: unknown;
    try {
      await authMiddleware(req, createMockRes(), next);
    } catch (err) {
      thrownError = err;
    }

    expect((thrownError as { code: string }).code).toBe('UNAUTHORIZED');
  });
});
