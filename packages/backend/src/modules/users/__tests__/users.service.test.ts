import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';
import { NotFoundError, ConflictError } from '@/lib/errors.js';

// Mock Prisma before importing the service
vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));

// Import after mock setup
import { getMe, updateMe } from '../users.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';
const USER_CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

const prismaUser = {
  id: USER_ID,
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: USER_CREATED_AT,
  settings: { language: 'es' },
};

const prismaUserNoSettings = {
  id: USER_ID,
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: USER_CREATED_AT,
  settings: null,
};

const expectedProfile = {
  id: USER_ID,
  email: 'alice@example.com',
  name: 'Alice',
  language: 'es',
  createdAt: USER_CREATED_AT.toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// getMe
// ─────────────────────────────────────────────────────────────────────────────

describe('getMe', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a properly shaped UserProfile when user exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);

    const profile = await getMe(USER_ID);

    expect(profile).toEqual(expectedProfile);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      include: { settings: true },
    });
  });

  it('defaults language to "es" when settings are null', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(prismaUserNoSettings);

    const profile = await getMe(USER_ID);

    expect(profile.language).toBe('es');
  });

  it('throws NotFoundError when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(getMe(USER_ID)).rejects.toThrow(NotFoundError);
    await expect(getMe(USER_ID)).rejects.toThrow('User not found');
  });

  it('throws NotFoundError with correct statusCode (404)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(getMe(USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateMe
// ─────────────────────────────────────────────────────────────────────────────

describe('updateMe', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── User not found ─────────────────────────────────────────────────────────

  it('throws NotFoundError when user does not exist', async () => {
    // existence check returns null
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(updateMe(USER_ID, { name: 'Bob' })).rejects.toThrow(NotFoundError);
    await expect(updateMe(USER_ID, { name: 'Bob' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  // ── Update name only (User table only) ────────────────────────────────────

  it('updates user name successfully and returns updated UserProfile', async () => {
    // existence check
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // user.update (no return needed — we re-fetch after)
    mockPrisma.user.update.mockResolvedValue(undefined);
    // re-fetch with settings
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...prismaUser,
      name: 'Alice Updated',
    });

    const profile = await updateMe(USER_ID, { name: 'Alice Updated' });

    expect(profile.name).toBe('Alice Updated');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: 'Alice Updated' },
    });
    // userSettings.upsert must NOT be called when only name changes
    expect(mockPrisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  // ── Update language only (UserSettings table only) ─────────────────────────

  it('updates user language successfully and returns updated UserProfile', async () => {
    // existence check
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // userSettings.upsert
    mockPrisma.userSettings.upsert.mockResolvedValue(undefined);
    // re-fetch with settings
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...prismaUser,
      settings: { language: 'en' },
    });

    const profile = await updateMe(USER_ID, { language: 'en' });

    expect(profile.language).toBe('en');
    expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      update: { language: 'en' },
      create: { userId: USER_ID, language: 'en' },
    });
    // user.update must NOT be called when only language changes
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // ── Update both name and language (transaction path) ───────────────────────

  it('uses prisma.$transaction when both user fields and settings fields are provided', async () => {
    // existence check
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // $transaction resolves
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);
    // re-fetch with settings
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...prismaUser,
      name: 'Alice Updated',
      settings: { language: 'en' },
    });

    const profile = await updateMe(USER_ID, { name: 'Alice Updated', language: 'en' });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(profile.name).toBe('Alice Updated');
    expect(profile.language).toBe('en');
  });

  it('does NOT use $transaction when only user fields are provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    mockPrisma.user.update.mockResolvedValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    await updateMe(USER_ID, { name: 'Alice' });

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('does NOT use $transaction when only settings fields are provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    mockPrisma.userSettings.upsert.mockResolvedValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    await updateMe(USER_ID, { language: 'es' });

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  // ── Email conflict check ────────────────────────────────────────────────────

  it('throws ConflictError when new email already belongs to another account', async () => {
    // existence check (current user)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // email conflict check returns a DIFFERENT user
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'other-user-uuid' });

    const error = await updateMe(USER_ID, { email: 'taken@example.com' }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('does NOT throw ConflictError when email check returns the SAME user (no-op email change)', async () => {
    // existence check
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // email conflict check returns the SAME user id → no conflict
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // user.update
    mockPrisma.user.update.mockResolvedValue(undefined);
    // re-fetch
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    await expect(updateMe(USER_ID, { email: 'alice@example.com' })).resolves.toBeDefined();
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it('does NOT call email conflict check when email is not in the payload', async () => {
    // existence check
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // user.update
    mockPrisma.user.update.mockResolvedValue(undefined);
    // re-fetch
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    await updateMe(USER_ID, { name: 'Alice' });

    // Only 2 calls: existence check + re-fetch. NO intermediate email conflict call.
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
  });

  // ── Re-fetch after update ──────────────────────────────────────────────────

  it('re-fetches user with settings after update to build the response', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    mockPrisma.user.update.mockResolvedValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    await updateMe(USER_ID, { name: 'Alice' });

    // Second call should include settings
    const calls = mockPrisma.user.findUnique.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall).toMatchObject({
      where: { id: USER_ID },
      include: { settings: true },
    });
  });

  it('returns properly shaped UserProfile with all required fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    mockPrisma.user.update.mockResolvedValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    const profile = await updateMe(USER_ID, { name: 'Alice' });

    expect(profile).toEqual(expectedProfile);
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('email');
    expect(profile).toHaveProperty('name');
    expect(profile).toHaveProperty('language');
    expect(profile).toHaveProperty('createdAt');
  });

  // ── Update email successfully ──────────────────────────────────────────────

  it('updates user email successfully when email is not taken', async () => {
    // existence check
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID });
    // email conflict check returns null (not taken)
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    // user.update
    mockPrisma.user.update.mockResolvedValue(undefined);
    // re-fetch
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...prismaUser,
      email: 'new@example.com',
    });

    const profile = await updateMe(USER_ID, { email: 'new@example.com' });

    expect(profile.email).toBe('new@example.com');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { email: 'new@example.com' },
    });
  });
});
