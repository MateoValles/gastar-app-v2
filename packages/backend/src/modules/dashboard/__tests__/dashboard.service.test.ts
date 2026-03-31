import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';

// Mock Prisma before importing the service
vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));

// Import after mock setup
import { getSummary } from '../dashboard.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types — loosely typed for mock data (Prisma types are not needed here)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';

const NOW = new Date('2024-06-15T10:00:00.000Z');

// ── Prisma Account rows ───────────────────────────────────────────────────────

const arsAccount1: AnyRecord = {
  id: 'acc-ars-001',
  userId: USER_ID,
  name: 'ARS Checking',
  type: 'checking',
  currency: 'ARS',
  balance: new Decimal('10000.50'),
  createdAt: NOW,
  updatedAt: NOW,
};

const arsAccount2: AnyRecord = {
  id: 'acc-ars-002',
  userId: USER_ID,
  name: 'ARS Savings',
  type: 'savings',
  currency: 'ARS',
  balance: new Decimal('5000.00'),
  createdAt: NOW,
  updatedAt: NOW,
};

const usdAccount: AnyRecord = {
  id: 'acc-usd-001',
  userId: USER_ID,
  name: 'USD Savings',
  type: 'savings',
  currency: 'USD',
  balance: new Decimal('1500.75'),
  createdAt: NOW,
  updatedAt: NOW,
};

const eurAccount: AnyRecord = {
  id: 'acc-eur-001',
  userId: USER_ID,
  name: 'EUR Checking',
  type: 'checking',
  currency: 'EUR',
  balance: new Decimal('800.20'),
  createdAt: NOW,
  updatedAt: NOW,
};

// ── Prisma Category rows ──────────────────────────────────────────────────────

const catFood = { id: 'cat-001', name: 'Food', color: '#FF5733', icon: '🍔' };
const catTransport = { id: 'cat-002', name: 'Transport', color: '#3375FF', icon: '🚗' };

// ── Prisma Transaction rows (for recentTransactions) ─────────────────────────

const baseTx: AnyRecord = {
  id: 'tx-001',
  accountId: arsAccount1.id,
  categoryId: catFood.id,
  type: 'expense',
  amount: new Decimal('150.50'),
  date: NOW,
  createdAt: NOW,
  description: 'Lunch',
  transferSide: null,
  transferGroupId: null,
  transferPeerAccountId: null,
  account: { name: arsAccount1.name, currency: 'ARS' },
  category: { name: catFood.name },
};

const makeTransaction = (overrides: AnyRecord = {}): AnyRecord => ({
  ...baseTx,
  ...overrides,
});

// ── groupBy result helpers ────────────────────────────────────────────────────

const incomeRow = (accountId: string, amount: string) => ({
  accountId,
  _sum: { amount: new Decimal(amount) },
});

const expenseRow = (accountId: string, amount: string) => ({
  accountId,
  _sum: { amount: new Decimal(amount) },
});

const expByCatRow = (categoryId: string, accountId: string, amount: string) => ({
  categoryId,
  accountId,
  _sum: { amount: new Decimal(amount) },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: set up mock prisma for a typical full call
// ─────────────────────────────────────────────────────────────────────────────

function setupMocks(
  opts: {
    accounts?: AnyRecord[];
    categories?: AnyRecord[];
    incomeGrouped?: AnyRecord[];
    expenseGrouped?: AnyRecord[];
    expByCatGrouped?: AnyRecord[];
    recentRaw?: AnyRecord[];
  } = {},
) {
  const mockPrisma = getMockPrisma();
  const {
    accounts = [],
    categories = [],
    incomeGrouped = [],
    expenseGrouped = [],
    expByCatGrouped = [],
    recentRaw = [],
  } = opts;

  // Step 1: accounts + categories (parallel)
  mockPrisma.account.findMany.mockResolvedValue(accounts);
  mockPrisma.category.findMany.mockResolvedValue(categories);

  // Step 4: 4 parallel queries (order matches Promise.all in service)
  mockPrisma.transaction.groupBy
    .mockResolvedValueOnce(incomeGrouped) // [1] income
    .mockResolvedValueOnce(expenseGrouped) // [2] expense
    .mockResolvedValueOnce(expByCatGrouped); // [3] expense by category

  mockPrisma.transaction.findMany.mockResolvedValue(recentRaw); // [4] recent
}

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — User with no accounts
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — user with no accounts', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty arrays for all fields when user has no accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.category.findMany.mockResolvedValue([]);

    const result = await getSummary(USER_ID);

    expect(result).toEqual({
      currencyGroups: [],
      accounts: [],
      expensesByCategory: [],
      recentTransactions: [],
    });
  });

  it('does NOT query transactions when user has no accounts (early return)', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.category.findMany.mockResolvedValue([]);

    await getSummary(USER_ID);

    expect(mockPrisma.transaction.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('queries accounts with userId filter', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.category.findMany.mockResolvedValue([]);

    await getSummary(USER_ID);

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('queries categories with userId filter even when no accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.category.findMany.mockResolvedValue([]);

    await getSummary(USER_ID);

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      select: { id: true, name: true, color: true, icon: true },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — Single currency (ARS only)
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — single currency (ARS)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns one currency group for a single-currency user', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    const result = await getSummary(USER_ID);

    expect(result.currencyGroups).toHaveLength(1);
    expect(result.currencyGroups[0].currency).toBe('ARS');
  });

  it('totalBalance is the sum of all account balances in that currency', async () => {
    setupMocks({ accounts: [arsAccount1, arsAccount2], categories: [] });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    // 10000.50 + 5000.00 = 15000.50
    expect(arsGroup.totalBalance).toBe('15000.50');
  });

  it('accountCount matches the number of accounts in that currency', async () => {
    setupMocks({ accounts: [arsAccount1, arsAccount2], categories: [] });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.accountCount).toBe(2);
  });

  it('monthlyIncome sums income groupBy rows for that currency', async () => {
    setupMocks({
      accounts: [arsAccount1, arsAccount2],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '3000.00'), incomeRow(arsAccount2.id, '1500.00')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyIncome).toBe('4500.00');
  });

  it('monthlyExpenses sums expense groupBy rows for that currency', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [],
      expenseGrouped: [expenseRow(arsAccount1.id, '800.25')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyExpenses).toBe('800.25');
  });

  it('monthlyNet = monthlyIncome - monthlyExpenses', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '5000.00')],
      expenseGrouped: [expenseRow(arsAccount1.id, '1200.00')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyNet).toBe('3800.00');
  });

  it('monthlyNet is negative when expenses exceed income', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '1000.00')],
      expenseGrouped: [expenseRow(arsAccount1.id, '2000.00')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyNet).toBe('-1000.00');
  });

  it('monthlyIncome defaults to "0.00" when no income transactions this month', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [], incomeGrouped: [] });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyIncome).toBe('0.00');
  });

  it('monthlyExpenses defaults to "0.00" when no expense transactions this month', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [], expenseGrouped: [] });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyExpenses).toBe('0.00');
  });

  it('accounts list is mapped to AccountResponse shape including balance as toFixed(2)', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    const result = await getSummary(USER_ID);

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      id: arsAccount1.id,
      userId: USER_ID,
      name: 'ARS Checking',
      type: 'checking',
      currency: 'ARS',
      balance: '10000.50',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — Multiple currencies (ARS + USD + EUR)
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — multiple currencies (ARS + USD + EUR)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns one currency group per distinct currency', async () => {
    setupMocks({ accounts: [arsAccount1, usdAccount, eurAccount], categories: [] });

    const result = await getSummary(USER_ID);

    expect(result.currencyGroups).toHaveLength(3);
    const currencies = result.currencyGroups.map((g) => g.currency).sort();
    expect(currencies).toEqual(['ARS', 'EUR', 'USD']);
  });

  it('NEVER consolidates balances across currencies — each group is independent', async () => {
    setupMocks({ accounts: [arsAccount1, usdAccount], categories: [] });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    const usdGroup = result.currencyGroups.find((g) => g.currency === 'USD')!;

    expect(arsGroup.totalBalance).toBe('10000.50');
    expect(usdGroup.totalBalance).toBe('1500.75');
  });

  it('income/expense totals are isolated per currency bucket', async () => {
    setupMocks({
      accounts: [arsAccount1, usdAccount],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '3000.00'), incomeRow(usdAccount.id, '500.00')],
      expenseGrouped: [expenseRow(arsAccount1.id, '1000.00'), expenseRow(usdAccount.id, '200.00')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    const usdGroup = result.currencyGroups.find((g) => g.currency === 'USD')!;

    expect(arsGroup.monthlyIncome).toBe('3000.00');
    expect(arsGroup.monthlyExpenses).toBe('1000.00');
    expect(usdGroup.monthlyIncome).toBe('500.00');
    expect(usdGroup.monthlyExpenses).toBe('200.00');
  });

  it('two ARS accounts combined into a single ARS group with summed balance', async () => {
    setupMocks({ accounts: [arsAccount1, arsAccount2, usdAccount], categories: [] });

    const result = await getSummary(USER_ID);

    // ARS accounts: 10000.50 + 5000.00 = 15000.50
    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.totalBalance).toBe('15000.50');
    expect(arsGroup.accountCount).toBe(2);

    // USD account is separate
    const usdGroup = result.currencyGroups.find((g) => g.currency === 'USD')!;
    expect(usdGroup.totalBalance).toBe('1500.75');
    expect(usdGroup.accountCount).toBe(1);
  });

  it('income for one currency does not bleed into another currency group', async () => {
    setupMocks({
      accounts: [arsAccount1, usdAccount],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '5000.00')],
      // No USD income
    });

    const result = await getSummary(USER_ID);

    const usdGroup = result.currencyGroups.find((g) => g.currency === 'USD')!;
    expect(usdGroup.monthlyIncome).toBe('0.00');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — Decimal serialization (toFixed(2) for money)
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — Decimal serialization with toFixed(2)', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('totalBalance preserves trailing zeros — "10000.50" not "10000.5"', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.totalBalance).toBe('10000.50');
    expect(arsGroup.totalBalance).not.toBe('10000.5');
  });

  it('monthlyIncome serializes with 2 decimal places even for round amounts', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '3000')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyIncome).toBe('3000.00');
  });

  it('monthlyExpenses serializes with 2 decimal places', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [],
      expenseGrouped: [expenseRow(arsAccount1.id, '450.10')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyExpenses).toBe('450.10');
  });

  it('monthlyNet serializes with 2 decimal places', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '1000.00')],
      expenseGrouped: [expenseRow(arsAccount1.id, '333.33')],
    });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.monthlyNet).toBe('666.67');
  });

  it('expensesByCategory total serializes with 2 decimal places', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [catFood],
      expByCatGrouped: [expByCatRow(catFood.id, arsAccount1.id, '250.50')],
    });

    const result = await getSummary(USER_ID);

    expect(result.expensesByCategory[0].total).toBe('250.50');
    expect(result.expensesByCategory[0].total).not.toBe('250.5');
  });

  it('recentTransactions amount serializes with 2 decimal places', async () => {
    const tx = makeTransaction({ amount: new Decimal('99.90') });
    setupMocks({ accounts: [arsAccount1], categories: [], recentRaw: [tx] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions[0].amount).toBe('99.90');
    expect(result.recentTransactions[0].amount).not.toBe('99.9');
  });

  it('zero totalBalance serializes as "0.00" not "0"', async () => {
    const zeroAccount = { ...arsAccount1, balance: new Decimal('0') };
    setupMocks({ accounts: [zeroAccount], categories: [] });

    const result = await getSummary(USER_ID);

    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.totalBalance).toBe('0.00');
  });

  it('all monetary string fields are of type string', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [],
      incomeGrouped: [incomeRow(arsAccount1.id, '1000.00')],
      expenseGrouped: [expenseRow(arsAccount1.id, '500.00')],
    });

    const result = await getSummary(USER_ID);

    const g = result.currencyGroups[0];
    expect(typeof g.totalBalance).toBe('string');
    expect(typeof g.monthlyIncome).toBe('string');
    expect(typeof g.monthlyExpenses).toBe('string');
    expect(typeof g.monthlyNet).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — expensesByCategory
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — expensesByCategory', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array when no expense transactions have a category', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [], expByCatGrouped: [] });

    const result = await getSummary(USER_ID);

    expect(result.expensesByCategory).toEqual([]);
  });

  it('maps categoryId, categoryName, color, icon from the category map', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [catFood],
      expByCatGrouped: [expByCatRow(catFood.id, arsAccount1.id, '200.00')],
    });

    const result = await getSummary(USER_ID);

    expect(result.expensesByCategory).toHaveLength(1);
    expect(result.expensesByCategory[0]).toMatchObject({
      categoryId: catFood.id,
      categoryName: 'Food',
      categoryColor: '#FF5733',
      categoryIcon: '🍔',
      currency: 'ARS',
      total: '200.00',
    });
  });

  it('uses "Unknown" as fallback categoryName when category not found in map', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [], // empty — category won't be in the map
      expByCatGrouped: [expByCatRow('cat-ghost', arsAccount1.id, '100.00')],
    });

    const result = await getSummary(USER_ID);

    expect(result.expensesByCategory[0].categoryName).toBe('Unknown');
    expect(result.expensesByCategory[0].categoryColor).toBeNull();
    expect(result.expensesByCategory[0].categoryIcon).toBeNull();
  });

  it('groups same-category spend across two ARS accounts into one item', async () => {
    setupMocks({
      accounts: [arsAccount1, arsAccount2],
      categories: [catFood],
      expByCatGrouped: [
        expByCatRow(catFood.id, arsAccount1.id, '100.00'),
        expByCatRow(catFood.id, arsAccount2.id, '50.00'),
      ],
    });

    const result = await getSummary(USER_ID);

    expect(result.expensesByCategory).toHaveLength(1);
    expect(result.expensesByCategory[0].total).toBe('150.00');
  });

  it('keeps same-category spend SEPARATE across different currencies', async () => {
    setupMocks({
      accounts: [arsAccount1, usdAccount],
      categories: [catFood],
      expByCatGrouped: [
        expByCatRow(catFood.id, arsAccount1.id, '100.00'),
        expByCatRow(catFood.id, usdAccount.id, '50.00'),
      ],
    });

    const result = await getSummary(USER_ID);

    // Same categoryId but different currencies → 2 distinct items
    expect(result.expensesByCategory).toHaveLength(2);
    const arsFoodItem = result.expensesByCategory.find((i) => i.currency === 'ARS')!;
    const usdFoodItem = result.expensesByCategory.find((i) => i.currency === 'USD')!;
    expect(arsFoodItem.total).toBe('100.00');
    expect(usdFoodItem.total).toBe('50.00');
  });

  it('sorts items descending by total (highest spend first)', async () => {
    setupMocks({
      accounts: [arsAccount1],
      categories: [catFood, catTransport],
      expByCatGrouped: [
        expByCatRow(catFood.id, arsAccount1.id, '50.00'),
        expByCatRow(catTransport.id, arsAccount1.id, '200.00'),
      ],
    });

    const result = await getSummary(USER_ID);

    expect(result.expensesByCategory).toHaveLength(2);
    expect(result.expensesByCategory[0].categoryId).toBe(catTransport.id); // 200 first
    expect(result.expensesByCategory[1].categoryId).toBe(catFood.id); // 50 second
  });

  it('includes currency field derived from the account currency map', async () => {
    setupMocks({
      accounts: [usdAccount],
      categories: [catTransport],
      expByCatGrouped: [expByCatRow(catTransport.id, usdAccount.id, '75.00')],
    });

    const result = await getSummary(USER_ID);

    expect(result.expensesByCategory[0].currency).toBe('USD');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — recentTransactions
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — recentTransactions', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array when there are no transactions', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [], recentRaw: [] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions).toEqual([]);
  });

  it('maps all required fields from a transaction row', async () => {
    const tx = makeTransaction();
    setupMocks({ accounts: [arsAccount1], categories: [], recentRaw: [tx] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions[0]).toMatchObject({
      id: 'tx-001',
      accountId: arsAccount1.id,
      accountName: 'ARS Checking',
      categoryId: catFood.id,
      categoryName: 'Food',
      type: 'expense',
      amount: '150.50',
      currency: 'ARS',
      date: '2024-06-15',
      description: 'Lunch',
      transferSide: null,
    });
  });

  it('date field is formatted as YYYY-MM-DD (no time component)', async () => {
    const tx = makeTransaction({ date: new Date('2024-03-22T23:45:00.000Z') });
    setupMocks({ accounts: [arsAccount1], categories: [], recentRaw: [tx] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions[0].date).toBe('2024-03-22');
    expect(result.recentTransactions[0].date).not.toContain('T');
  });

  it('categoryName is null when transaction has no category', async () => {
    const tx = makeTransaction({ categoryId: null, category: null });
    setupMocks({ accounts: [arsAccount1], categories: [], recentRaw: [tx] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions[0].categoryId).toBeNull();
    expect(result.recentTransactions[0].categoryName).toBeNull();
  });

  it('includes transfer transactions with transferSide set', async () => {
    const tx = makeTransaction({
      type: 'transfer',
      transferSide: 'out',
      categoryId: null,
      category: null,
      description: 'Transfer to savings',
    });
    setupMocks({ accounts: [arsAccount1], categories: [], recentRaw: [tx] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions[0].type).toBe('transfer');
    expect(result.recentTransactions[0].transferSide).toBe('out');
  });

  it('queries recent transactions with take: 10 (limit enforced)', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('queries recent transactions ordered by date desc then createdAt desc', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  });

  it('currency comes from the account, not the transaction row directly', async () => {
    const tx = makeTransaction({ account: { name: 'USD Savings', currency: 'USD' } });
    setupMocks({ accounts: [usdAccount], categories: [], recentRaw: [tx] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions[0].currency).toBe('USD');
  });

  it('description can be null (nullable field)', async () => {
    const tx = makeTransaction({ description: null });
    setupMocks({ accounts: [arsAccount1], categories: [], recentRaw: [tx] });

    const result = await getSummary(USER_ID);

    expect(result.recentTransactions[0].description).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — Query structure and ownership enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — query structure and ownership', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches accounts AND categories in parallel (Step 1)', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    // Both should have been called once each — parallel means no sequential dependency
    expect(mockPrisma.account.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.category.findMany).toHaveBeenCalledTimes(1);
  });

  it('transaction groupBy queries are scoped to accountIds (2-step ownership)', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    // All groupBy calls must scope to accountId in accountIds
    const calls = mockPrisma.transaction.groupBy.mock.calls;
    for (const [callArg] of calls) {
      expect(callArg.where.accountId).toMatchObject({ in: [arsAccount1.id] });
    }
  });

  it('income groupBy filters on type: income', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    const incomeCall = mockPrisma.transaction.groupBy.mock.calls[0][0];
    expect(incomeCall.where.type).toBe('income');
  });

  it('expense groupBy filters on type: expense', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    const expenseCall = mockPrisma.transaction.groupBy.mock.calls[1][0];
    expect(expenseCall.where.type).toBe('expense');
  });

  it('expense-by-category groupBy filters on type: expense and categoryId not null', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    const catCall = mockPrisma.transaction.groupBy.mock.calls[2][0];
    expect(catCall.where.type).toBe('expense');
    expect(catCall.where.categoryId).toEqual({ not: null });
  });

  it('recent transactions query uses include for account name and category name', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          account: { select: { name: true, currency: true } },
          category: { select: { name: true } },
        },
      }),
    );
  });

  it('uses lt (exclusive) for month end boundary — not lte', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    await getSummary(USER_ID);

    const incomeCall = mockPrisma.transaction.groupBy.mock.calls[0][0];
    expect(incomeCall.where.date).toHaveProperty('lt');
    expect(incomeCall.where.date).not.toHaveProperty('lte');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary — Full response shape
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary — full response shape', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all four top-level keys', async () => {
    setupMocks({ accounts: [arsAccount1], categories: [] });

    const result = await getSummary(USER_ID);

    expect(result).toHaveProperty('currencyGroups');
    expect(result).toHaveProperty('accounts');
    expect(result).toHaveProperty('expensesByCategory');
    expect(result).toHaveProperty('recentTransactions');
  });

  it('accounts array reuses toAccountResponse mapper (balance as toFixed(2) string)', async () => {
    const account = { ...arsAccount1, balance: new Decimal('2500.50') };
    setupMocks({ accounts: [account], categories: [] });

    const result = await getSummary(USER_ID);

    expect(result.accounts[0].balance).toBe('2500.50');
    expect(typeof result.accounts[0].balance).toBe('string');
  });

  it('accounts list contains all user accounts regardless of currency', async () => {
    setupMocks({ accounts: [arsAccount1, usdAccount, eurAccount], categories: [] });

    const result = await getSummary(USER_ID);

    expect(result.accounts).toHaveLength(3);
    const ids = result.accounts.map((a) => a.id).sort();
    expect(ids).toEqual([arsAccount1.id, eurAccount.id, usdAccount.id].sort());
  });

  it('complete response for multi-currency user with transactions is well-formed', async () => {
    const tx = makeTransaction({
      account: { name: arsAccount1.name, currency: 'ARS' },
    });
    setupMocks({
      accounts: [arsAccount1, usdAccount],
      categories: [catFood],
      incomeGrouped: [incomeRow(arsAccount1.id, '3000.00')],
      expenseGrouped: [expenseRow(arsAccount1.id, '1000.00')],
      expByCatGrouped: [expByCatRow(catFood.id, arsAccount1.id, '1000.00')],
      recentRaw: [tx],
    });

    const result = await getSummary(USER_ID);

    // currencyGroups
    expect(result.currencyGroups).toHaveLength(2);
    const arsGroup = result.currencyGroups.find((g) => g.currency === 'ARS')!;
    expect(arsGroup.totalBalance).toBe('10000.50');
    expect(arsGroup.monthlyIncome).toBe('3000.00');
    expect(arsGroup.monthlyExpenses).toBe('1000.00');
    expect(arsGroup.monthlyNet).toBe('2000.00');

    // accounts
    expect(result.accounts).toHaveLength(2);

    // expensesByCategory
    expect(result.expensesByCategory).toHaveLength(1);
    expect(result.expensesByCategory[0].total).toBe('1000.00');

    // recentTransactions
    expect(result.recentTransactions).toHaveLength(1);
    expect(result.recentTransactions[0].amount).toBe('150.50');
  });
});
