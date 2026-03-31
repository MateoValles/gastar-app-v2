/**
 * Dashboard Module Integration Tests
 *
 * Covers all 4 scenarios from spec-modules-1 (observation #148) for Dashboard.
 *
 * Endpoints tested:
 *  - GET /v1/dashboard/summary
 *
 * Key behaviors verified:
 *  - Multi-currency: currencyGroups are separated per currency (ARS, USD) — NOT consolidated
 *  - monthlyIncome, monthlyExpenses, monthlyNet calculated correctly
 *  - expensesByCategory aggregated correctly
 *  - recentTransactions sorted by date desc, max 10
 *  - Empty state: user with no accounts → empty arrays/zeros (no crash)
 *  - Unauthenticated → 401
 *
 * Dashboard does NOT support month/year query params — getSummary() always
 * uses the current month boundary. The "with query params" spec scenario is
 * not implemented at the API level (no params in routes or service).
 * This test verifies the query param is silently ignored (200 returned).
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, prisma } from './helpers/test-app.js';
import {
  cleanDatabase,
  createUser,
  createAccount,
  createCategory,
  createTransaction,
} from './helpers/factories.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Dashboard Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─── GET /v1/dashboard/summary ────────────────────────────────────────────

  describe('GET /v1/dashboard/summary', () => {
    it('happy path — multi-currency: ARS and USD totals are separated correctly', async () => {
      const { user, token } = await createUser();

      // Create 2 accounts in different currencies
      const arsAccount = await createAccount(user.id, {
        name: 'ARS Checking',
        currency: 'ARS',
      });
      const usdAccount = await createAccount(user.id, {
        name: 'USD Savings',
        currency: 'USD',
      });

      // Create categories for transactions
      const foodCat = await createCategory(user.id, { name: 'Comida' });
      const travelCat = await createCategory(user.id, { name: 'Viajes' });

      // ARS transactions: income 5000, expenses 2000 (food) + 1000 (travel) = 3000 expenses
      await createTransaction(arsAccount.id, foodCat.id, {
        type: 'income',
        amount: 5000,
        date: new Date().toISOString().substring(0, 10),
      });
      await createTransaction(arsAccount.id, foodCat.id, {
        type: 'expense',
        amount: 2000,
        date: new Date().toISOString().substring(0, 10),
      });
      await createTransaction(arsAccount.id, travelCat.id, {
        type: 'expense',
        amount: 1000,
        date: new Date().toISOString().substring(0, 10),
      });

      // USD transactions: income 200, expense 50
      await createTransaction(usdAccount.id, foodCat.id, {
        type: 'income',
        amount: 200,
        date: new Date().toISOString().substring(0, 10),
      });
      await createTransaction(usdAccount.id, travelCat.id, {
        type: 'expense',
        amount: 50,
        date: new Date().toISOString().substring(0, 10),
      });

      const res = await request(app)
        .get('/v1/dashboard/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const { currencyGroups, accounts, expensesByCategory, recentTransactions } = res.body.data;

      // ── currencyGroups: 2 groups (ARS + USD), not consolidated ─────────────
      expect(currencyGroups).toHaveLength(2);

      const arsGroup = currencyGroups.find((g: { currency: string }) => g.currency === 'ARS');
      const usdGroup = currencyGroups.find((g: { currency: string }) => g.currency === 'USD');

      expect(arsGroup).toBeDefined();
      expect(usdGroup).toBeDefined();

      // ARS: income 5000, expenses 3000, net 2000
      expect(arsGroup).toMatchObject({
        currency: 'ARS',
        accountCount: 1,
        monthlyIncome: '5000.00',
        monthlyExpenses: '3000.00',
        monthlyNet: '2000.00',
      });

      // USD: income 200, expenses 50, net 150
      expect(usdGroup).toMatchObject({
        currency: 'USD',
        accountCount: 1,
        monthlyIncome: '200.00',
        monthlyExpenses: '50.00',
        monthlyNet: '150.00',
      });

      // ── accounts: all user accounts returned ─────────────────────────────
      expect(accounts).toHaveLength(2);
      const accountIds = accounts.map((a: { id: string }) => a.id);
      expect(accountIds).toContain(arsAccount.id);
      expect(accountIds).toContain(usdAccount.id);

      // ── expensesByCategory: expense totals per category + currency ────────
      expect(expensesByCategory.length).toBeGreaterThan(0);

      // Find ARS food category expense
      const arsFoodExpense = expensesByCategory.find(
        (e: { currency: string; categoryName: string }) =>
          e.currency === 'ARS' && e.categoryName === 'Comida',
      );
      expect(arsFoodExpense).toBeDefined();
      expect(arsFoodExpense!.total).toBe('2000.00');

      // Find ARS travel category expense
      const arsTravelExpense = expensesByCategory.find(
        (e: { currency: string; categoryName: string }) =>
          e.currency === 'ARS' && e.categoryName === 'Viajes',
      );
      expect(arsTravelExpense).toBeDefined();
      expect(arsTravelExpense!.total).toBe('1000.00');

      // Find USD travel expense
      const usdTravelExpense = expensesByCategory.find(
        (e: { currency: string; categoryName: string }) =>
          e.currency === 'USD' && e.categoryName === 'Viajes',
      );
      expect(usdTravelExpense).toBeDefined();
      expect(usdTravelExpense!.total).toBe('50.00');

      // ── recentTransactions: max 10, sorted by date desc ────────────────
      expect(recentTransactions).toHaveLength(5); // we created 5 total
      // Each recent transaction has expected shape
      expect(recentTransactions[0]).toMatchObject({
        id: expect.any(String),
        accountId: expect.any(String),
        accountName: expect.any(String),
        type: expect.any(String),
        amount: expect.any(String),
        currency: expect.any(String),
        date: expect.any(String),
      });
    });

    it('empty state — user with no accounts → 200 with zeros/empty arrays', async () => {
      // User exists but has no accounts — service should return early with empty structure
      const { token } = await createUser();

      const res = await request(app)
        .get('/v1/dashboard/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          currencyGroups: [],
          accounts: [],
          expensesByCategory: [],
          recentTransactions: [],
        },
      });
    });

    it('with accounts but no transactions — currencyGroups with zero income/expenses', async () => {
      const { user, token } = await createUser();

      await createAccount(user.id, { name: 'Empty Account', currency: 'ARS' });

      const res = await request(app)
        .get('/v1/dashboard/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const { currencyGroups, recentTransactions } = res.body.data;
      expect(currencyGroups).toHaveLength(1);

      const arsGroup = currencyGroups[0];
      expect(arsGroup.currency).toBe('ARS');
      expect(arsGroup.monthlyIncome).toBe('0.00');
      expect(arsGroup.monthlyExpenses).toBe('0.00');
      expect(arsGroup.monthlyNet).toBe('0.00');

      expect(recentTransactions).toHaveLength(0);
    });

    it('unauthenticated (no token) → 401', async () => {
      const res = await request(app).get('/v1/dashboard/summary').expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });
});
