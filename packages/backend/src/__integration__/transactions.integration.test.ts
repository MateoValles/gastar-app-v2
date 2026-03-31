/**
 * Transactions Module Integration Tests
 *
 * Covers all 27 scenarios from spec-modules-2 (observation #149) for Transactions.
 *
 * Endpoints tested:
 *  - POST   /v1/transactions              — create income, expense, or transfer
 *  - GET    /v1/transactions              — list with filters + pagination
 *  - GET    /v1/transactions/:id          — get single transaction
 *  - PATCH  /v1/transactions/:id          — update (income/expense or transfer)
 *  - DELETE /v1/transactions/:id          — delete (income/expense or transfer)
 *
 * Key behaviors verified:
 *  - Balance integrity: every mutation updates Account.balance atomically
 *  - Transfers: 2 rows sharing transferGroupId, out-leg and in-leg
 *  - Same-currency transfers: fromAmount === toAmount, exchangeRate null
 *  - Cross-currency transfers: amounts can differ, exchangeRate required
 *  - Ownership isolation: users cannot access other users' transactions
 *  - Pagination: page/limit meta returned correctly
 *  - Filters: accountId, categoryId, type, dateFrom/dateTo
 *
 * IMPORTANT: Transfers use the SAME endpoint as income/expense:
 *   POST /v1/transactions with { type: 'transfer', fromAccountId, toAccountId, ... }
 *   PATCH /DELETE /v1/transactions/:id (works for both regular txs and transfers)
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
  createTransfer,
} from './helpers/factories.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Transactions Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─── POST /v1/transactions — Income/Expense ───────────────────────────────

  describe('POST /v1/transactions — income/expense creation', () => {
    it('income → 201 + Account.balance incremented atomically', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { currency: 'ARS' });
      const category = await createCategory(user.id);

      // Verify initial balance
      const initialAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(initialAccount!.balance.toNumber()).toBe(0);

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'income',
          accountId: account.id,
          categoryId: category.id,
          amount: '500.00',
          date: '2026-01-15',
          description: 'Test income',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          accountId: account.id,
          categoryId: category.id,
          type: 'income',
          amount: '500.00',
          date: '2026-01-15',
          transferGroupId: null,
          transferSide: null,
        },
      });

      // Verify balance was incremented atomically
      const updatedAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(updatedAccount!.balance.toNumber()).toBe(500);
    });

    it('expense → 201 + Account.balance decremented atomically', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { balance: 1000 }); // pre-funded
      const category = await createCategory(user.id);

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          accountId: account.id,
          categoryId: category.id,
          amount: '300.00',
          date: '2026-01-15',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          type: 'expense',
          amount: '300.00',
          accountId: account.id,
        },
      });

      // Verify balance was decremented: 1000 - 300 = 700
      const updatedAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(updatedAccount!.balance.toNumber()).toBe(700);
    });

    it('invalid body (missing required fields) → 400', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense' }) // missing accountId, categoryId, amount, date
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('non-existent account → 404', async () => {
      const { user, token } = await createUser();
      const category = await createCategory(user.id);

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'income',
          accountId: '00000000-0000-0000-0000-000000000000', // non-existent
          categoryId: category.id,
          amount: '100.00',
          date: '2026-01-15',
        })
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it("other user's account → 404 (ownership enforced)", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB = await createAccount(userB.id);
      const categoryB = await createCategory(userB.id);

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          accountId: accountB.id, // user B's account
          categoryId: categoryB.id,
          amount: '100.00',
          date: '2026-01-15',
        })
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });

  // ─── GET /v1/transactions — List with Filters + Pagination ───────────────

  describe('GET /v1/transactions — list, filters, pagination', () => {
    it('pagination — 15 transactions, page 1 limit 10 → returns 10 with meta', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id);
      const category = await createCategory(user.id);

      // Create 15 transactions via factory
      for (let i = 0; i < 15; i++) {
        await createTransaction(account.id, category.id, {
          type: 'expense',
          amount: 10 + i,
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        });
      }

      const res = await request(app)
        .get('/v1/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: {
          page: 1,
          limit: 10,
          total: 15,
        },
      });
      expect(res.body.data).toHaveLength(10);
    });

    it('filter by accountId — returns only transactions for that account', async () => {
      const { user, token } = await createUser();
      const accountA = await createAccount(user.id, { name: 'Account A' });
      const accountB = await createAccount(user.id, { name: 'Account B' });
      const category = await createCategory(user.id);

      await createTransaction(accountA.id, category.id, { type: 'income', amount: 100 });
      await createTransaction(accountB.id, category.id, { type: 'expense', amount: 200 });

      const res = await request(app)
        .get(`/v1/transactions?accountId=${accountA.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].accountId).toBe(accountA.id);
    });

    it('filter by type — returns only matching type transactions', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id);
      const category = await createCategory(user.id);

      await createTransaction(account.id, category.id, { type: 'income', amount: 100 });
      await createTransaction(account.id, category.id, { type: 'expense', amount: 50 });
      await createTransaction(account.id, category.id, { type: 'income', amount: 200 });

      const res = await request(app)
        .get('/v1/transactions?type=income')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((tx: { type: string }) => {
        expect(tx.type).toBe('income');
      });
    });

    it('filter by date range — returns only transactions within range', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id);
      const category = await createCategory(user.id);

      // January transactions
      await createTransaction(account.id, category.id, {
        type: 'expense',
        amount: 100,
        date: '2026-01-10',
      });
      await createTransaction(account.id, category.id, {
        type: 'expense',
        amount: 200,
        date: '2026-01-20',
      });
      // February transaction (outside range)
      await createTransaction(account.id, category.id, {
        type: 'expense',
        amount: 300,
        date: '2026-02-05',
      });

      const res = await request(app)
        .get('/v1/transactions?dateFrom=2026-01-01&dateTo=2026-01-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((tx: { date: string }) => {
        expect(tx.date.startsWith('2026-01')).toBe(true);
      });
    });

    it('ownership isolation — user A cannot see user B transactions', async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB = await createAccount(userB.id);
      const categoryB = await createCategory(userB.id);

      // Create transactions for user B
      await createTransaction(accountB.id, categoryB.id, { type: 'income', amount: 500 });
      await createTransaction(accountB.id, categoryB.id, { type: 'expense', amount: 100 });

      // User A lists transactions — should get empty (has no accounts)
      const res = await request(app)
        .get('/v1/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('filter by categoryId — returns only transactions for that category', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id);
      const categoryA = await createCategory(user.id, { name: 'Category A' });
      const categoryB = await createCategory(user.id, { name: 'Category B' });

      await createTransaction(account.id, categoryA.id, { type: 'expense', amount: 100 });
      await createTransaction(account.id, categoryB.id, { type: 'expense', amount: 200 });
      await createTransaction(account.id, categoryA.id, { type: 'income', amount: 300 });

      const res = await request(app)
        .get(`/v1/transactions?categoryId=${categoryA.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((tx: { categoryId: string }) => {
        expect(tx.categoryId).toBe(categoryA.id);
      });
    });
  });

  // ─── GET /v1/transactions/:id ─────────────────────────────────────────────

  describe('GET /v1/transactions/:id', () => {
    it('happy path — returns transaction by ID', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id);
      const category = await createCategory(user.id);
      const tx = await createTransaction(account.id, category.id, {
        type: 'income',
        amount: 250,
        date: '2026-01-10',
      });

      const res = await request(app)
        .get(`/v1/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: tx.id,
          accountId: account.id,
          categoryId: category.id,
          type: 'income',
          amount: '250.00',
          date: '2026-01-10',
        },
      });
    });

    it("other user's transaction → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB = await createAccount(userB.id);
      const categoryB = await createCategory(userB.id);
      const txB = await createTransaction(accountB.id, categoryB.id, {
        type: 'expense',
        amount: 100,
      });

      const res = await request(app)
        .get(`/v1/transactions/${txB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });

  // ─── PATCH /v1/transactions/:id — Update ──────────────────────────────────

  describe('PATCH /v1/transactions/:id — update income/expense', () => {
    it('update amount → 200 + balance recalculated atomically', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { balance: 0 });
      const category = await createCategory(user.id);

      // Create income of 100 (balance becomes 100)
      const tx = await createTransaction(account.id, category.id, {
        type: 'income',
        amount: 100,
      });

      // Verify starting balance
      const beforeAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(beforeAccount!.balance.toNumber()).toBe(100);

      // Update amount to 150 (delta: +50)
      const res = await request(app)
        .patch(`/v1/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: '150.00' })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: tx.id,
          amount: '150.00',
        },
      });

      // Balance: 100 + (150 - 100) = 150
      const updatedAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(updatedAccount!.balance.toNumber()).toBe(150);
    });

    it('update category → 200 with new categoryId', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id);
      const catA = await createCategory(user.id, { name: 'Category A' });
      const catB = await createCategory(user.id, { name: 'Category B' });

      const tx = await createTransaction(account.id, catA.id, {
        type: 'expense',
        amount: 50,
      });

      const res = await request(app)
        .patch(`/v1/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categoryId: catB.id })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: tx.id,
          categoryId: catB.id,
        },
      });

      // Verify in DB
      const dbTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
      expect(dbTx?.categoryId).toBe(catB.id);
    });

    it("other user's transaction → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB = await createAccount(userB.id);
      const categoryB = await createCategory(userB.id);
      const txB = await createTransaction(accountB.id, categoryB.id, {
        type: 'expense',
        amount: 100,
      });

      const res = await request(app)
        .patch(`/v1/transactions/${txB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: '999.00' })
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });

  // ─── DELETE /v1/transactions/:id — Delete ─────────────────────────────────

  describe('DELETE /v1/transactions/:id — delete income/expense', () => {
    it('delete income → 200 + balance restored (decremented)', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { balance: 0 });
      const category = await createCategory(user.id);

      // Create income of 500 (balance becomes 500)
      const tx = await createTransaction(account.id, category.id, {
        type: 'income',
        amount: 500,
      });

      const beforeAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(beforeAccount!.balance.toNumber()).toBe(500);

      const res = await request(app)
        .delete(`/v1/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: tx.id,
          type: 'income',
          amount: '500.00',
        },
      });

      // Balance restored: 500 - 500 = 0
      const afterAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(afterAccount!.balance.toNumber()).toBe(0);

      // Transaction deleted from DB
      const dbTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
      expect(dbTx).toBeNull();
    });

    it('delete expense → 200 + balance restored (incremented)', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { balance: 1000 });
      const category = await createCategory(user.id);

      // Create expense of 300 (balance becomes 700)
      const tx = await createTransaction(account.id, category.id, {
        type: 'expense',
        amount: 300,
      });

      const beforeAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(beforeAccount!.balance.toNumber()).toBe(700);

      const res = await request(app)
        .delete(`/v1/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Balance restored: 700 + 300 = 1000
      const afterAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(afterAccount!.balance.toNumber()).toBe(1000);
    });

    it("other user's transaction → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB = await createAccount(userB.id);
      const categoryB = await createCategory(userB.id);
      const txB = await createTransaction(accountB.id, categoryB.id, {
        type: 'income',
        amount: 100,
      });

      const res = await request(app)
        .delete(`/v1/transactions/${txB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });

  // ─── Transfers — POST /v1/transactions with type: 'transfer' ─────────────

  describe('POST /v1/transactions — transfer creation', () => {
    it('same-currency transfer → 2 rows + both balances updated + exchangeRate null', async () => {
      const { user, token } = await createUser();
      const accountOut = await createAccount(user.id, {
        name: 'Source ARS',
        currency: 'ARS',
        balance: 2000,
      });
      const accountIn = await createAccount(user.id, {
        name: 'Dest ARS',
        currency: 'ARS',
        balance: 0,
      });

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'transfer',
          fromAccountId: accountOut.id,
          toAccountId: accountIn.id,
          fromAmount: '1000.00',
          toAmount: '1000.00',
          date: '2026-01-15',
          description: 'Test transfer',
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      // Response is an array of 2 transactions [outLeg, inLeg]
      const txArray = res.body.data;
      expect(Array.isArray(txArray)).toBe(true);
      expect(txArray).toHaveLength(2);

      const outTx = txArray.find((t: { transferSide: string }) => t.transferSide === 'out');
      const inTx = txArray.find((t: { transferSide: string }) => t.transferSide === 'in');

      expect(outTx).toBeDefined();
      expect(inTx).toBeDefined();

      // Both share the same transferGroupId
      expect(outTx!.transferGroupId).toBe(inTx!.transferGroupId);
      expect(outTx!.transferGroupId).not.toBeNull();

      // Out leg: debit from source
      expect(outTx).toMatchObject({
        type: 'transfer',
        transferSide: 'out',
        accountId: accountOut.id,
        transferPeerAccountId: accountIn.id,
        amount: '1000.00',
        exchangeRate: null,
      });

      // In leg: credit to destination
      expect(inTx).toMatchObject({
        type: 'transfer',
        transferSide: 'in',
        accountId: accountIn.id,
        transferPeerAccountId: accountOut.id,
        amount: '1000.00',
        exchangeRate: null,
      });

      // Verify both account balances updated atomically
      const srcAccount = await prisma.account.findUnique({ where: { id: accountOut.id } });
      const dstAccount = await prisma.account.findUnique({ where: { id: accountIn.id } });

      expect(srcAccount!.balance.toNumber()).toBe(1000); // 2000 - 1000
      expect(dstAccount!.balance.toNumber()).toBe(1000); // 0 + 1000

      // Verify both DB rows exist with shared transferGroupId
      const dbTxs = await prisma.transaction.findMany({
        where: { transferGroupId: outTx!.transferGroupId },
      });
      expect(dbTxs).toHaveLength(2);
    });

    it('cross-currency transfer → 2 rows + amounts differ + exchangeRate set', async () => {
      const { user, token } = await createUser();
      const arsAccount = await createAccount(user.id, {
        name: 'ARS Account',
        currency: 'ARS',
        balance: 100000,
      });
      const usdAccount = await createAccount(user.id, {
        name: 'USD Account',
        currency: 'USD',
        balance: 0,
      });

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'transfer',
          fromAccountId: arsAccount.id,
          toAccountId: usdAccount.id,
          fromAmount: '1000.00', // ARS
          toAmount: '1.00', // USD (1 USD = 1000 ARS)
          exchangeRate: '1000.000000',
          date: '2026-01-15',
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      const txArray = res.body.data;
      expect(txArray).toHaveLength(2);

      const outTx = txArray.find((t: { transferSide: string }) => t.transferSide === 'out');
      const inTx = txArray.find((t: { transferSide: string }) => t.transferSide === 'in');

      // Out leg: 1000 ARS deducted
      expect(outTx).toMatchObject({
        amount: '1000.00',
        exchangeRate: '1000.000000',
        accountId: arsAccount.id,
      });

      // In leg: 1 USD credited
      expect(inTx).toMatchObject({
        amount: '1.00',
        exchangeRate: '1000.000000',
        accountId: usdAccount.id,
      });

      // Verify balances
      const srcAccount = await prisma.account.findUnique({ where: { id: arsAccount.id } });
      const dstAccount = await prisma.account.findUnique({ where: { id: usdAccount.id } });

      expect(srcAccount!.balance.toNumber()).toBe(99000); // 100000 - 1000
      expect(dstAccount!.balance.toNumber()).toBe(1); // 0 + 1
    });

    it('cross-currency transfer WITHOUT exchangeRate → 400 ValidationError', async () => {
      const { user, token } = await createUser();
      const arsAccount = await createAccount(user.id, { currency: 'ARS', balance: 1000 });
      const usdAccount = await createAccount(user.id, { currency: 'USD' });

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'transfer',
          fromAccountId: arsAccount.id,
          toAccountId: usdAccount.id,
          fromAmount: '1000.00',
          toAmount: '1.00',
          // NO exchangeRate — should fail
          date: '2026-01-15',
        })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('same-currency transfer with different amounts → 400 ValidationError', async () => {
      const { user, token } = await createUser();
      const accountA = await createAccount(user.id, { currency: 'ARS', balance: 2000 });
      const accountB = await createAccount(user.id, { currency: 'ARS' });

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'transfer',
          fromAccountId: accountA.id,
          toAccountId: accountB.id,
          fromAmount: '1000.00',
          toAmount: '500.00', // different from fromAmount — invalid for same-currency
          date: '2026-01-15',
        })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });

  // ─── Transfers — PATCH /v1/transactions/:id ───────────────────────────────

  describe('PATCH /v1/transactions/:id — transfer update', () => {
    it('update transfer amount → both records updated + both balances recalculated', async () => {
      const { user, token } = await createUser();
      const accountOut = await createAccount(user.id, {
        name: 'Source',
        currency: 'ARS',
        balance: 2000,
      });
      const accountIn = await createAccount(user.id, {
        name: 'Dest',
        currency: 'ARS',
        balance: 0,
      });

      // Create transfer via factory (fromAmount=1000, toAmount=1000)
      const { outTx, inTx, transferGroupId } = await createTransfer(accountOut.id, accountIn.id, {
        fromAmount: 1000,
        toAmount: 1000,
      });

      // After factory: accountOut.balance = 2000 - 1000 = 1000, accountIn.balance = 1000
      const beforeSrc = await prisma.account.findUnique({ where: { id: accountOut.id } });
      const beforeDst = await prisma.account.findUnique({ where: { id: accountIn.id } });
      expect(beforeSrc!.balance.toNumber()).toBe(1000);
      expect(beforeDst!.balance.toNumber()).toBe(1000);

      // Update transfer via the out-leg ID: amount 1000 → 1500, toAmount 1000 → 1500
      const res = await request(app)
        .patch(`/v1/transactions/${outTx.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: '1500.00', toAmount: '1500.00' })
        .expect(200);

      expect(res.body.success).toBe(true);
      // Response is array of 2 updated transactions
      const txArray = res.body.data;
      expect(Array.isArray(txArray)).toBe(true);
      expect(txArray).toHaveLength(2);

      // Verify both legs updated to 1500
      const updatedOut = txArray.find((t: { id: string }) => t.id === outTx.id);
      const updatedIn = txArray.find((t: { id: string }) => t.id === inTx.id);

      expect(updatedOut!.amount).toBe('1500.00');
      expect(updatedIn!.amount).toBe('1500.00');
      expect(updatedOut!.transferGroupId).toBe(transferGroupId);

      // Balance recalculation:
      // Net delta for src: old out-delta was -1000, new out-delta is -1500 → net = -500
      // Net delta for dst: old in-delta was +1000, new in-delta is +1500 → net = +500
      const afterSrc = await prisma.account.findUnique({ where: { id: accountOut.id } });
      const afterDst = await prisma.account.findUnique({ where: { id: accountIn.id } });
      expect(afterSrc!.balance.toNumber()).toBe(500); // 1000 - 500
      expect(afterDst!.balance.toNumber()).toBe(1500); // 1000 + 500
    });

    it("other user's transfer → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB1 = await createAccount(userB.id, { currency: 'ARS', balance: 5000 });
      const accountB2 = await createAccount(userB.id, { currency: 'ARS' });

      const { outTx } = await createTransfer(accountB1.id, accountB2.id);

      const res = await request(app)
        .patch(`/v1/transactions/${outTx.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: '999.00', toAmount: '999.00' })
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });

  // ─── Transfers — DELETE /v1/transactions/:id ──────────────────────────────

  describe('DELETE /v1/transactions/:id — transfer deletion', () => {
    it('delete transfer → BOTH records deleted + BOTH balances restored', async () => {
      const { user, token } = await createUser();
      const accountOut = await createAccount(user.id, {
        name: 'Source',
        currency: 'ARS',
        balance: 3000,
      });
      const accountIn = await createAccount(user.id, {
        name: 'Dest',
        currency: 'ARS',
        balance: 0,
      });

      // Create transfer: 2000 moved from accountOut to accountIn
      const { outTx, inTx, transferGroupId } = await createTransfer(accountOut.id, accountIn.id, {
        fromAmount: 2000,
        toAmount: 2000,
      });

      // Balances after factory: accountOut = 1000, accountIn = 2000
      const beforeSrc = await prisma.account.findUnique({ where: { id: accountOut.id } });
      const beforeDst = await prisma.account.findUnique({ where: { id: accountIn.id } });
      expect(beforeSrc!.balance.toNumber()).toBe(1000);
      expect(beforeDst!.balance.toNumber()).toBe(2000);

      // Delete via the out-leg ID
      const res = await request(app)
        .delete(`/v1/transactions/${outTx.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Response is array of 2 deleted transactions
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);

      // Both records should be deleted from DB
      const dbOutTx = await prisma.transaction.findUnique({ where: { id: outTx.id } });
      const dbInTx = await prisma.transaction.findUnique({ where: { id: inTx.id } });
      expect(dbOutTx).toBeNull();
      expect(dbInTx).toBeNull();

      // No rows with this transferGroupId should exist
      const remainingTxs = await prisma.transaction.findMany({
        where: { transferGroupId },
      });
      expect(remainingTxs).toHaveLength(0);

      // Both balances restored atomically
      const afterSrc = await prisma.account.findUnique({ where: { id: accountOut.id } });
      const afterDst = await prisma.account.findUnique({ where: { id: accountIn.id } });
      expect(afterSrc!.balance.toNumber()).toBe(3000); // restored: 1000 + 2000
      expect(afterDst!.balance.toNumber()).toBe(0); // restored: 2000 - 2000
    });

    it("other user's transfer → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB1 = await createAccount(userB.id, { currency: 'ARS', balance: 5000 });
      const accountB2 = await createAccount(userB.id, { currency: 'ARS' });

      const { outTx } = await createTransfer(accountB1.id, accountB2.id);

      const res = await request(app)
        .delete(`/v1/transactions/${outTx.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });

  // ─── Transfer Integrity — transferGroupId Links Both Records ─────────────

  describe('Transfer integrity', () => {
    it('transferGroupId links both transaction records (verified in DB)', async () => {
      const { user, token } = await createUser();
      const accountA = await createAccount(user.id, { currency: 'ARS', balance: 1000 });
      const accountB = await createAccount(user.id, { currency: 'ARS' });

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'transfer',
          fromAccountId: accountA.id,
          toAccountId: accountB.id,
          fromAmount: '500.00',
          toAmount: '500.00',
          date: '2026-01-15',
        })
        .expect(201);

      const txArray = res.body.data;
      const groupId = txArray[0].transferGroupId;
      expect(groupId).not.toBeNull();

      // Verify both rows in DB share the same transferGroupId
      const dbTxs = await prisma.transaction.findMany({
        where: { transferGroupId: groupId },
        orderBy: { transferSide: 'asc' }, // in, out
      });

      expect(dbTxs).toHaveLength(2);

      const sides = dbTxs.map((t) => t.transferSide);
      expect(sides).toContain('out');
      expect(sides).toContain('in');

      // Verify cross-account peer references
      const outRow = dbTxs.find((t) => t.transferSide === 'out')!;
      const inRow = dbTxs.find((t) => t.transferSide === 'in')!;

      expect(outRow.accountId).toBe(accountA.id);
      expect(outRow.transferPeerAccountId).toBe(accountB.id);
      expect(inRow.accountId).toBe(accountB.id);
      expect(inRow.transferPeerAccountId).toBe(accountA.id);
    });
  });
});
