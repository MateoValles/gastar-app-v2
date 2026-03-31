/**
 * Categories Module Integration Tests
 *
 * Covers all 11 scenarios from spec-modules-1 (observation #148) for Categories.
 *
 * Endpoints tested:
 *  - GET    /v1/categories
 *  - GET    /v1/categories/:id
 *  - POST   /v1/categories
 *  - PATCH  /v1/categories/:id
 *  - DELETE /v1/categories/:id
 *
 * Key behaviors verified:
 *  - Ownership isolation (users see only their own categories)
 *  - Default categories created at registration (6 per user)
 *  - DELETE with associated transactions → 409 Conflict (service pre-flight check)
 *  - DELETE of other user's category → 404 (ownership enforced before conflict check)
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

describe('Categories Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─── GET /v1/categories ───────────────────────────────────────────────────

  describe('GET /v1/categories', () => {
    it('happy path — lists all categories for authenticated user (includes defaults from registration)', async () => {
      // createUser() creates the user + 6 default categories
      const { token } = await createUser();

      const res = await request(app)
        .get('/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });

      // createUser factory creates 6 default categories
      expect(res.body.data).toHaveLength(6);

      // Each category has the expected shape
      expect(res.body.data[0]).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        name: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('ownership isolation — does NOT return other users categories', async () => {
      const { user: userA, token: tokenA } = await createUser();
      const { user: userB } = await createUser();

      // Create an extra category for user B
      await createCategory(userB.id, { name: 'User B Only' });

      const res = await request(app)
        .get('/v1/categories')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // User A should only see their own 6 default categories
      const categoryIds: string[] = res.body.data.map((c: { id: string }) => c.id);
      const userIds: string[] = res.body.data.map((c: { userId: string }) => c.userId);

      // All returned categories belong to user A
      userIds.forEach((uid) => expect(uid).toBe(userA.id));

      // None of user B's categories are included
      const userBCategories = await prisma.category.findMany({
        where: { userId: userB.id },
      });
      const userBIds = userBCategories.map((c) => c.id);
      userBIds.forEach((bid) => expect(categoryIds).not.toContain(bid));
    });
  });

  // ─── GET /v1/categories/:id ───────────────────────────────────────────────

  describe('GET /v1/categories/:id', () => {
    it('happy path — returns a single category by ID', async () => {
      const { user, token } = await createUser();
      const category = await createCategory(user.id, { name: 'My Category' });

      const res = await request(app)
        .get(`/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: category.id,
          userId: user.id,
          name: 'My Category',
        },
      });
    });

    it("other user's category → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const categoryB = await createCategory(userB.id, { name: 'User B Category' });

      const res = await request(app)
        .get(`/v1/categories/${categoryB.id}`)
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

  // ─── POST /v1/categories ──────────────────────────────────────────────────

  describe('POST /v1/categories', () => {
    it('happy path — creates a new category → 201', async () => {
      const { user, token } = await createUser();

      const res = await request(app)
        .post('/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Category', icon: 'star', color: '#FF5733' })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          userId: user.id,
          name: 'New Category',
          icon: 'star',
          color: '#FF5733',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      // Verify it was actually saved in DB
      const dbCat = await prisma.category.findUnique({
        where: { id: res.body.data.id },
      });
      expect(dbCat).not.toBeNull();
      expect(dbCat?.name).toBe('New Category');
    });

    it('invalid body (missing required name) → 400', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .post('/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ icon: 'star' }) // name is required
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('duplicate category name — allowed (service does not enforce uniqueness by name)', async () => {
      // The categories service does NOT check for duplicate names — it just creates.
      // Duplicate names are allowed; only DB unique constraints would block (none on category name).
      const { token } = await createUser();

      await request(app)
        .post('/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Duplicate Name' })
        .expect(201);

      // Second creation with same name should also succeed
      const res = await request(app)
        .post('/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Duplicate Name' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Duplicate Name');
    });
  });

  // ─── PATCH /v1/categories/:id ─────────────────────────────────────────────

  describe('PATCH /v1/categories/:id', () => {
    it('happy path — updates category fields → 200 with updated data', async () => {
      const { user, token } = await createUser();
      const category = await createCategory(user.id, { name: 'Old Name', color: '#000000' });

      const res = await request(app)
        .patch(`/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', color: '#FFFFFF' })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: category.id,
          name: 'New Name',
          color: '#FFFFFF',
        },
      });

      // Verify DB state
      const dbCat = await prisma.category.findUnique({ where: { id: category.id } });
      expect(dbCat?.name).toBe('New Name');
      expect(dbCat?.color).toBe('#FFFFFF');
    });

    it("other user's category → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const categoryB = await createCategory(userB.id, { name: 'User B Category' });

      const res = await request(app)
        .patch(`/v1/categories/${categoryB.id}`)
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

      // Verify name was NOT changed in DB
      const dbCat = await prisma.category.findUnique({ where: { id: categoryB.id } });
      expect(dbCat?.name).toBe('User B Category');
    });
  });

  // ─── DELETE /v1/categories/:id ────────────────────────────────────────────

  describe('DELETE /v1/categories/:id', () => {
    it('happy path (no transactions) → 200 with deleted category, removed from DB', async () => {
      const { user, token } = await createUser();
      const category = await createCategory(user.id, { name: 'To Delete' });

      const res = await request(app)
        .delete(`/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: category.id,
          name: 'To Delete',
        },
      });

      // Verify it's gone from DB
      const dbCat = await prisma.category.findUnique({ where: { id: category.id } });
      expect(dbCat).toBeNull();
    });

    it('with associated transactions → 409 Conflict (service pre-flight check)', async () => {
      // Categories service does a pre-flight transaction count and throws ConflictError (409)
      // before attempting delete — NOT a DB FK constraint. This is a service-level check.
      const { user, token } = await createUser();
      const account = await createAccount(user.id, { name: 'Test Account' });
      const category = await createCategory(user.id, { name: 'Category With Transactions' });

      // Create a transaction linked to this category
      await createTransaction(account.id, category.id, { type: 'expense', amount: 100 });

      const res = await request(app)
        .delete(`/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });

      // Verify category was NOT deleted
      const dbCat = await prisma.category.findUnique({ where: { id: category.id } });
      expect(dbCat).not.toBeNull();
    });

    it("other user's category → 404", async () => {
      const { token: tokenA } = await createUser();
      const { user: userB } = await createUser();
      const categoryB = await createCategory(userB.id, { name: 'User B Category' });

      const res = await request(app)
        .delete(`/v1/categories/${categoryB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });

      // Verify User B's category was NOT deleted
      const dbCat = await prisma.category.findUnique({ where: { id: categoryB.id } });
      expect(dbCat).not.toBeNull();
    });
  });
});
