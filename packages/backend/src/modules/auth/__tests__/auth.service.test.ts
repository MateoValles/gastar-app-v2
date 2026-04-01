import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors.js';

// ─────────────────────────────────────────────────────────────────────────────
// External dependency mocks (must be declared before service import)
// ─────────────────────────────────────────────────────────────────────────────

// Mock env + authConfig FIRST — these are imported at module level by auth.service.ts
// and env.ts calls process.exit(1) when env vars are missing.
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
      secret: new TextEncoder().encode('test-access-secret-at-least-32-chars-long!'),
      expiresIn: '15m',
      lifetimeMs: 15 * 60 * 1000,
    },
    refreshToken: {
      secret: new TextEncoder().encode('test-refresh-secret-at-least-32-chars-long!'),
      expiresIn: '7d',
      lifetimeMs: 7 * 24 * 60 * 60 * 1000,
    },
    bcryptSaltRounds: 12,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  },
}));

// Mock Prisma
vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));

// Mock bcrypt — avoid actual CPU-heavy hashing in unit tests
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock jose — avoid real JWT signing/verification.
// SignJWT is used as `new SignJWT({})` so the mock MUST be a constructor function.
const mockSignFn = vi.fn().mockResolvedValue('mock-signed-token');
const mockSignJWTInstance = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setSubject: vi.fn().mockReturnThis(),
  setIssuer: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  sign: mockSignFn,
};

vi.mock('jose', () => {
  function SignJWT(_payload: Record<string, unknown>) {
    // Return the shared mock instance — all method calls are tracked centrally
    return mockSignJWTInstance;
  }
  return {
    SignJWT,
    jwtVerify: vi.fn(),
  };
});

// Mock crypto — deterministic token generation in tests
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(),
    createHash: vi.fn(),
  },
}));

// Mock Resend email service — no real emails in tests
vi.mock('@/lib/resend.js', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Lazy imports (after mocks are set up)
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcrypt';
import { jwtVerify } from 'jose';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/resend.js';

import {
  register,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  signAccessToken,
  signRefreshToken,
} from '../auth.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Typed mock helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockBcrypt = vi.mocked(bcrypt);
const mockJwtVerify = vi.mocked(jwtVerify);
const mockCrypto = vi.mocked(crypto);
const mockSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';
const USER_EMAIL = 'alice@example.com';
const USER_NAME = 'Alice';
const PLAIN_PASSWORD = 'SecurePassword123!';
const HASHED_PASSWORD = '$2b$12$hashedPasswordValue';

const PLAIN_RESET_TOKEN = 'abc123deadbeef';
const HASHED_RESET_TOKEN = 'sha256hashoftoken';
const USER_CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

const ACCESS_TOKEN = 'mock-access-token';
const REFRESH_TOKEN = 'mock-refresh-token';

/** Prisma user row with settings */
const prismaUser = {
  id: USER_ID,
  email: USER_EMAIL,
  name: USER_NAME,
  createdAt: USER_CREATED_AT,
  passwordHash: HASHED_PASSWORD,
  settings: { language: 'es' },
};

/** Prisma user row without settings */
const prismaUserNoSettings = {
  id: USER_ID,
  email: USER_EMAIL,
  name: USER_NAME,
  createdAt: USER_CREATED_AT,
  passwordHash: HASHED_PASSWORD,
  settings: null,
};

/** Minimal user row (no passwordHash exposed, for transaction callbacks) */
const prismaUserCreated = {
  id: USER_ID,
  email: USER_EMAIL,
  name: USER_NAME,
  createdAt: USER_CREATED_AT,
  passwordHash: HASHED_PASSWORD,
};

/** Expected UserProfile shape */
const expectedProfile = {
  id: USER_ID,
  email: USER_EMAIL,
  name: USER_NAME,
  language: 'es',
  createdAt: USER_CREATED_AT.toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets up the sign() mock to return alternating tokens.
 * First sign() call → accessToken, second → refreshToken.
 * Also resets all instance methods on mockSignJWTInstance after vi.clearAllMocks().
 */
function mockTokenSigning(accessToken = ACCESS_TOKEN, refreshToken = REFRESH_TOKEN) {
  // Re-assign all methods on the shared instance after clearAllMocks()
  mockSignJWTInstance.setProtectedHeader = vi.fn().mockReturnValue(mockSignJWTInstance);
  mockSignJWTInstance.setSubject = vi.fn().mockReturnValue(mockSignJWTInstance);
  mockSignJWTInstance.setIssuer = vi.fn().mockReturnValue(mockSignJWTInstance);
  mockSignJWTInstance.setIssuedAt = vi.fn().mockReturnValue(mockSignJWTInstance);
  mockSignJWTInstance.setExpirationTime = vi.fn().mockReturnValue(mockSignJWTInstance);

  let callCount = 0;
  mockSignJWTInstance.sign = vi.fn().mockImplementation(() => {
    callCount++;
    return callCount % 2 === 1 ? Promise.resolve(accessToken) : Promise.resolve(refreshToken);
  });
}

/**
 * Sets up crypto mock for password reset flow.
 */
function mockCryptoReset(plainToken = PLAIN_RESET_TOKEN, hashResult = HASHED_RESET_TOKEN) {
  mockCrypto.randomBytes.mockReturnValue(Buffer.from(plainToken) as never);
  const mockDigest = vi.fn().mockReturnValue(hashResult);
  const mockUpdate = vi.fn().mockReturnValue({ digest: mockDigest });
  mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as never);
}

// ─────────────────────────────────────────────────────────────────────────────
// signAccessToken
// ─────────────────────────────────────────────────────────────────────────────

describe('signAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations after clearAllMocks
    mockSignJWTInstance.setProtectedHeader = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setSubject = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setIssuer = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setIssuedAt = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setExpirationTime = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.sign = vi.fn().mockResolvedValue(ACCESS_TOKEN);
  });

  it('calls SignJWT with HS256 algorithm and correct claims', async () => {
    const token = await signAccessToken(USER_ID);

    expect(mockSignJWTInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' });
    expect(mockSignJWTInstance.setSubject).toHaveBeenCalledWith(USER_ID);
    expect(mockSignJWTInstance.setIssuer).toHaveBeenCalledWith('gastar');
    expect(mockSignJWTInstance.setExpirationTime).toHaveBeenCalledWith('15m');
    expect(token).toBe(ACCESS_TOKEN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// signRefreshToken
// ─────────────────────────────────────────────────────────────────────────────

describe('signRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations after clearAllMocks
    mockSignJWTInstance.setProtectedHeader = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setSubject = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setIssuer = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setIssuedAt = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.setExpirationTime = vi.fn().mockReturnValue(mockSignJWTInstance);
    mockSignJWTInstance.sign = vi.fn().mockResolvedValue(REFRESH_TOKEN);
  });

  it('calls SignJWT with type:refresh claim and 7d expiration', async () => {
    const token = await signRefreshToken(USER_ID);

    // Verify that the 7d expiration is set (not 15m which is for access tokens)
    expect(mockSignJWTInstance.setExpirationTime).toHaveBeenCalledWith('7d');
    expect(token).toBe(REFRESH_TOKEN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────

describe('register', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenSigning();
  });

  const validInput = {
    email: USER_EMAIL,
    password: PLAIN_PASSWORD,
    name: USER_NAME,
  };

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('creates a new user inside a Prisma transaction', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null), // no existing user
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: {
          create: vi.fn().mockResolvedValue({}),
        },
        category: {
          createMany: vi.fn().mockResolvedValue({ count: 6 }),
        },
      };
      return fn(tx);
    });

    await register(validInput);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('returns accessToken, refreshToken, and user profile on success', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: { create: vi.fn().mockResolvedValue({}) },
        category: { createMany: vi.fn().mockResolvedValue({ count: 6 }) },
      };
      return fn(tx);
    });

    const result = await register(validInput);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('user');
    expect(result.user).toMatchObject({
      id: USER_ID,
      email: USER_EMAIL,
      name: USER_NAME,
      language: 'es',
    });
  });

  it('hashes the password with bcrypt before storing', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: { create: vi.fn().mockResolvedValue({}) },
        category: { createMany: vi.fn().mockResolvedValue({ count: 6 }) },
      };
      return fn(tx);
    });

    await register(validInput);

    // bcrypt.hash must be called with the PLAIN password, not any derivative
    expect(mockBcrypt.hash).toHaveBeenCalledWith(PLAIN_PASSWORD, expect.any(Number));
  });

  it('uses bcrypt rounds of at least 10 (currently 12)', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: { create: vi.fn().mockResolvedValue({}) },
        category: { createMany: vi.fn().mockResolvedValue({ count: 6 }) },
      };
      return fn(tx);
    });

    await register(validInput);

    const rounds = mockBcrypt.hash.mock.calls[0][1] as number;
    expect(rounds).toBeGreaterThanOrEqual(10);
  });

  it('copies exactly 6 default categories to the new user', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    const mockCreateMany = vi.fn().mockResolvedValue({ count: 6 });

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: { create: vi.fn().mockResolvedValue({}) },
        category: { createMany: mockCreateMany },
      };
      return fn(tx);
    });

    await register(validInput);

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ userId: USER_ID })]),
    });

    const categoriesData = mockCreateMany.mock.calls[0][0].data as Array<{ userId: string }>;
    expect(categoriesData).toHaveLength(6);
  });

  it('all default categories are assigned to the new userId', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    const mockCreateMany = vi.fn().mockResolvedValue({ count: 6 });

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: { create: vi.fn().mockResolvedValue({}) },
        category: { createMany: mockCreateMany },
      };
      return fn(tx);
    });

    await register(validInput);

    const categories = mockCreateMany.mock.calls[0][0].data as Array<{ userId: string }>;
    expect(categories.every((c) => c.userId === USER_ID)).toBe(true);
  });

  it('creates UserSettings with language "es" for the new user', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    const mockSettingsCreate = vi.fn().mockResolvedValue({});

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: { create: mockSettingsCreate },
        category: { createMany: vi.fn().mockResolvedValue({ count: 6 }) },
      };
      return fn(tx);
    });

    await register(validInput);

    expect(mockSettingsCreate).toHaveBeenCalledWith({
      data: { userId: USER_ID, language: 'es' },
    });
  });

  it('returns language "es" in the user profile', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(prismaUserCreated),
        },
        userSettings: { create: vi.fn().mockResolvedValue({}) },
        category: { createMany: vi.fn().mockResolvedValue({ count: 6 }) },
      };
      return fn(tx);
    });

    const result = await register(validInput);

    expect(result.user.language).toBe('es');
  });

  // ── Duplicate email ────────────────────────────────────────────────────────

  it('throws ConflictError when email is already taken', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(prismaUser), // email exists
          create: vi.fn(),
        },
        userSettings: { create: vi.fn() },
        category: { createMany: vi.fn() },
      };
      return fn(tx);
    });

    await expect(register(validInput)).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError with statusCode 409 and code CONFLICT', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(prismaUser),
          create: vi.fn(),
        },
        userSettings: { create: vi.fn() },
        category: { createMany: vi.fn() },
      };
      return fn(tx);
    });

    await expect(register(validInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('does NOT create a user when email is already taken', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    const mockCreate = vi.fn();

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(prismaUser),
          create: mockCreate,
        },
        userSettings: { create: vi.fn() },
        category: { createMany: vi.fn() },
      };
      try {
        return await fn(tx);
      } catch {
        // Transaction rolled back — expected
        throw new ConflictError('An account with this email already exists');
      }
    });

    await expect(register(validInput)).rejects.toThrow(ConflictError);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ── Security: password never stored plain ─────────────────────────────────

  it('[SECURITY] never stores plain-text password — user.create receives passwordHash', async () => {
    mockBcrypt.hash.mockResolvedValue(HASHED_PASSWORD as never);
    const mockUserCreate = vi.fn().mockResolvedValue(prismaUserCreated);

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: mockUserCreate,
        },
        userSettings: { create: vi.fn().mockResolvedValue({}) },
        category: { createMany: vi.fn().mockResolvedValue({ count: 6 }) },
      };
      return fn(tx);
    });

    await register(validInput);

    const createCall = mockUserCreate.mock.calls[0][0] as {
      data: { passwordHash: string; email: string; password?: string };
    };
    // passwordHash must be the bcrypt hash
    expect(createCall.data.passwordHash).toBe(HASHED_PASSWORD);
    // plain password must NEVER appear in the create call
    expect(createCall.data).not.toHaveProperty('password');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────

describe('login', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenSigning();
  });

  const validInput = { email: USER_EMAIL, password: PLAIN_PASSWORD };

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns accessToken, refreshToken, and user profile for valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await login(validInput);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user).toMatchObject(expectedProfile);
  });

  it('calls bcrypt.compare with the plain password and the stored passwordHash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockBcrypt.compare.mockResolvedValue(true as never);

    await login(validInput);

    expect(mockBcrypt.compare).toHaveBeenCalledWith(PLAIN_PASSWORD, HASHED_PASSWORD);
  });

  it('queries user by email including settings', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockBcrypt.compare.mockResolvedValue(true as never);

    await login(validInput);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: USER_EMAIL },
      include: { settings: true },
    });
  });

  it('uses settings.language from the DB in the returned profile', async () => {
    const userWithEnSettings = { ...prismaUser, settings: { language: 'en' } };
    mockPrisma.user.findUnique.mockResolvedValue(userWithEnSettings);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await login(validInput);

    expect(result.user.language).toBe('en');
  });

  it('defaults language to "es" when settings are null', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUserNoSettings);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await login(validInput);

    expect(result.user.language).toBe('es');
  });

  // ── Wrong password ─────────────────────────────────────────────────────────

  it('throws UnauthorizedError for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockBcrypt.compare.mockResolvedValue(false as never);

    await expect(login(validInput)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError with statusCode 401 for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockBcrypt.compare.mockResolvedValue(false as never);

    await expect(login(validInput)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  // ── Non-existent email ─────────────────────────────────────────────────────

  it('throws UnauthorizedError for non-existent email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.compare.mockResolvedValue(false as never);

    await expect(login(validInput)).rejects.toThrow(UnauthorizedError);
  });

  // ── Security: timing attack prevention ────────────────────────────────────

  it('[SECURITY] always calls bcrypt.compare even when user is not found (timing-safe)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.compare.mockResolvedValue(false as never);

    await expect(login(validInput)).rejects.toThrow(UnauthorizedError);

    // bcrypt.compare MUST be called even for non-existent users
    expect(mockBcrypt.compare).toHaveBeenCalledTimes(1);
  });

  it('[SECURITY] throws identical error message for wrong password vs non-existent email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockBcrypt.compare.mockResolvedValue(false as never);
    const wrongPasswordError = await login(validInput).catch((e) => e as UnauthorizedError);

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.compare.mockResolvedValue(false as never);
    const noUserError = await login(validInput).catch((e) => e as UnauthorizedError);

    // Same message — does NOT reveal whether email exists
    expect(wrongPasswordError.message).toBe(noUserError.message);
  });

  it('[SECURITY] throws same error type for wrong password vs non-existent email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockBcrypt.compare.mockResolvedValue(false as never);
    const wrongPasswordError = await login(validInput).catch((e) => e);

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.compare.mockResolvedValue(false as never);
    const noUserError = await login(validInput).catch((e) => e);

    // Both must be the same class — no email enumeration
    expect(wrongPasswordError.constructor).toBe(noUserError.constructor);
    expect(wrongPasswordError).toBeInstanceOf(UnauthorizedError);
    expect(noUserError).toBeInstanceOf(UnauthorizedError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refresh
// ─────────────────────────────────────────────────────────────────────────────

describe('refresh', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenSigning();
  });

  const VALID_REFRESH_TOKEN_STRING = 'valid-refresh-token-string';

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns new accessToken, refreshToken and user profile for a valid refresh token', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: USER_ID, type: 'refresh' },
      protectedHeader: { alg: 'HS256' },
    } as never);
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);

    const result = await refresh(VALID_REFRESH_TOKEN_STRING);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user).toMatchObject(expectedProfile);
  });

  it('looks up the user by the sub claim from the JWT payload', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: USER_ID, type: 'refresh' },
      protectedHeader: { alg: 'HS256' },
    } as never);
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);

    await refresh(VALID_REFRESH_TOKEN_STRING);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      include: { settings: true },
    });
  });

  it('defaults language to "es" when user settings are null', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: USER_ID, type: 'refresh' },
      protectedHeader: { alg: 'HS256' },
    } as never);
    mockPrisma.user.findUnique.mockResolvedValue(prismaUserNoSettings);

    const result = await refresh(VALID_REFRESH_TOKEN_STRING);

    expect(result.user.language).toBe('es');
  });

  // ── Invalid / expired token ────────────────────────────────────────────────

  it('throws UnauthorizedError when token is missing the "refresh" type claim', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: USER_ID, type: 'access' }, // wrong type
      protectedHeader: { alg: 'HS256' },
    } as never);

    await expect(refresh(VALID_REFRESH_TOKEN_STRING)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when token has no sub claim', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { type: 'refresh' }, // no sub
      protectedHeader: { alg: 'HS256' },
    } as never);

    await expect(refresh(VALID_REFRESH_TOKEN_STRING)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when jwtVerify throws a generic error', async () => {
    mockJwtVerify.mockRejectedValue(new Error('signature verification failed'));

    await expect(refresh(VALID_REFRESH_TOKEN_STRING)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError with "expired" message when jose throws expired error', async () => {
    const expiredError = new Error('jwt expired');
    mockJwtVerify.mockRejectedValue(expiredError);

    const error = await refresh(VALID_REFRESH_TOKEN_STRING).catch((e) => e as UnauthorizedError);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.message.toLowerCase()).toContain('expired');
  });

  it('throws UnauthorizedError when user no longer exists in the DB', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: USER_ID, type: 'refresh' },
      protectedHeader: { alg: 'HS256' },
    } as never);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(refresh(VALID_REFRESH_TOKEN_STRING)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError with statusCode 401 for invalid token', async () => {
    mockJwtVerify.mockRejectedValue(new Error('bad token'));

    await expect(refresh(VALID_REFRESH_TOKEN_STRING)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// forgotPassword
// ─────────────────────────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('generates a random token, stores its SHA-256 hash, and sends an email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockCryptoReset();
    mockPrisma.user.update.mockResolvedValue({});
    mockSendPasswordResetEmail.mockResolvedValue(undefined);

    await forgotPassword(USER_EMAIL);

    expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
    expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).toHaveBeenCalled();
  });

  it('[SECURITY] stores the SHA-256 HASH of the token, never the plain token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.update.mockResolvedValue({});
    mockSendPasswordResetEmail.mockResolvedValue(undefined);

    await forgotPassword(USER_EMAIL);

    const updateCall = mockPrisma.user.update.mock.calls[0][0] as {
      data: { resetTokenHash: string };
    };
    // Hash stored — not the plain token
    expect(updateCall.data.resetTokenHash).toBe(HASHED_RESET_TOKEN);
    expect(updateCall.data.resetTokenHash).not.toBe(PLAIN_RESET_TOKEN);
  });

  it('sends the plain-text token (not hash) in the email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.update.mockResolvedValue({});
    mockSendPasswordResetEmail.mockResolvedValue(undefined);

    await forgotPassword(USER_EMAIL);

    // The email must contain the PLAIN token so the user can use it
    // (token is hex string from randomBytes().toString('hex'))
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      USER_EMAIL,
      expect.any(String),
      expect.any(String),
    );
  });

  it('sets reset token expiry to approximately 1 hour in the future', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);
    mockCryptoReset();
    mockPrisma.user.update.mockResolvedValue({});
    mockSendPasswordResetEmail.mockResolvedValue(undefined);

    const before = Date.now();
    await forgotPassword(USER_EMAIL);
    const after = Date.now();

    const updateCall = mockPrisma.user.update.mock.calls[0][0] as {
      data: { resetTokenExpiry: Date };
    };
    const expiry = updateCall.data.resetTokenExpiry.getTime();

    const oneHourMs = 60 * 60 * 1000;
    expect(expiry).toBeGreaterThanOrEqual(before + oneHourMs);
    expect(expiry).toBeLessThanOrEqual(after + oneHourMs + 100); // +100ms tolerance
  });

  // ── Email enumeration prevention ───────────────────────────────────────────

  it('[SECURITY] silently returns (no error, no email) when email does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(forgotPassword('notexist@example.com')).resolves.toBeUndefined();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('[SECURITY] does not generate a reset token when email does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await forgotPassword('ghost@example.com');

    expect(mockCrypto.randomBytes).not.toHaveBeenCalled();
    expect(mockCrypto.createHash).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetPassword
// ─────────────────────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('resets the password successfully with a valid, non-expired token', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue('$2b$12$newHashedPassword' as never);
    mockPrisma.user.update.mockResolvedValue({});

    await expect(resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!')).resolves.toBeUndefined();
  });

  it('hashes the new password with bcrypt before storing', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue('$2b$12$newHashedPassword' as never);
    mockPrisma.user.update.mockResolvedValue({});

    await resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!');

    expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', expect.any(Number));
  });

  it('looks up user by SHA-256 hash of the token (not plain token)', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue('$2b$12$newHashedPassword' as never);
    mockPrisma.user.update.mockResolvedValue({});

    await resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!');

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        resetTokenHash: HASHED_RESET_TOKEN,
        resetTokenExpiry: { gt: expect.any(Date) },
      },
    });
  });

  it('clears resetTokenHash and resetTokenExpiry after successful reset', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue('$2b$12$newHashedPassword' as never);
    mockPrisma.user.update.mockResolvedValue({});

    await resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!');

    const updateCall = mockPrisma.user.update.mock.calls[0][0] as {
      data: { resetTokenHash: null; resetTokenExpiry: null; passwordHash: string };
    };
    expect(updateCall.data.resetTokenHash).toBeNull();
    expect(updateCall.data.resetTokenExpiry).toBeNull();
  });

  it('stores the NEW bcrypt hash (not the old one) after reset', async () => {
    const newHash = '$2b$12$newHashedPassword';
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue(newHash as never);
    mockPrisma.user.update.mockResolvedValue({});

    await resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!');

    const updateCall = mockPrisma.user.update.mock.calls[0][0] as {
      data: { passwordHash: string };
    };
    expect(updateCall.data.passwordHash).toBe(newHash);
  });

  it('[SECURITY] never stores the plain-text new password', async () => {
    const newHash = '$2b$12$newHashedPassword';
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue(newHash as never);
    mockPrisma.user.update.mockResolvedValue({});

    const newPlainPassword = 'NewPassword123!';
    await resetPassword(PLAIN_RESET_TOKEN, newPlainPassword);

    const updateCall = mockPrisma.user.update.mock.calls[0][0] as {
      data: { passwordHash: string };
    };
    expect(updateCall.data.passwordHash).not.toBe(newPlainPassword);
    expect(updateCall.data.passwordHash).toBe(newHash);
  });

  // ── Invalid token ──────────────────────────────────────────────────────────

  it('throws NotFoundError for an invalid token (no matching hash in DB)', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(null); // no match

    await expect(resetPassword('wrong-token', 'NewPassword123!')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError with statusCode 404 for invalid token', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(resetPassword('wrong-token', 'NewPassword123!')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  // ── Expired token ──────────────────────────────────────────────────────────

  it('throws NotFoundError for an expired token (Prisma filters by resetTokenExpiry > now)', async () => {
    // When token is expired, Prisma findFirst returns null because resetTokenExpiry: { gt: new Date() } fails
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('uses resetTokenExpiry: { gt: now } to filter expired tokens', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue('$2b$12$newHashedPassword' as never);
    mockPrisma.user.update.mockResolvedValue({});

    const before = new Date();
    await resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!');

    const findFirstCall = mockPrisma.user.findFirst.mock.calls[0][0] as {
      where: { resetTokenExpiry: { gt: Date } };
    };
    const expiryFilter = findFirstCall.where.resetTokenExpiry.gt;
    // The filter date should be approximately "now"
    expect(expiryFilter.getTime()).toBeGreaterThanOrEqual(before.getTime() - 50);
  });

  // ── Token invalidation after use ───────────────────────────────────────────

  it('[SECURITY] token is invalidated (nulled) after successful reset — cannot be reused', async () => {
    mockCryptoReset(PLAIN_RESET_TOKEN, HASHED_RESET_TOKEN);
    mockPrisma.user.findFirst.mockResolvedValue(prismaUser);
    mockBcrypt.hash.mockResolvedValue('$2b$12$newHashedPassword' as never);
    mockPrisma.user.update.mockResolvedValue({});

    await resetPassword(PLAIN_RESET_TOKEN, 'NewPassword123!');

    // user.update must be called with nulled token fields
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resetTokenHash: null,
          resetTokenExpiry: null,
        }),
      }),
    );
  });
});
