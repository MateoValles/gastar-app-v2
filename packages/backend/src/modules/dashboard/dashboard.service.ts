import { Decimal } from '@prisma/client/runtime/library';
import type {
  DashboardSummaryResponse,
  CurrencyGroupSummary,
  ExpenseByCategoryItem,
  RecentTransactionItem,
  Currency,
  TransactionType,
  TransferSide,
} from '@gastar/shared';
import { toAccountResponse } from '@/modules/accounts/accounts.service.js';
import { prisma } from '@/lib/prisma.js';

/**
 * Dashboard Service
 *
 * Provides aggregated data for the frontend dashboard in a single call.
 *
 * Ownership enforcement: accounts are fetched with `userId`, and all
 * transaction queries are scoped to `accountId: { in: accountIds }` — a
 * 2-step ownership pattern required because Prisma `groupBy` does NOT support
 * nested relation filters (e.g., `account: { userId }` in groupBy where).
 *
 * Multi-currency: aggregations are NEVER consolidated across currencies.
 * Each `CurrencyGroupSummary` entry represents a distinct currency bucket.
 *
 * Transfer exclusion: income/expense groupBy queries explicitly filter on
 * `type: 'income'` / `type: 'expense'` — transfers are excluded from
 * financial aggregations. Transfers still appear in recentTransactions.
 *
 * Decimal arithmetic: uses `@prisma/client/runtime/library` Decimal
 * (same pattern as transactions.service.ts) to avoid floating-point errors.
 */

const ZERO = new Decimal(0);

export async function getSummary(userId: string): Promise<DashboardSummaryResponse> {
  // ── Step 1: Pre-fetch accounts + categories in parallel ─────────────────────
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, icon: true },
    }),
  ]);

  // Early return: user has no accounts — all arrays are empty, no errors.
  if (accounts.length === 0) {
    return {
      currencyGroups: [],
      accounts: [],
      expensesByCategory: [],
      recentTransactions: [],
    };
  }

  // ── Step 2: Build lookup maps ────────────────────────────────────────────────
  const accountCurrencyMap = new Map<string, Currency>(
    accounts.map((a) => [a.id, a.currency as Currency]),
  );
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountIds = accounts.map((a) => a.id);

  // ── Step 3: Current month boundaries (UTC) ───────────────────────────────────
  // monthStart: first moment of the month (inclusive, gte)
  // monthEnd:   first moment of the NEXT month (exclusive, lt) — avoids the
  //             last-day-at-midnight bug where `lte: lastDay00:00:00` misses
  //             any transaction that occurs after midnight on the final day.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  // ── Step 4: 4 parallel queries ───────────────────────────────────────────────
  const [incomeGrouped, expenseGrouped, expenseByCatGrouped, recentRaw] = await Promise.all([
    // [1] Monthly income grouped by accountId (transfers excluded by type filter)
    prisma.transaction.groupBy({
      by: ['accountId'],
      where: {
        accountId: { in: accountIds },
        type: 'income',
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),

    // [2] Monthly expenses grouped by accountId (transfers excluded by type filter)
    prisma.transaction.groupBy({
      by: ['accountId'],
      where: {
        accountId: { in: accountIds },
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),

    // [3] Monthly expenses grouped by categoryId + accountId (for currency resolution)
    // categoryId: { not: null } ensures we only get categorised expense transactions.
    prisma.transaction.groupBy({
      by: ['categoryId', 'accountId'],
      where: {
        accountId: { in: accountIds },
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),

    // [4] Most recent 10 transactions (all types, including transfers for display)
    prisma.transaction.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      include: {
        account: { select: { name: true, currency: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  // ── Step 5: Build currencyGroups ─────────────────────────────────────────────
  // Initialize per-currency accumulators from accounts (totalBalance + accountCount)
  const currencyAgg = new Map<
    Currency,
    { totalBalance: Decimal; accountCount: number; income: Decimal; expenses: Decimal }
  >();

  for (const acct of accounts) {
    const cur = acct.currency as Currency;
    const agg = currencyAgg.get(cur) ?? {
      totalBalance: ZERO,
      accountCount: 0,
      income: ZERO,
      expenses: ZERO,
    };
    agg.totalBalance = agg.totalBalance.plus(acct.balance);
    agg.accountCount += 1;
    currencyAgg.set(cur, agg);
  }

  // Accumulate monthly income sums into currency buckets
  for (const row of incomeGrouped) {
    const cur = accountCurrencyMap.get(row.accountId)!;
    const agg = currencyAgg.get(cur)!;
    agg.income = agg.income.plus(row._sum.amount ?? ZERO);
  }

  // Accumulate monthly expense sums into currency buckets
  for (const row of expenseGrouped) {
    const cur = accountCurrencyMap.get(row.accountId)!;
    const agg = currencyAgg.get(cur)!;
    agg.expenses = agg.expenses.plus(row._sum.amount ?? ZERO);
  }

  const currencyGroups: CurrencyGroupSummary[] = [...currencyAgg.entries()].map(
    ([currency, agg]) => ({
      currency,
      totalBalance: agg.totalBalance.toFixed(2),
      accountCount: agg.accountCount,
      monthlyIncome: agg.income.toFixed(2),
      monthlyExpenses: agg.expenses.toFixed(2),
      monthlyNet: agg.income.minus(agg.expenses).toFixed(2),
    }),
  );

  // ── Step 6: Build expensesByCategory ─────────────────────────────────────────
  // Aggregate by compound key [categoryId:currency] to group same-category spend
  // across multiple accounts in the same currency.
  const catCurKey = (catId: string, cur: Currency) => `${catId}:${cur}`;
  const catCurAgg = new Map<string, { categoryId: string; currency: Currency; total: Decimal }>();

  for (const row of expenseByCatGrouped) {
    if (!row.categoryId) continue; // Safety: filtered in query, TS needs the guard
    const cur = accountCurrencyMap.get(row.accountId)!;
    const key = catCurKey(row.categoryId, cur);
    const agg = catCurAgg.get(key) ?? {
      categoryId: row.categoryId,
      currency: cur,
      total: ZERO,
    };
    agg.total = agg.total.plus(row._sum.amount ?? ZERO);
    catCurAgg.set(key, agg);
  }

  const expensesByCategory: ExpenseByCategoryItem[] = [...catCurAgg.values()]
    .map((agg) => {
      const cat = categoryMap.get(agg.categoryId);
      return {
        categoryId: agg.categoryId,
        categoryName: cat?.name ?? 'Unknown', // Fallback: shouldn't happen (Restrict delete)
        categoryColor: cat?.color ?? null,
        categoryIcon: cat?.icon ?? null,
        currency: agg.currency,
        total: agg.total.toFixed(2),
      };
    })
    // Sort descending by total so the donut chart shows highest spend first
    .sort((a, b) => new Decimal(b.total).cmp(new Decimal(a.total)));

  // ── Step 7: Map recentTransactions ───────────────────────────────────────────
  const recentTransactions: RecentTransactionItem[] = recentRaw.map((tx) => ({
    id: tx.id,
    accountId: tx.accountId,
    accountName: tx.account.name,
    categoryId: tx.categoryId,
    categoryName: tx.category?.name ?? null,
    type: tx.type as TransactionType,
    amount: tx.amount.toFixed(2),
    currency: tx.account.currency as Currency,
    date: tx.date.toISOString().slice(0, 10), // YYYY-MM-DD (no time component)
    description: tx.description,
    transferSide: tx.transferSide as TransferSide | null,
  }));

  return {
    currencyGroups,
    accounts: accounts.map(toAccountResponse),
    expensesByCategory,
    recentTransactions,
  };
}
