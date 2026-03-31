import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';
import { ConflictError, NotFoundError } from '@/lib/errors.js';

// Mock Prisma before importing the service
vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));

// Import after mock setup
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  toAccountResponse,
} from '../accounts.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';
const ACCOUNT_ID = 'acc-uuid-001';
const OTHER_USER_ID = 'user-uuid-999';

const NOW = new Date('2024-01-15T10:00:00.000Z');
const UPDATED = new Date('2024-01-15T12:00:00.000Z');

/** A Prisma Account row as returned from the DB (balance as Decimal) */
const prismaAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: 'Main Checking',
  type: 'checking' as const,
  currency: 'ARS' as const,
  balance: new Decimal('1500.50'),
  createdAt: NOW,
  updatedAt: NOW,
};

/** The expected API response shape for the account above */
const expectedAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: 'Main Checking',
  type: 'checking',
  currency: 'ARS',
  balance: '1500.50', // toFixed(2) — trailing zeros preserved
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

/** A second account for list tests */
const prismaAccount2 = {
  id: 'acc-uuid-002',
  userId: USER_ID,
  name: 'Savings USD',
  type: 'savings' as const,
  currency: 'USD' as const,
  balance: new Decimal('500.00'),
  createdAt: UPDATED,
  updatedAt: UPDATED,
};

/** Account with zero balance */
const prismaAccountZero = {
  id: 'acc-uuid-003',
  userId: USER_ID,
  name: 'Empty Account',
  type: 'cash' as const,
  currency: 'EUR' as const,
  balance: new Decimal('0'),
  createdAt: NOW,
  updatedAt: NOW,
};

/** Account with negative balance (credit card) */
const prismaAccountNegative = {
  id: 'acc-uuid-004',
  userId: USER_ID,
  name: 'Credit Card',
  type: 'credit_card' as const,
  currency: 'ARS' as const,
  balance: new Decimal('-2500.75'),
  createdAt: NOW,
  updatedAt: NOW,
};

// ─────────────────────────────────────────────────────────────────────────────
// toAccountResponse (mapper)
// ─────────────────────────────────────────────────────────────────────────────

describe('toAccountResponse', () => {
  it('serializes all fields correctly including ISO date strings', () => {
    const result = toAccountResponse(prismaAccount);

    expect(result).toEqual(expectedAccount);
    expect(typeof result.createdAt).toBe('string');
    expect(typeof result.updatedAt).toBe('string');
    expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('serializes balance as string with 2 decimal places (toFixed(2))', () => {
    const result = toAccountResponse(prismaAccount);

    expect(result.balance).toBe('1500.50');
    expect(typeof result.balance).toBe('string');
  });

  it('preserves trailing zeros — "1500.50" must not become "1500.5"', () => {
    // This is the core regression test for the Decimal.toString() bug.
    // Decimal.toString() strips trailing zeros; toFixed(2) does not.
    const account = { ...prismaAccount, balance: new Decimal('1500.50') };

    const result = toAccountResponse(account);

    expect(result.balance).toBe('1500.50');
    expect(result.balance).not.toBe('1500.5');
  });

  it('serializes zero balance as "0.00" (toFixed(2))', () => {
    const result = toAccountResponse(prismaAccountZero);

    expect(result.balance).toBe('0.00');
  });

  it('serializes negative balance correctly with toFixed(2)', () => {
    const result = toAccountResponse(prismaAccountNegative);

    expect(result.balance).toBe('-2500.75');
  });

  it('serializes a round integer balance as X.00', () => {
    const account = { ...prismaAccount, balance: new Decimal('1000') };

    const result = toAccountResponse(account);

    expect(result.balance).toBe('1000.00');
  });

  it('returns all required AccountResponse fields', () => {
    const result = toAccountResponse(prismaAccount);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('currency');
    expect(result).toHaveProperty('balance');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
  });

  it('casts type and currency through correctly', () => {
    const result = toAccountResponse(prismaAccount);

    expect(result.type).toBe('checking');
    expect(result.currency).toBe('ARS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listAccounts
// ─────────────────────────────────────────────────────────────────────────────

describe('listAccounts', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array when user has no accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    const result = await listAccounts(USER_ID);

    expect(result).toEqual([]);
  });

  it('returns all accounts mapped to AccountResponse shape', async () => {
    mockPrisma.account.findMany.mockResolvedValue([prismaAccount2, prismaAccount]);

    const result = await listAccounts(USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'acc-uuid-002',
      name: 'Savings USD',
      currency: 'USD',
    });
  });

  it('queries with userId filter and orders by createdAt desc', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    await listAccounts(USER_ID);

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('does NOT return accounts belonging to other users', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    await listAccounts(OTHER_USER_ID);

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: OTHER_USER_ID } }),
    );
  });

  it('serializes Decimal balance with toFixed(2) for each account in the list', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      { ...prismaAccount, balance: new Decimal('999.90') },
      { ...prismaAccount2, balance: new Decimal('100.00') },
    ]);

    const result = await listAccounts(USER_ID);

    expect(result[0].balance).toBe('999.90');
    expect(result[1].balance).toBe('100.00');
  });

  it('handles accounts with zero balance in the list', async () => {
    mockPrisma.account.findMany.mockResolvedValue([prismaAccountZero]);

    const result = await listAccounts(USER_ID);

    expect(result[0].balance).toBe('0.00');
  });

  it('handles accounts with negative balance (credit card) in the list', async () => {
    mockPrisma.account.findMany.mockResolvedValue([prismaAccountNegative]);

    const result = await listAccounts(USER_ID);

    expect(result[0].balance).toBe('-2500.75');
  });

  it('maps all accounts correctly including dates as ISO strings', async () => {
    mockPrisma.account.findMany.mockResolvedValue([prismaAccount]);

    const result = await listAccounts(USER_ID);

    expect(result[0]).toEqual(expectedAccount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAccount
// ─────────────────────────────────────────────────────────────────────────────

describe('getAccount', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the account when it exists and belongs to the user', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);

    const result = await getAccount(USER_ID, ACCOUNT_ID);

    expect(result).toEqual(expectedAccount);
  });

  it('queries with both id and userId for ownership enforcement', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);

    await getAccount(USER_ID, ACCOUNT_ID);

    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID, userId: USER_ID },
    });
  });

  it('throws NotFoundError when the account does not exist', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(getAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(NotFoundError);
    await expect(getAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow('Account not found');
  });

  it('throws NotFoundError with correct statusCode (404) and code', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(getAccount(USER_ID, ACCOUNT_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws NotFoundError when the account belongs to a different user (ownership isolation)', async () => {
    // findFirst returns null because userId doesn't match in the where clause
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(getAccount(OTHER_USER_ID, ACCOUNT_ID)).rejects.toThrow(NotFoundError);
  });

  it('serializes balance with toFixed(2)', async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      ...prismaAccount,
      balance: new Decimal('250.50'),
    });

    const result = await getAccount(USER_ID, ACCOUNT_ID);

    expect(result.balance).toBe('250.50');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createAccount
// ─────────────────────────────────────────────────────────────────────────────

describe('createAccount', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an account with all fields and returns AccountResponse', async () => {
    mockPrisma.account.create.mockResolvedValue(prismaAccount);

    const result = await createAccount(USER_ID, {
      name: 'Main Checking',
      type: 'checking',
      currency: 'ARS',
      initialBalance: '1500.50',
    });

    expect(result).toEqual(expectedAccount);
  });

  it('inserts with the correct userId, name, type, currency, and initialBalance', async () => {
    mockPrisma.account.create.mockResolvedValue(prismaAccount);

    await createAccount(USER_ID, {
      name: 'Main Checking',
      type: 'checking',
      currency: 'ARS',
      initialBalance: '1500.50',
    });

    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        name: 'Main Checking',
        type: 'checking',
        currency: 'ARS',
        balance: '1500.50',
      },
    });
  });

  it('defaults balance to 0 when initialBalance is omitted', async () => {
    mockPrisma.account.create.mockResolvedValue({
      ...prismaAccount,
      balance: new Decimal('0'),
    });

    await createAccount(USER_ID, {
      name: 'Empty Account',
      type: 'cash',
      currency: 'EUR',
    });

    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        name: 'Empty Account',
        type: 'cash',
        currency: 'EUR',
        balance: 0,
      },
    });
  });

  it('always sets userId from the service parameter, never from user-supplied data', async () => {
    mockPrisma.account.create.mockResolvedValue(prismaAccount);

    await createAccount(USER_ID, { name: 'Test', type: 'checking', currency: 'ARS' });

    const callArg = mockPrisma.account.create.mock.calls[0][0];
    expect(callArg.data.userId).toBe(USER_ID);
  });

  it('returns AccountResponse with balance serialized as toFixed(2) string', async () => {
    mockPrisma.account.create.mockResolvedValue({
      ...prismaAccount,
      balance: new Decimal('500.10'),
    });

    const result = await createAccount(USER_ID, {
      name: 'New Account',
      type: 'savings',
      currency: 'USD',
      initialBalance: '500.10',
    });

    expect(result.balance).toBe('500.10');
    expect(typeof result.balance).toBe('string');
  });

  it('supports all valid account types', async () => {
    const types = ['checking', 'savings', 'credit_card', 'cash', 'investment'] as const;

    for (const type of types) {
      mockPrisma.account.create.mockResolvedValue({ ...prismaAccount, type });

      const result = await createAccount(USER_ID, { name: 'Test', type, currency: 'ARS' });

      expect(result.type).toBe(type);
    }
  });

  it('supports all valid currencies', async () => {
    const currencies = ['ARS', 'USD', 'EUR'] as const;

    for (const currency of currencies) {
      mockPrisma.account.create.mockResolvedValue({ ...prismaAccount, currency });

      const result = await createAccount(USER_ID, {
        name: 'Test',
        type: 'checking',
        currency,
      });

      expect(result.currency).toBe(currency);
    }
  });

  it('does NOT wrap in prisma.$transaction (no Transaction row involved at creation)', async () => {
    mockPrisma.account.create.mockResolvedValue(prismaAccount);

    await createAccount(USER_ID, { name: 'Test', type: 'checking', currency: 'ARS' });

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateAccount
// ─────────────────────────────────────────────────────────────────────────────

describe('updateAccount', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the account and returns the updated AccountResponse', async () => {
    const updatedPrismaAccount = { ...prismaAccount, name: 'Updated Name', updatedAt: UPDATED };
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.account.findFirstOrThrow.mockResolvedValue(updatedPrismaAccount);

    const result = await updateAccount(USER_ID, ACCOUNT_ID, { name: 'Updated Name' });

    expect(result.name).toBe('Updated Name');
    expect(result.updatedAt).toBe(UPDATED.toISOString());
  });

  it('calls updateMany with compound { id, userId } for ownership enforcement', async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.account.findFirstOrThrow.mockResolvedValue(prismaAccount);

    await updateAccount(USER_ID, ACCOUNT_ID, { name: 'Updated' });

    expect(mockPrisma.account.updateMany).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID, userId: USER_ID },
      data: { name: 'Updated' },
    });
  });

  it('throws NotFoundError when updateMany returns count=0 (account not found or not owned)', async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateAccount(USER_ID, ACCOUNT_ID, { name: 'New' })).rejects.toThrow(
      NotFoundError,
    );
    await expect(updateAccount(USER_ID, ACCOUNT_ID, { name: 'New' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws NotFoundError with message "Account not found"', async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateAccount(USER_ID, ACCOUNT_ID, { name: 'New' })).rejects.toThrow(
      'Account not found',
    );
  });

  it('does NOT allow a different user to update the account (ownership isolation)', async () => {
    // The compound where { id, userId: OTHER_USER_ID } yields count=0 from DB
    mockPrisma.account.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateAccount(OTHER_USER_ID, ACCOUNT_ID, { name: 'Hijacked' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('re-fetches account after updateMany using findFirstOrThrow', async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.account.findFirstOrThrow.mockResolvedValue({
      ...prismaAccount,
      type: 'savings',
    });

    await updateAccount(USER_ID, ACCOUNT_ID, { type: 'savings' });

    expect(mockPrisma.account.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID, userId: USER_ID },
    });
  });

  it('can update type field independently', async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.account.findFirstOrThrow.mockResolvedValue({
      ...prismaAccount,
      type: 'investment',
    });

    const result = await updateAccount(USER_ID, ACCOUNT_ID, { type: 'investment' });

    expect(mockPrisma.account.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { type: 'investment' } }),
    );
    expect(result.type).toBe('investment');
  });

  it('serializes balance with toFixed(2) on the re-fetched account', async () => {
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.account.findFirstOrThrow.mockResolvedValue({
      ...prismaAccount,
      balance: new Decimal('3750.00'),
    });

    const result = await updateAccount(USER_ID, ACCOUNT_ID, { name: 'Updated' });

    expect(result.balance).toBe('3750.00');
  });

  it('returns the response built from the re-fetched row, not from the updateMany input', async () => {
    // updateMany doesn't return records — service must always re-fetch
    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.account.findFirstOrThrow.mockResolvedValue({
      ...prismaAccount,
      name: 'Fetched Name',
    });

    const result = await updateAccount(USER_ID, ACCOUNT_ID, { name: 'Input Name' });

    // Result comes from the re-fetched row
    expect(result.name).toBe('Fetched Name');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteAccount
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteAccount', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the account successfully and returns void', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.account.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteAccount(USER_ID, ACCOUNT_ID);

    expect(result).toBeUndefined();
  });

  it('calls findFirst with compound { id, userId } for ownership enforcement', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.account.deleteMany.mockResolvedValue({ count: 1 });

    await deleteAccount(USER_ID, ACCOUNT_ID);

    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID, userId: USER_ID },
    });
  });

  it('calls transaction.count as a pre-flight check before deleting', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.account.deleteMany.mockResolvedValue({ count: 1 });

    await deleteAccount(USER_ID, ACCOUNT_ID);

    expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
      where: { accountId: ACCOUNT_ID, account: { userId: USER_ID } },
    });
  });

  it('calls account.deleteMany with compound { id, userId } when no transactions exist', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.account.deleteMany.mockResolvedValue({ count: 1 });

    await deleteAccount(USER_ID, ACCOUNT_ID);

    expect(mockPrisma.account.deleteMany).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID, userId: USER_ID },
    });
    expect(mockPrisma.account.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when findFirst returns null (account not found or not owned)', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(NotFoundError);
    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws NotFoundError with message "Account not found"', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow('Account not found');
  });

  it('does NOT allow a different user to delete the account (ownership isolation)', async () => {
    // findFirst returns null because userId doesn't match in the where clause
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(deleteAccount(OTHER_USER_ID, ACCOUNT_ID)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when account has existing transactions', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(3);

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(ConflictError);
    // Should NOT reach the delete call
    expect(mockPrisma.account.deleteMany).not.toHaveBeenCalled();
  });

  it('ConflictError has correct statusCode (409) and code', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(1);

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('ConflictError message mentions existing transactions', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(5);

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(
      'Cannot delete account with existing transactions',
    );
  });

  it('does NOT call transaction.count when account is not found (early exit)', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(NotFoundError);

    expect(mockPrisma.transaction.count).not.toHaveBeenCalled();
    expect(mockPrisma.account.deleteMany).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when deleteMany returns count=0 (race: account deleted between checks)', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(NotFoundError);
    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow('Account not found');
  });

  it('throws ConflictError when deleteMany hits P2003 FK violation (race: transaction created between count and delete)', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.account.deleteMany.mockRejectedValue({ code: 'P2003' });

    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(ConflictError);
    await expect(deleteAccount(USER_ID, ACCOUNT_ID)).rejects.toThrow(
      'Cannot delete account with existing transactions',
    );
  });
});
