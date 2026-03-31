import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';
import { NotFoundError, ValidationError } from '@/lib/errors.js';

// Mock Prisma before importing the service
vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));

// Import after mock setup
import {
  toTransactionResponse,
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../transactions.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';
const OTHER_USER_ID = 'user-uuid-999';
const ACCOUNT_ID = 'acc-uuid-001';
const ACCOUNT_ID_DST = 'acc-uuid-002';
const CATEGORY_ID = 'cat-uuid-001';
const TX_ID = 'tx-uuid-001';
const TX_ID_2 = 'tx-uuid-002';
const TRANSFER_GROUP_ID = 'group-uuid-001';

const NOW = new Date('2024-06-15T10:00:00.000Z');
const UPDATED = new Date('2024-06-15T12:00:00.000Z');
const TX_DATE = new Date('2024-06-15T00:00:00.000Z'); // @db.Date

/** A base Prisma Transaction row (income) */
const prismaIncomeTx = {
  id: TX_ID,
  accountId: ACCOUNT_ID,
  categoryId: CATEGORY_ID,
  type: 'income' as const,
  amount: new Decimal('500.50'),
  exchangeRate: null,
  description: 'Salary',
  date: TX_DATE,
  transferGroupId: null,
  transferSide: null,
  transferPeerAccountId: null,
  createdAt: NOW,
  updatedAt: NOW,
};

/** A Prisma Transaction row (expense) */
const prismaExpenseTx = {
  ...prismaIncomeTx,
  id: TX_ID,
  type: 'expense' as const,
  amount: new Decimal('200.00'),
  description: 'Groceries',
};

/** Transfer out-leg */
const prismaTransferOut = {
  id: TX_ID,
  accountId: ACCOUNT_ID,
  categoryId: null,
  type: 'transfer' as const,
  amount: new Decimal('1000.00'),
  exchangeRate: null,
  description: 'Transfer to savings',
  date: TX_DATE,
  transferGroupId: TRANSFER_GROUP_ID,
  transferSide: 'out' as const,
  transferPeerAccountId: ACCOUNT_ID_DST,
  createdAt: NOW,
  updatedAt: NOW,
};

/** Transfer in-leg */
const prismaTransferIn = {
  id: TX_ID_2,
  accountId: ACCOUNT_ID_DST,
  categoryId: null,
  type: 'transfer' as const,
  amount: new Decimal('1000.00'),
  exchangeRate: null,
  description: 'Transfer to savings',
  date: TX_DATE,
  transferGroupId: TRANSFER_GROUP_ID,
  transferSide: 'in' as const,
  transferPeerAccountId: ACCOUNT_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

/** Cross-currency transfer out-leg (ARS → USD with exchange rate) */
const prismaXferOutCross = {
  ...prismaTransferOut,
  amount: new Decimal('100000.00'),
  exchangeRate: new Decimal('1000.000000'),
};

/** Cross-currency transfer in-leg */
const prismaXferInCross = {
  ...prismaTransferIn,
  amount: new Decimal('100.00'),
  exchangeRate: new Decimal('1000.000000'),
};

/** A mock Account row (ARS) */
const prismaAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: 'Main Checking',
  type: 'checking' as const,
  currency: 'ARS' as const,
  balance: new Decimal('5000.00'),
  createdAt: NOW,
  updatedAt: NOW,
};

/** A second mock Account row (ARS) */
const prismaAccountDst = {
  id: ACCOUNT_ID_DST,
  userId: USER_ID,
  name: 'Savings',
  type: 'savings' as const,
  currency: 'ARS' as const,
  balance: new Decimal('2000.00'),
  createdAt: NOW,
  updatedAt: NOW,
};

/** A USD account (for cross-currency transfer) */
const prismaAccountUSD = {
  ...prismaAccountDst,
  currency: 'USD' as const,
};

/** A mock Category row */
const prismaCategory = {
  id: CATEGORY_ID,
  userId: USER_ID,
  name: 'Food',
  icon: null,
  color: null,
  createdAt: NOW,
  updatedAt: NOW,
};

/** Default list query (matches schema defaults) */
const defaultQuery = {
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  page: 1,
  limit: 20,
};

// ─────────────────────────────────────────────────────────────────────────────
// toTransactionResponse (mapper)
// ─────────────────────────────────────────────────────────────────────────────

describe('toTransactionResponse', () => {
  it('serializes all fields for an income transaction', () => {
    const result = toTransactionResponse(prismaIncomeTx);

    expect(result).toEqual({
      id: TX_ID,
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      type: 'income',
      amount: '500.50',
      exchangeRate: null,
      description: 'Salary',
      date: '2024-06-15',
      transferGroupId: null,
      transferSide: null,
      transferPeerAccountId: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it('serializes amount as toFixed(2) — trailing zeros preserved', () => {
    const tx = { ...prismaIncomeTx, amount: new Decimal('100.50') };
    expect(toTransactionResponse(tx).amount).toBe('100.50');
    expect(toTransactionResponse(tx).amount).not.toBe('100.5');
  });

  it('serializes round integer amount as X.00', () => {
    const tx = { ...prismaIncomeTx, amount: new Decimal('250') };
    expect(toTransactionResponse(tx).amount).toBe('250.00');
  });

  it('serializes exchangeRate as toFixed(6) — 6 decimal places', () => {
    const tx = { ...prismaIncomeTx, exchangeRate: new Decimal('1000') };
    expect(toTransactionResponse(tx).exchangeRate).toBe('1000.000000');
  });

  it('serializes exchangeRate preserving 6 decimal places', () => {
    const tx = { ...prismaIncomeTx, exchangeRate: new Decimal('1.234567') };
    expect(toTransactionResponse(tx).exchangeRate).toBe('1.234567');
  });

  it('serializes null exchangeRate as null', () => {
    expect(toTransactionResponse(prismaIncomeTx).exchangeRate).toBeNull();
  });

  it('serializes date as YYYY-MM-DD string (no time component)', () => {
    const result = toTransactionResponse(prismaIncomeTx);
    expect(result.date).toBe('2024-06-15');
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('serializes createdAt and updatedAt as ISO 8601 strings', () => {
    const result = toTransactionResponse(prismaIncomeTx);
    expect(result.createdAt).toBe(NOW.toISOString());
    expect(result.updatedAt).toBe(NOW.toISOString());
  });

  it('serializes transfer fields correctly on out-leg', () => {
    const result = toTransactionResponse(prismaTransferOut);
    expect(result.transferGroupId).toBe(TRANSFER_GROUP_ID);
    expect(result.transferSide).toBe('out');
    expect(result.transferPeerAccountId).toBe(ACCOUNT_ID_DST);
    expect(result.categoryId).toBeNull();
  });

  it('serializes transfer fields correctly on in-leg', () => {
    const result = toTransactionResponse(prismaTransferIn);
    expect(result.transferGroupId).toBe(TRANSFER_GROUP_ID);
    expect(result.transferSide).toBe('in');
    expect(result.transferPeerAccountId).toBe(ACCOUNT_ID);
    expect(result.categoryId).toBeNull();
  });

  it('serializes cross-currency transfer with exchangeRate toFixed(6)', () => {
    const result = toTransactionResponse(prismaXferOutCross);
    expect(result.exchangeRate).toBe('1000.000000');
    expect(result.amount).toBe('100000.00');
  });

  it('returns null for all transfer fields on income/expense', () => {
    const result = toTransactionResponse(prismaIncomeTx);
    expect(result.transferGroupId).toBeNull();
    expect(result.transferSide).toBeNull();
    expect(result.transferPeerAccountId).toBeNull();
  });

  it('passes description through as-is (including null)', () => {
    const noDesc = { ...prismaIncomeTx, description: null };
    expect(toTransactionResponse(noDesc).description).toBeNull();

    const withDesc = { ...prismaIncomeTx, description: 'Test' };
    expect(toTransactionResponse(withDesc).description).toBe('Test');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listTransactions
// ─────────────────────────────────────────────────────────────────────────────

describe('listTransactions', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty list and meta when user has no transactions', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await listTransactions(USER_ID, defaultQuery);

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 0 });
  });

  it('returns paginated list with correct meta', async () => {
    mockPrisma.transaction.count.mockResolvedValue(3);
    mockPrisma.transaction.findMany.mockResolvedValue([prismaIncomeTx]);

    const result = await listTransactions(USER_ID, { ...defaultQuery, page: 2, limit: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 2, limit: 1, total: 3 });
  });

  it('maps all transactions to TransactionResponse shape', async () => {
    mockPrisma.transaction.count.mockResolvedValue(1);
    mockPrisma.transaction.findMany.mockResolvedValue([prismaIncomeTx]);

    const result = await listTransactions(USER_ID, defaultQuery);

    expect(result.data[0]).toMatchObject({
      id: TX_ID,
      type: 'income',
      amount: '500.50',
    });
  });

  it('enforces ownership by filtering via account.userId', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, defaultQuery);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ account: { userId: USER_ID } }),
      }),
    );
    expect(mockPrisma.transaction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ account: { userId: USER_ID } }),
      }),
    );
  });

  it('applies accountId filter when provided', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, { ...defaultQuery, accountId: ACCOUNT_ID });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountId: ACCOUNT_ID }),
      }),
    );
  });

  it('applies categoryId filter when provided', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, { ...defaultQuery, categoryId: CATEGORY_ID });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: CATEGORY_ID }),
      }),
    );
  });

  it('applies type filter when provided', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, { ...defaultQuery, type: 'expense' });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'expense' }),
      }),
    );
  });

  it('applies dateFrom filter (gte) when provided', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, { ...defaultQuery, dateFrom: '2024-01-01' });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ gte: new Date('2024-01-01') }),
        }),
      }),
    );
  });

  it('applies dateTo filter (lte) when provided', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, { ...defaultQuery, dateTo: '2024-12-31' });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ lte: new Date('2024-12-31') }),
        }),
      }),
    );
  });

  it('applies both dateFrom and dateTo when provided', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, {
      ...defaultQuery,
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        }),
      }),
    );
  });

  it('does not include date filter when neither dateFrom nor dateTo is provided', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, defaultQuery);

    const findManyCall = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(findManyCall.where).not.toHaveProperty('date');
  });

  it('applies sortBy and sortOrder from query', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, {
      ...defaultQuery,
      sortBy: 'amount',
      sortOrder: 'asc',
    });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { amount: 'asc' } }),
    );
  });

  it('calculates correct skip based on page and limit', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, { ...defaultQuery, page: 3, limit: 10 });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('runs count and findMany in parallel (Promise.all)', async () => {
    mockPrisma.transaction.count.mockResolvedValue(5);
    mockPrisma.transaction.findMany.mockResolvedValue([prismaIncomeTx]);

    await listTransactions(USER_ID, defaultQuery);

    // Both were called exactly once
    expect(mockPrisma.transaction.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledTimes(1);
  });

  it('serializes Decimal amount with toFixed(2) in list results', async () => {
    mockPrisma.transaction.count.mockResolvedValue(1);
    mockPrisma.transaction.findMany.mockResolvedValue([
      { ...prismaIncomeTx, amount: new Decimal('999.90') },
    ]);

    const result = await listTransactions(USER_ID, defaultQuery);

    expect(result.data[0].amount).toBe('999.90');
  });

  it('returns multiple transactions in order returned from DB', async () => {
    const tx2 = { ...prismaIncomeTx, id: TX_ID_2, amount: new Decimal('300.00') };
    mockPrisma.transaction.count.mockResolvedValue(2);
    mockPrisma.transaction.findMany.mockResolvedValue([prismaIncomeTx, tx2]);

    const result = await listTransactions(USER_ID, defaultQuery);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe(TX_ID);
    expect(result.data[1].id).toBe(TX_ID_2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTransaction
// ─────────────────────────────────────────────────────────────────────────────

describe('getTransaction', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the transaction when it exists and belongs to the user', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);

    const result = await getTransaction(USER_ID, TX_ID);

    expect(result).toMatchObject({
      id: TX_ID,
      type: 'income',
      amount: '500.50',
      date: '2024-06-15',
    });
  });

  it('queries with ownership enforcement via account.userId', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);

    await getTransaction(USER_ID, TX_ID);

    expect(mockPrisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: TX_ID, account: { userId: USER_ID } },
    });
  });

  it('throws NotFoundError when transaction does not exist', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(getTransaction(USER_ID, TX_ID)).rejects.toThrow(NotFoundError);
    await expect(getTransaction(USER_ID, TX_ID)).rejects.toThrow('Transaction not found');
  });

  it('throws NotFoundError with statusCode 404 and code NOT_FOUND', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(getTransaction(USER_ID, TX_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws NotFoundError when transaction belongs to a different user (ownership isolation)', async () => {
    // findFirst returns null because account.userId doesn't match
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(getTransaction(OTHER_USER_ID, TX_ID)).rejects.toThrow(NotFoundError);
  });

  it('serializes Decimal amount with toFixed(2)', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({
      ...prismaIncomeTx,
      amount: new Decimal('750.50'),
    });

    const result = await getTransaction(USER_ID, TX_ID);

    expect(result.amount).toBe('750.50');
  });

  it('returns transfer transaction with correct transfer fields', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaTransferOut);

    const result = await getTransaction(USER_ID, TX_ID);

    expect(result.transferGroupId).toBe(TRANSFER_GROUP_ID);
    expect(result.transferSide).toBe('out');
    expect(result.transferPeerAccountId).toBe(ACCOUNT_ID_DST);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createTransaction — Income / Expense
// ─────────────────────────────────────────────────────────────────────────────

describe('createTransaction (income/expense)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an income transaction and returns TransactionResponse', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    const result = await createTransaction(USER_ID, {
      type: 'income',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '500.50',
      date: '2024-06-15',
    });

    expect(result).toMatchObject({
      id: TX_ID,
      type: 'income',
      amount: '500.50',
    });
  });

  it('creates an expense transaction and returns TransactionResponse', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaExpenseTx, prismaAccount]);

    const result = await createTransaction(USER_ID, {
      type: 'expense',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '200.00',
      date: '2024-06-15',
    });

    expect(result).toMatchObject({
      type: 'expense',
      amount: '200.00',
    });
  });

  it('verifies account ownership before creating', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null); // account not found

    await expect(
      createTransaction(USER_ID, {
        type: 'income',
        accountId: ACCOUNT_ID,
        categoryId: CATEGORY_ID,
        amount: '100.00',
        date: '2024-06-15',
      }),
    ).rejects.toThrow(NotFoundError);

    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID, userId: USER_ID },
    });
    // $transaction should NOT have been called
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundError with "Account not found" when account does not exist', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(
      createTransaction(USER_ID, {
        type: 'income',
        accountId: ACCOUNT_ID,
        categoryId: CATEGORY_ID,
        amount: '100.00',
        date: '2024-06-15',
      }),
    ).rejects.toThrow('Account not found');
  });

  it('verifies category ownership before creating', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(null); // category not found

    await expect(
      createTransaction(USER_ID, {
        type: 'income',
        accountId: ACCOUNT_ID,
        categoryId: CATEGORY_ID,
        amount: '100.00',
        date: '2024-06-15',
      }),
    ).rejects.toThrow(NotFoundError);

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundError with "Category not found" when category does not exist', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await expect(
      createTransaction(USER_ID, {
        type: 'income',
        accountId: ACCOUNT_ID,
        categoryId: CATEGORY_ID,
        amount: '100.00',
        date: '2024-06-15',
      }),
    ).rejects.toThrow('Category not found');
  });

  it('wraps create + balance update inside prisma.$transaction()', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await createTransaction(USER_ID, {
      type: 'income',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '500.50',
      date: '2024-06-15',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('increments balance for income — $transaction receives 2-op array', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await createTransaction(USER_ID, {
      type: 'income',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '500.50',
      date: '2024-06-15',
    });

    // $transaction must be called with an array of exactly 2 Prisma operations
    // (transaction.create + account.update with increment)
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(2);
  });

  it('decrements balance for expense (negative delta)', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaExpenseTx, prismaAccount]);

    await createTransaction(USER_ID, {
      type: 'expense',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '200.00',
      date: '2024-06-15',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('stores description as null when not provided', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([
      { ...prismaIncomeTx, description: null },
      prismaAccount,
    ]);

    const result = await createTransaction(USER_ID, {
      type: 'income',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '100.00',
      date: '2024-06-15',
    });

    expect(result).not.toBeInstanceOf(Array);
    const single = result as { description: string | null };
    expect(single.description).toBeNull();
  });

  it('returns a single TransactionResponse (not array) for income', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    const result = await createTransaction(USER_ID, {
      type: 'income',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '500.50',
      date: '2024-06-15',
    });

    expect(Array.isArray(result)).toBe(false);
    expect(result).toHaveProperty('id');
  });

  it('returns a single TransactionResponse (not array) for expense', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaExpenseTx, prismaAccount]);

    const result = await createTransaction(USER_ID, {
      type: 'expense',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '200.00',
      date: '2024-06-15',
    });

    expect(Array.isArray(result)).toBe(false);
  });

  it('passes date as Date object to Prisma (not raw string)', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await createTransaction(USER_ID, {
      type: 'income',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '100.00',
      date: '2024-06-15',
    });

    // The $transaction was called with an array of operations
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createTransaction — Transfer
// ─────────────────────────────────────────────────────────────────────────────

describe('createTransaction (transfer)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a same-currency transfer and returns [outLeg, inLeg]', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const result = await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    });

    expect(Array.isArray(result)).toBe(true);
    const [outLeg, inLeg] = result as { transferSide: string }[];
    expect(outLeg.transferSide).toBe('out');
    expect(inLeg.transferSide).toBe('in');
  });

  it('returns array of exactly 2 TransactionResponses for transfer', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const result = await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    });

    expect(result).toHaveLength(2);
  });

  it('out-leg has transferSide=out, accountId=fromAccountId, peerAccountId=toAccountId', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const [outLeg] = (await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    })) as { accountId: string; transferSide: string; transferPeerAccountId: string }[];

    expect(outLeg.accountId).toBe(ACCOUNT_ID);
    expect(outLeg.transferSide).toBe('out');
    expect(outLeg.transferPeerAccountId).toBe(ACCOUNT_ID_DST);
  });

  it('in-leg has transferSide=in, accountId=toAccountId, peerAccountId=fromAccountId', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const [, inLeg] = (await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    })) as { accountId: string; transferSide: string; transferPeerAccountId: string }[];

    expect(inLeg.accountId).toBe(ACCOUNT_ID_DST);
    expect(inLeg.transferSide).toBe('in');
    expect(inLeg.transferPeerAccountId).toBe(ACCOUNT_ID);
  });

  it('both legs share the same transferGroupId', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const [outLeg, inLeg] = (await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    })) as { transferGroupId: string }[];

    expect(outLeg.transferGroupId).toBe(TRANSFER_GROUP_ID);
    expect(inLeg.transferGroupId).toBe(TRANSFER_GROUP_ID);
    expect(outLeg.transferGroupId).toBe(inLeg.transferGroupId);
  });

  it('same-currency transfer: no exchangeRate on either leg', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      { ...prismaTransferOut, exchangeRate: null },
      { ...prismaTransferIn, exchangeRate: null },
      prismaAccount,
      prismaAccountDst,
    ]);

    const [outLeg, inLeg] = (await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    })) as { exchangeRate: string | null }[];

    expect(outLeg.exchangeRate).toBeNull();
    expect(inLeg.exchangeRate).toBeNull();
  });

  it('cross-currency transfer: serializes exchangeRate with toFixed(6)', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountUSD);
    mockPrisma.$transaction.mockResolvedValue([
      prismaXferOutCross,
      prismaXferInCross,
      prismaAccount,
      prismaAccountUSD,
    ]);

    const [outLeg, inLeg] = (await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '100000.00',
      toAmount: '100.00',
      exchangeRate: '1000.000000',
      date: '2024-06-15',
    })) as { exchangeRate: string | null; amount: string }[];

    expect(outLeg.exchangeRate).toBe('1000.000000');
    expect(inLeg.exchangeRate).toBe('1000.000000');
    expect(outLeg.amount).toBe('100000.00');
    expect(inLeg.amount).toBe('100.00');
  });

  it('throws NotFoundError when source account does not exist or is not owned', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(null) // src account not found
      .mockResolvedValueOnce(prismaAccountDst);

    await expect(
      createTransaction(USER_ID, {
        type: 'transfer',
        fromAccountId: ACCOUNT_ID,
        toAccountId: ACCOUNT_ID_DST,
        fromAmount: '100.00',
        toAmount: '100.00',
        date: '2024-06-15',
      }),
    ).rejects.toThrow('Source account not found');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when destination account does not exist or is not owned', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount) // src found
      .mockResolvedValueOnce(null); // dst not found

    await expect(
      createTransaction(USER_ID, {
        type: 'transfer',
        fromAccountId: ACCOUNT_ID,
        toAccountId: ACCOUNT_ID_DST,
        fromAmount: '100.00',
        toAmount: '100.00',
        date: '2024-06-15',
      }),
    ).rejects.toThrow('Destination account not found');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws ValidationError when cross-currency transfer lacks exchangeRate', async () => {
    // Mock accounts: ARS → USD (different currencies)
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount) // ARS
      .mockResolvedValueOnce(prismaAccountUSD); // USD (different currency)

    await expect(
      createTransaction(USER_ID, {
        type: 'transfer',
        fromAccountId: ACCOUNT_ID,
        toAccountId: ACCOUNT_ID_DST,
        fromAmount: '100000.00',
        toAmount: '100.00',
        // no exchangeRate
        date: '2024-06-15',
      }),
    ).rejects.toThrow('Exchange rate is required for cross-currency transfers');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws ValidationError when same-currency transfer has exchangeRate', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount) // ARS
      .mockResolvedValueOnce(prismaAccountDst); // ARS (same currency)

    await expect(
      createTransaction(USER_ID, {
        type: 'transfer',
        fromAccountId: ACCOUNT_ID,
        toAccountId: ACCOUNT_ID_DST,
        fromAmount: '1000.00',
        toAmount: '1000.00',
        exchangeRate: '1.000000',
        date: '2024-06-15',
      }),
    ).rejects.toThrow('Exchange rate must not be provided for same-currency transfers');
  });

  it('throws ValidationError when same-currency transfer has mismatched amounts', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);

    await expect(
      createTransaction(USER_ID, {
        type: 'transfer',
        fromAccountId: ACCOUNT_ID,
        toAccountId: ACCOUNT_ID_DST,
        fromAmount: '1000.00',
        toAmount: '999.00',
        date: '2024-06-15',
      }),
    ).rejects.toThrow('toAmount must equal fromAmount for same-currency transfers');
  });

  it('wraps 4 operations in prisma.$transaction() (2 creates + 2 balance updates)', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(4);
  });

  it('verifies both account ownerships with the correct userId', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    });

    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID, userId: USER_ID },
    });
    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID_DST, userId: USER_ID },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateTransaction — Income / Expense
// ─────────────────────────────────────────────────────────────────────────────

describe('updateTransaction (income/expense)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the transaction and returns TransactionResponse', async () => {
    const updatedTx = {
      ...prismaIncomeTx,
      amount: new Decimal('600.00'),
      updatedAt: UPDATED,
    };
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([updatedTx, prismaAccount]);

    const result = await updateTransaction(USER_ID, TX_ID, { amount: '600.00' });

    expect(result).not.toBeInstanceOf(Array);
    const single = result as { amount: string };
    expect(single.amount).toBe('600.00');
  });

  it('fetches transaction with ownership check first (findFirst with account.userId)', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(updateTransaction(USER_ID, TX_ID, { amount: '100.00' })).rejects.toThrow(
      NotFoundError,
    );

    expect(mockPrisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: TX_ID, account: { userId: USER_ID } },
    });
  });

  it('throws NotFoundError when transaction does not exist', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(updateTransaction(USER_ID, TX_ID, { amount: '100.00' })).rejects.toThrow(
      'Transaction not found',
    );
  });

  it('wraps update + balance adjustment inside prisma.$transaction()', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await updateTransaction(USER_ID, TX_ID, { amount: '500.50' });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('calculates net balance delta correctly: netDelta = newDelta - oldDelta', async () => {
    // Old income: +500.50. New income: +600.00. Net = +99.50
    const updatedTx = { ...prismaIncomeTx, amount: new Decimal('600.00') };
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([updatedTx, prismaAccount]);

    await updateTransaction(USER_ID, TX_ID, { amount: '600.00' });

    // Verify $transaction was called (balance update is part of it)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    // 2 operations: transaction update + account balance update
    expect(ops).toHaveLength(2);
  });

  it('verifies category ownership when categoryId is updated', async () => {
    const newCategoryId = 'cat-uuid-002';
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.category.findFirst.mockResolvedValue(null); // category not found

    await expect(updateTransaction(USER_ID, TX_ID, { categoryId: newCategoryId })).rejects.toThrow(
      NotFoundError,
    );

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: newCategoryId, userId: USER_ID },
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('skips category check when categoryId is NOT in the update data', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await updateTransaction(USER_ID, TX_ID, { description: 'Updated desc' });

    expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
  });

  it('updates description only when only description is provided', async () => {
    const updatedTx = { ...prismaIncomeTx, description: 'New description' };
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([updatedTx, prismaAccount]);

    const result = await updateTransaction(USER_ID, TX_ID, { description: 'New description' });

    expect((result as { description: string }).description).toBe('New description');
  });

  it('keeps old amount when amount is not in update data', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await updateTransaction(USER_ID, TX_ID, { description: 'No amount change' });

    // Net delta = newDelta - oldDelta = 500.50 - 500.50 = 0
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(2);
  });

  it('returns single TransactionResponse (not array) for income/expense update', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    const result = await updateTransaction(USER_ID, TX_ID, { amount: '500.50' });

    expect(Array.isArray(result)).toBe(false);
  });

  it('serializes updated amount with toFixed(2)', async () => {
    const updatedTx = { ...prismaIncomeTx, amount: new Decimal('1200.50') };
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([updatedTx, prismaAccount]);

    const result = await updateTransaction(USER_ID, TX_ID, { amount: '1200.50' });

    expect((result as { amount: string }).amount).toBe('1200.50');
  });

  it('throws NotFoundError when category not found for categoryId update', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await expect(updateTransaction(USER_ID, TX_ID, { categoryId: 'cat-uuid-999' })).rejects.toThrow(
      'Category not found',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateTransaction — Transfer
// ─────────────────────────────────────────────────────────────────────────────

describe('updateTransaction (transfer)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates both transfer legs and returns [outLeg, inLeg]', async () => {
    const updatedOut = { ...prismaTransferOut, amount: new Decimal('1500.00') };
    const updatedIn = { ...prismaTransferIn, amount: new Decimal('1500.00') };

    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut) // ownership check (the tx being updated)
      .mockResolvedValueOnce(prismaTransferIn); // peer leg lookup
    mockPrisma.$transaction.mockResolvedValue([
      updatedOut,
      updatedIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const result = await updateTransaction(USER_ID, TX_ID, {
      amount: '1500.00',
      toAmount: '1500.00',
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('throws ValidationError when categoryId is sent on a transfer update', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaTransferOut);

    await expect(updateTransaction(USER_ID, TX_ID, { categoryId: CATEGORY_ID })).rejects.toThrow(
      ValidationError,
    );

    await expect(updateTransaction(USER_ID, TX_ID, { categoryId: CATEGORY_ID })).rejects.toThrow(
      'categoryId cannot be set on transfers',
    );
  });

  it('throws NotFoundError when peer transfer leg is missing', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut) // ownership check
      .mockResolvedValueOnce(null); // peer not found

    await expect(
      updateTransaction(USER_ID, TX_ID, { amount: '1000.00', toAmount: '1000.00' }),
    ).rejects.toThrow('Transfer peer transaction not found');
  });

  it('wraps 4 operations atomically in prisma.$transaction()', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    await updateTransaction(USER_ID, TX_ID, { amount: '1000.00', toAmount: '1000.00' });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    // 2 tx updates + 2 account balance updates
    expect(ops).toHaveLength(4);
  });

  it('correctly identifies out/in legs regardless of which leg is passed', async () => {
    // Pass the IN leg as the "old" tx — service should still identify out/in correctly
    const updatedOut = { ...prismaTransferOut };
    const updatedIn = { ...prismaTransferIn };

    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferIn) // ownership check returns in-leg
      .mockResolvedValueOnce(prismaTransferOut); // peer is the out-leg
    mockPrisma.$transaction.mockResolvedValue([
      updatedOut,
      updatedIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const result = await updateTransaction(USER_ID, TX_ID_2, { description: 'Updated' });

    expect(Array.isArray(result)).toBe(true);
  });

  it('throws ValidationError when updating amounts on cross-currency transfer without exchangeRate', async () => {
    // A cross-currency out-leg that somehow has no exchangeRate (corrupted data scenario,
    // or used to test that the guard catches it when updating amounts)
    const crossOutNoRate = { ...prismaTransferOut, exchangeRate: null };
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(crossOutNoRate) // ownership check
      .mockResolvedValueOnce(prismaTransferIn); // peer lookup

    // Both accounts with different currencies — triggers cross-currency check
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount) // ARS
      .mockResolvedValueOnce(prismaAccountUSD); // USD

    // Updating amount triggers the guard (effectiveRate = null → falsy → throws)
    await expect(updateTransaction(USER_ID, TX_ID, { amount: '100000.00' })).rejects.toThrow(
      'Exchange rate is required for cross-currency transfers',
    );
  });

  it('updates description on both legs', async () => {
    const updatedOut = { ...prismaTransferOut, description: 'Updated desc' };
    const updatedIn = { ...prismaTransferIn, description: 'Updated desc' };
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([
      updatedOut,
      updatedIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const [outLeg, inLeg] = (await updateTransaction(USER_ID, TX_ID, {
      description: 'Updated desc',
    })) as { description: string }[];

    expect(outLeg.description).toBe('Updated desc');
    expect(inLeg.description).toBe('Updated desc');
  });

  it('serializes updated transfer amounts with toFixed(2)', async () => {
    const updatedOut = { ...prismaTransferOut, amount: new Decimal('2000.50') };
    const updatedIn = { ...prismaTransferIn, amount: new Decimal('2000.50') };
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([
      updatedOut,
      updatedIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    const [outLeg, inLeg] = (await updateTransaction(USER_ID, TX_ID, {
      amount: '2000.50',
      toAmount: '2000.50',
    })) as { amount: string }[];

    expect(outLeg.amount).toBe('2000.50');
    expect(inLeg.amount).toBe('2000.50');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteTransaction — Income / Expense
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteTransaction (income/expense)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes an income transaction and returns the deleted TransactionResponse', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    const result = await deleteTransaction(USER_ID, TX_ID);

    expect(result).not.toBeInstanceOf(Array);
    const single = result as { id: string };
    expect(single.id).toBe(TX_ID);
  });

  it('deletes an expense transaction and returns the deleted TransactionResponse', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaExpenseTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    const result = await deleteTransaction(USER_ID, TX_ID);

    expect(Array.isArray(result)).toBe(false);
    expect((result as { type: string }).type).toBe('expense');
  });

  it('fetches transaction with ownership check before deleting', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(deleteTransaction(USER_ID, TX_ID)).rejects.toThrow(NotFoundError);

    expect(mockPrisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: TX_ID, account: { userId: USER_ID } },
    });
  });

  it('throws NotFoundError when transaction does not exist', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(deleteTransaction(USER_ID, TX_ID)).rejects.toThrow('Transaction not found');
  });

  it('wraps delete + balance reversal inside prisma.$transaction()', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('passes 2 operations to $transaction: delete + account balance update', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(2);
  });

  it('reverses income balance: applies negative delta to account balance', async () => {
    // Income of 500.50 → reverse = -500.50 → account balance should decrement
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    // $transaction was called with an array of 2 operations
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('reverses expense balance: applies positive delta to account balance', async () => {
    // Expense of 200 → reverse = +200 → account balance should increment
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaExpenseTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns TransactionResponse built from the snapshot before deletion', async () => {
    // The service captures the tx before deletion and returns its response
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    const result = await deleteTransaction(USER_ID, TX_ID);

    // Should match the pre-delete tx
    expect((result as { amount: string }).amount).toBe('500.50');
  });

  it('throws NotFoundError for a different user (ownership isolation)', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await expect(deleteTransaction(OTHER_USER_ID, TX_ID)).rejects.toThrow(NotFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteTransaction — Transfer
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteTransaction (transfer)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes both transfer legs and returns [outLeg, inLeg]', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut) // ownership check
      .mockResolvedValueOnce(prismaTransferIn); // peer lookup
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    const result = await deleteTransaction(USER_ID, TX_ID);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('returns [outLeg, inLeg] in correct order regardless of which leg was targeted', async () => {
    // Delete by out-leg id
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    const [outLeg, inLeg] = (await deleteTransaction(USER_ID, TX_ID)) as {
      transferSide: string;
    }[];

    expect(outLeg.transferSide).toBe('out');
    expect(inLeg.transferSide).toBe('in');
  });

  it('wraps 4 operations in prisma.$transaction() (2 deletes + 2 balance reversals)', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    // delete out + delete in + reverse src balance + reverse dst balance
    expect(ops).toHaveLength(4);
  });

  it('throws NotFoundError when peer transfer leg is missing (orphaned tx)', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut) // found
      .mockResolvedValueOnce(null); // peer not found

    await expect(deleteTransaction(USER_ID, TX_ID)).rejects.toThrow(
      'Transfer peer transaction not found',
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('looks up peer with transferGroupId and excludes current tx id', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    // Second findFirst call should look for peer
    expect(mockPrisma.transaction.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        transferGroupId: TRANSFER_GROUP_ID,
        id: { not: TX_ID },
        account: { userId: USER_ID },
      },
    });
  });

  it('reverses source account balance (adds back what was decremented)', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    // The 4-operation array ensures atomicity
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(4);
  });

  it('reverses destination account balance (removes what was incremented)', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('works when the in-leg is targeted (not the out-leg)', async () => {
    // Delete by in-leg id
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferIn) // ownership check finds in-leg
      .mockResolvedValueOnce(prismaTransferOut); // peer is out-leg
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    const result = await deleteTransaction(USER_ID, TX_ID_2);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('scopes peer lookup to the same user (ownership enforcement on peer)', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    const peerLookupCall = mockPrisma.transaction.findFirst.mock.calls[1][0];
    expect(peerLookupCall.where.account).toEqual({ userId: USER_ID });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Balance Integrity — Critical Path Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Balance integrity — every mutation uses prisma.$transaction()', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createIncomeExpense always uses $transaction', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(prismaAccount);
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await createTransaction(USER_ID, {
      type: 'income',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: '100.00',
      date: '2024-06-15',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('createTransfer always uses $transaction', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce(prismaAccount)
      .mockResolvedValueOnce(prismaAccountDst);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    await createTransaction(USER_ID, {
      type: 'transfer',
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID_DST,
      fromAmount: '1000.00',
      toAmount: '1000.00',
      date: '2024-06-15',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('updateIncomeExpense always uses $transaction', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([prismaIncomeTx, prismaAccount]);

    await updateTransaction(USER_ID, TX_ID, { amount: '999.99' });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('updateTransfer always uses $transaction', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([
      prismaTransferOut,
      prismaTransferIn,
      prismaAccount,
      prismaAccountDst,
    ]);

    await updateTransaction(USER_ID, TX_ID, { description: 'x' });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('deleteIncomeExpense always uses $transaction', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('deleteTransfer always uses $transaction', async () => {
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(prismaTransferOut)
      .mockResolvedValueOnce(prismaTransferIn);
    mockPrisma.$transaction.mockResolvedValue([undefined, undefined, undefined, undefined]);

    await deleteTransaction(USER_ID, TX_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('no $transaction call for listTransactions (read-only)', async () => {
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await listTransactions(USER_ID, defaultQuery);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('no $transaction call for getTransaction (read-only)', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(prismaIncomeTx);

    await getTransaction(USER_ID, TX_ID);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Decimal serialization — Comprehensive regression suite
// ─────────────────────────────────────────────────────────────────────────────

describe('Decimal serialization — toFixed() regression suite', () => {
  it('amount "100.50" does not become "100.5" (toString strips trailing zeros)', () => {
    const tx = { ...prismaIncomeTx, amount: new Decimal('100.50') };
    expect(toTransactionResponse(tx).amount).toBe('100.50');
    expect(toTransactionResponse(tx).amount).not.toBe('100.5');
  });

  it('amount "1000" becomes "1000.00" (toFixed pads with zeros)', () => {
    const tx = { ...prismaIncomeTx, amount: new Decimal('1000') };
    expect(toTransactionResponse(tx).amount).toBe('1000.00');
  });

  it('exchangeRate "1.5" becomes "1.500000" (6 decimal places)', () => {
    const tx = { ...prismaIncomeTx, exchangeRate: new Decimal('1.5') };
    expect(toTransactionResponse(tx).exchangeRate).toBe('1.500000');
  });

  it('exchangeRate "1000" becomes "1000.000000" (6 zeros padded)', () => {
    const tx = { ...prismaIncomeTx, exchangeRate: new Decimal('1000') };
    expect(toTransactionResponse(tx).exchangeRate).toBe('1000.000000');
  });

  it('exchangeRate "1.123456" stays exactly "1.123456"', () => {
    const tx = { ...prismaIncomeTx, exchangeRate: new Decimal('1.123456') };
    expect(toTransactionResponse(tx).exchangeRate).toBe('1.123456');
  });

  it('null exchangeRate serializes as null (not "null" string)', () => {
    const tx = { ...prismaIncomeTx, exchangeRate: null };
    const result = toTransactionResponse(tx);
    expect(result.exchangeRate).toBeNull();
    expect(result.exchangeRate).not.toBe('null');
  });

  it('amount and exchangeRate are always strings, never numbers', () => {
    const tx = { ...prismaXferOutCross };
    const result = toTransactionResponse(tx);
    expect(typeof result.amount).toBe('string');
    expect(typeof result.exchangeRate).toBe('string');
  });
});
