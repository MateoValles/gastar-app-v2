/**
 * Smoke test — verifies the integration test infrastructure works end-to-end.
 *
 * Checks:
 * 1. App responds to HTTP requests
 * 2. Prisma connects to the test database
 * 3. Factories create records correctly
 * 4. cleanDatabase() leaves all tables empty
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, prisma } from './helpers/test-app.js';
import { cleanDatabase, createUser, createAccount, createCategory } from './helpers/factories.js';

describe('Integration test infrastructure smoke test', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('app responds to /health', async () => {
    const res = await request(app).get('/health').expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok' },
    });
  });

  it('prisma connects to gastar_test database', async () => {
    // If Prisma cannot connect, this will throw and fail the test
    const result = await prisma.$queryRaw<[{ result: number }]>`SELECT 1 AS result`;
    expect(result[0].result).toBe(1);
  });

  it('createUser factory creates user with all side effects', async () => {
    const { user, password, token } = await createUser({
      email: 'smoke@test.com',
      name: 'Smoke User',
    });

    expect(user.id).toBeTruthy();
    expect(user.email).toBe('smoke@test.com');
    expect(user.name).toBe('Smoke User');
    expect(password).toBe('Password123!');
    expect(token).toBeTruthy();

    // Verify UserSettings were created
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    expect(settings?.language).toBe('es');

    // Verify 6 default categories were created
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
    });
    expect(categories).toHaveLength(6);
  });

  it('createAccount factory creates account', async () => {
    const { user } = await createUser();
    const account = await createAccount(user.id, { name: 'Savings', currency: 'USD' });

    expect(account.id).toBeTruthy();
    expect(account.userId).toBe(user.id);
    expect(account.name).toBe('Savings');
    expect(account.currency).toBe('USD');
    expect(account.balance.toNumber()).toBe(0);
  });

  it('createCategory factory creates category', async () => {
    const { user } = await createUser();
    const category = await createCategory(user.id, { name: 'Groceries', color: '#FF0000' });

    expect(category.id).toBeTruthy();
    expect(category.userId).toBe(user.id);
    expect(category.name).toBe('Groceries');
    expect(category.color).toBe('#FF0000');
  });

  it('cleanDatabase() removes all records', async () => {
    // Create some records
    await createUser();
    await createUser();

    // Verify data exists
    const usersBefore = await prisma.user.count();
    expect(usersBefore).toBe(2);

    // Clean
    await cleanDatabase();

    // Verify all tables are empty
    const [users, accounts, categories, settings, transactions] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.category.count(),
      prisma.userSettings.count(),
      prisma.transaction.count(),
    ]);

    expect(users).toBe(0);
    expect(accounts).toBe(0);
    expect(categories).toBe(0);
    expect(settings).toBe(0);
    expect(transactions).toBe(0);
  });
});
