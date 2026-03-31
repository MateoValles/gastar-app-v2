/**
 * Accounts Module Integration Tests
 *
 * Covers all 12 scenarios from spec-modules-1 (observation #148) for Accounts.
 *
 * Endpoints tested:
 *  - GET    /v1/accounts
 *  - GET    /v1/accounts/:id
 *  - POST   /v1/accounts
 *  - PATCH  /v1/accounts/:id
 *  - DELETE /v1/accounts/:id
 *
 * Key behaviors verified:
 *  - Ownership isolation (users see only their own accounts)
 *  - Empty list returns [] (not 404)
 *  - Initial balance is "0.00" (Decimal serialized as string)
 *  - PATCH does NOT allow updating balance (schema only allows name + type)
 *  - DELETE with transactions → cascades (Prisma onDelete: Cascade on transactions)
 *  - balance in response is a string with 2 decimal places (Decimal.toFixed(2))
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

describe('Accounts Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─── GET /v1/accounts ─────────────────────────────────────────────────────

  describe('GET /v1/accounts', () => {
    it('happy path — lists all accounts for authenticated user', async () => {
      const { user, token } = await createUser();
      await createAccount(user.id, { name: 'Checking ARS', currency: 'ARS' });
      await createAccount(user.id, { name: 'Savings USD', currency: 'USD' });

      const res = await request(app)
        .get('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });
      expect(res.body.data).toHaveLength(2);

      // Verify account shape — balance is a string (Decimal.toFixed(2))
      expect(res.body.data[0]).toMatchObject({
        id: expect.any(String),
        userId: user.id,
        name: expect.any(String),
        type: expect.any(String),
        currency: expect.any(String),
        balance: expect.any(String), // serialized as string, not number
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('empty list — user with no accounts → returns []', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .get('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: [],
      });
    });

    it('ownership isolation — does NOT return other users accounts', async () => {
      const { user: userA, token: tokenA } = await createUser();
      const { user: userB } = await createUser();

      await createAccount(userA.id, { name: 'User A Account' });
      await createAccount(userB.id, { name: 'User B Account' });

      const res = await request(app)
        .get('/v1/accounts')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userId).toBe(userA.id);
      expect(res.body.data[0].name).toBe('User A Account');
    });
  });

  // ─── GET /v1/accounts/:id ─────────────────────────────────────────────────

  describe('GET /v1/accounts/:id', () => {
    it('happy path — returns a single account by ID', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { name: 'My Account', currency: 'USD' });

      const res = await request(app)
        .get(`/v1/accounts/${account.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: account.id,
          userId: user.id,
          name: 'My Account',
          currency: 'USD',
          balance: '0.00',
        },
      });
    });

    it('non-existent account ID → 404', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .get('/v1/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
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
      const accountB = await createAccount(userB.id, { name: 'User B Account' });

      const res = await request(app)
        .get(`/v1/accounts/${accountB.id}`)
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

  // ─── POST /v1/accounts ────────────────────────────────────────────────────

  describe('POST /v1/accounts', () => {
    it('happy path ARS — creates account with balance "0.00" → 201', async () => {
      const { user, token } = await createUser();

      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'ARS Account', type: 'checking', currency: 'ARS' })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          userId: user.id,
          name: 'ARS Account',
          type: 'checking',
          currency: 'ARS',
          balance: '0.00',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      // Verify in DB
      const dbAccount = await prisma.account.findUnique({ where: { id: res.body.data.id } });
      expect(dbAccount).not.toBeNull();
      expect(dbAccount?.balance.toNumber()).toBe(0);
    });

    it('happy path USD — creates USD account → 201', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'USD Account', type: 'savings', currency: 'USD' })
        .expect(201);

      expect(res.body.data).toMatchObject({
        currency: 'USD',
        balance: '0.00',
      });
    });

    it('happy path EUR — creates EUR account → 201', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'EUR Account', type: 'savings', currency: 'EUR' })
        .expect(201);

      expect(res.body.data).toMatchObject({
        currency: 'EUR',
        balance: '0.00',
      });
    });

    it('invalid body (unsupported currency) → 400', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad Account', type: 'checking', currency: 'BTC' })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('invalid body (missing required fields) → 400', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'No Currency' }) // missing type and currency
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /v1/accounts/:id ───────────────────────────────────────────────

  describe('PATCH /v1/accounts/:id', () => {
    it('happy path — updates name and type → 200 with updated account', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, {
        name: 'Old Name',
        type: 'checking',
        currency: 'ARS',
      });

      const res = await request(app)
        .patch(`/v1/accounts/${account.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', type: 'savings' })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: account.id,
          name: 'New Name',
          type: 'savings',
          currency: 'ARS', // currency unchanged
          balance: '0.00', // balance unchanged
        },
      });

      // Verify DB state
      const dbAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(dbAccount?.name).toBe('New Name');
      expect(dbAccount?.type).toBe('savings');
    });

    it('attempting to update balance via PATCH → 400 (schema rejects balance field)', async () => {
      // updateAccountSchema only allows name and type — balance is not in the schema.
      // Sending balance alone will fail the "at least one field must be provided" check
      // because balance is stripped by Zod (no strip() — but Zod objects strip extra fields by default)
      // Actually: the schema uses z.object() without .strict(), so unknown keys are stripped silently.
      // An empty-after-strip body triggers the .refine() check → 400.
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { balance: 0 });

      const res = await request(app)
        .patch(`/v1/accounts/${account.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ balance: '9999.00' }) // balance is not in updateAccountSchema
        .expect(400);

      expect(res.body.success).toBe(false);

      // Verify balance was NOT changed
      const dbAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(dbAccount?.balance.toNumber()).toBe(0);
    });

    it("other user's account → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB = await createAccount(userB.id, { name: 'User B Account' });

      const res = await request(app)
        .patch(`/v1/accounts/${accountB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Hijacked' })
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });

      // Verify name was NOT changed
      const dbAccount = await prisma.account.findUnique({ where: { id: accountB.id } });
      expect(dbAccount?.name).toBe('User B Account');
    });
  });

  // ─── DELETE /v1/accounts/:id ──────────────────────────────────────────────

  describe('DELETE /v1/accounts/:id', () => {
    it('happy path (no transactions) → 200, account removed from DB', async () => {
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { name: 'To Delete' });

      const res = await request(app)
        .delete(`/v1/accounts/${account.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: null,
      });

      // Verify account is gone from DB
      const dbAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(dbAccount).toBeNull();
    });

    it('with transactions — cascades (Prisma onDelete: Cascade on transactions) → 200', async () => {
      // Schema uses onDelete: Cascade on Account → Transaction relation.
      // Deleting the account also deletes linked transactions automatically.
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { name: 'Account With Transactions' });
      const category = await createCategory(user.id, { name: 'Test Category' });

      const tx = await createTransaction(account.id, category.id, {
        type: 'expense',
        amount: 50,
      });

      const res = await request(app)
        .delete(`/v1/accounts/${account.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify account is gone
      const dbAccount = await prisma.account.findUnique({ where: { id: account.id } });
      expect(dbAccount).toBeNull();

      // Verify transaction was also deleted (cascade)
      const dbTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
      expect(dbTx).toBeNull();
    });

    it("other user's account → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const accountB = await createAccount(userB.id, { name: 'User B Account' });

      const res = await request(app)
        .delete(`/v1/accounts/${accountB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });

      // Verify User B's account was NOT deleted
      const dbAccount = await prisma.account.findUnique({ where: { id: accountB.id } });
      expect(dbAccount).not.toBeNull();
    });
  });
});
