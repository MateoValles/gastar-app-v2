/**
 * Users Module Integration Tests
 *
 * Covers all scenarios from spec-modules-1 (observation #148) for the Users module,
 * plus cross-cutting middleware scenarios (auth middleware, error format guarantee).
 *
 * Endpoints tested:
 *  - GET  /v1/users/me
 *  - PATCH /v1/users/me
 *
 * Cross-cutting:
 *  - Auth middleware: malformed token → 401
 *  - Auth middleware: expired token → 401
 *  - Error format: { success: false, error: { code, message } }
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, prisma } from './helpers/test-app.js';
import { cleanDatabase, createUser } from './helpers/factories.js';
import { getExpiredJwt } from './helpers/auth.helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Users Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─── Cross-Cutting: Auth Middleware ────────────────────────────────────────

  describe('Auth Middleware — cross-cutting (tested on GET /v1/users/me)', () => {
    it('no Authorization header → 401 with correct error shape', async () => {
      const res = await request(app).get('/v1/users/me').expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('malformed token (not a valid JWT) → 401', async () => {
      const res = await request(app)
        .get('/v1/users/me')
        .set('Authorization', 'Bearer invalid-token-not-a-jwt')
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('expired JWT → 401 with code TOKEN_EXPIRED', async () => {
      const { user } = await createUser();
      const expiredToken = await getExpiredJwt(user.id);

      const res = await request(app)
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: expect.any(String),
        },
      });
    });
  });

  // ─── Error Format Guarantee ────────────────────────────────────────────────

  describe('Error Format Guarantee', () => {
    it('all error responses have { success: false, error: { code, message } } shape', async () => {
      // Test on a 404 (non-existent route within a valid module)
      const { token } = await createUser();

      // Use PATCH with an empty body → 400 to verify shape
      const res = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });

      // Ensure there's no `data` key on errors
      expect(res.body).not.toHaveProperty('data');
    });
  });

  // ─── GET /v1/users/me ─────────────────────────────────────────────────────

  describe('GET /v1/users/me', () => {
    it('happy path — returns user profile and settings', async () => {
      const { user, token } = await createUser({
        email: 'getme@test.com',
        name: 'Test Get Me',
      });

      const res = await request(app)
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: user.id,
          email: 'getme@test.com',
          name: 'Test Get Me',
          language: 'es', // default from factory
        },
      });
    });

    it('unauthenticated (no token) → 401', async () => {
      const res = await request(app).get('/v1/users/me').expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
        }),
      });
    });

    it('valid JWT but user deleted from DB → 401 (middleware checks user existence)', async () => {
      // Auth middleware now checks user existence in DB after JWT verification.
      // Deleted users with valid JWTs receive 401 UNAUTHORIZED — not 404.
      const { user, token } = await createUser();

      // Delete user directly from DB
      await prisma.userSettings.deleteMany({ where: { userId: user.id } });
      await prisma.category.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      const res = await request(app)
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401); // Was 404, now middleware catches it

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('no longer exists'),
        },
      });
    });
  });

  // ─── PATCH /v1/users/me ───────────────────────────────────────────────────

  describe('PATCH /v1/users/me', () => {
    it('update name → 200 with updated data, verified in DB', async () => {
      const { user, token } = await createUser({ name: 'Original Name' });

      const res = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: user.id,
          name: 'Updated Name',
        },
      });

      // Verify DB state
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.name).toBe('Updated Name');
    });

    it('update settings (language) → 200 with updated language', async () => {
      const { user, token } = await createUser();

      const res = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ language: 'en' })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: user.id,
          language: 'en',
        },
      });

      // Verify DB state
      const dbSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });
      expect(dbSettings?.language).toBe('en');
    });

    it('invalid body (empty object) → 400', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('invalid body (name empty string) → 400', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
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
});
