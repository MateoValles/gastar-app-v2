/**
 * Test data factories for integration tests.
 *
 * All factories use raw Prisma inserts — NOT the service layer.
 * This isolates test setup from the code under test so factory failures
 * give clear errors rather than masking service bugs.
 *
 * Exception: createUser uses bcrypt directly (same cost factor as production)
 * and replicates the register() side effects (UserSettings + 6 default categories).
 */
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import type { Account, Category, Transaction, User } from '@prisma/client';
import type { AccountType, Currency, TransactionType } from '@prisma/client';
import { authConfig } from '@/config/auth.js';
import { signAccessToken } from '@/modules/auth/auth.service.js';
import { prisma } from '@/lib/prisma.js';

// ── Default categories (mirrors auth.service.ts DEFAULT_CATEGORIES) ───────────

const DEFAULT_CATEGORIES = [
  { name: 'Auto', icon: 'car', color: '#3B82F6' },
  { name: 'Salud', icon: 'heart-pulse', color: '#EF4444' },
  { name: 'Personal', icon: 'user', color: '#8B5CF6' },
  { name: 'Social', icon: 'users', color: '#F59E0B' },
  { name: 'Comida', icon: 'utensils', color: '#10B981' },
  { name: 'Viajes', icon: 'plane', color: '#06B6D4' },
] as const;

// ── Return types ──────────────────────────────────────────────────────────────

export interface CreatedUser {
  user: User;
  password: string; // plain-text (for login tests)
  token: string; // valid JWT access token
}

export interface CreatedTransfer {
  transferGroupId: string;
  outTx: Transaction;
  inTx: Transaction;
}

// ── createUser ────────────────────────────────────────────────────────────────

/**
 * Creates a realistic user with:
 * - Hashed password (bcrypt, 12 rounds — same as production)
 * - UserSettings (language: 'es')
 * - 6 default categories
 * - Valid JWT access token
 *
 * @param overrides - Optional partial overrides for email, name, password
 */
export async function createUser(
  overrides?: Partial<{
    email: string;
    name: string;
    password: string;
  }>,
): Promise<CreatedUser> {
  const password = overrides?.password ?? 'Password123!';
  const passwordHash = await bcrypt.hash(password, authConfig.bcryptSaltRounds);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: overrides?.email ?? `test-${randomUUID()}@gastar.test`,
        name: overrides?.name ?? 'Test User',
        passwordHash,
      },
    });

    await tx.userSettings.create({
      data: { userId: newUser.id, language: 'es' },
    });

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        userId: newUser.id,
      })),
    });

    return newUser;
  });

  const token = await signAccessToken(user.id);

  return { user, password, token };
}

// ── createAccount ─────────────────────────────────────────────────────────────

/**
 * Creates an account for a user.
 *
 * @param userId - The owning user's ID
 * @param overrides - Optional partial overrides for account fields
 */
export async function createAccount(
  userId: string,
  overrides?: Partial<{
    name: string;
    type: AccountType;
    currency: Currency;
    balance: number;
  }>,
): Promise<Account> {
  return prisma.account.create({
    data: {
      userId,
      name: overrides?.name ?? 'Test Account',
      type: overrides?.type ?? 'checking',
      currency: overrides?.currency ?? 'ARS',
      balance: overrides?.balance ?? 0,
    },
  });
}

// ── createCategory ────────────────────────────────────────────────────────────

/**
 * Creates a custom category for a user.
 *
 * @param userId - The owning user's ID
 * @param overrides - Optional partial overrides for category fields
 */
export async function createCategory(
  userId: string,
  overrides?: Partial<{
    name: string;
    icon: string;
    color: string;
  }>,
): Promise<Category> {
  return prisma.category.create({
    data: {
      userId,
      name: overrides?.name ?? 'Test Category',
      icon: overrides?.icon ?? 'tag',
      color: overrides?.color ?? '#888888',
    },
  });
}

// ── createTransaction ─────────────────────────────────────────────────────────

/**
 * Creates a transaction and updates the account balance atomically.
 *
 * Balance rules (amount is always positive, direction comes from type):
 * - income:  balance += amount
 * - expense: balance -= amount
 *
 * Note: For transfer transactions, use createTransfer() instead.
 *
 * @param accountId  - The account the transaction belongs to
 * @param categoryId - The category (nullable — pass null for transfers)
 * @param overrides  - Optional partial overrides for transaction fields
 */
export async function createTransaction(
  accountId: string,
  categoryId: string | null,
  overrides?: Partial<{
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
  }>,
): Promise<Transaction> {
  const type = overrides?.type ?? 'expense';
  const amount = overrides?.amount ?? 100.0;
  const date = overrides?.date ?? new Date().toISOString().substring(0, 10);

  // Determine balance delta: income/transfer-in = +, expense/transfer-out = -
  const balanceDelta = type === 'income' ? amount : -amount;

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        accountId,
        categoryId,
        type,
        amount,
        description: overrides?.description,
        date: new Date(date),
      },
    });

    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceDelta } },
    });

    return transaction;
  });
}

// ── createTransfer ────────────────────────────────────────────────────────────

/**
 * Creates a transfer between two accounts (2-record design).
 *
 * Creates:
 * - An 'out' transaction on outAccountId (balance decreases)
 * - An 'in' transaction on inAccountId (balance increases)
 * - Both share the same transferGroupId UUID
 * - Both account balances are updated atomically
 *
 * @param outAccountId - The account money leaves from
 * @param inAccountId  - The account money arrives at
 * @param overrides    - Optional partial overrides for amounts, exchangeRate, etc.
 */
export async function createTransfer(
  outAccountId: string,
  inAccountId: string,
  overrides?: Partial<{
    fromAmount: number;
    toAmount: number;
    exchangeRate: number;
    description: string;
    date: string;
  }>,
): Promise<CreatedTransfer> {
  const fromAmount = overrides?.fromAmount ?? 1000;
  const toAmount = overrides?.toAmount ?? fromAmount; // same-currency default
  const date = overrides?.date ?? new Date().toISOString().substring(0, 10);
  const transferGroupId = randomUUID();

  const { outTx, inTx } = await prisma.$transaction(async (tx) => {
    const outTransaction = await tx.transaction.create({
      data: {
        accountId: outAccountId,
        categoryId: null,
        type: 'transfer',
        amount: fromAmount,
        exchangeRate: overrides?.exchangeRate ?? null,
        description: overrides?.description,
        date: new Date(date),
        transferGroupId,
        transferSide: 'out',
        transferPeerAccountId: inAccountId,
      },
    });

    const inTransaction = await tx.transaction.create({
      data: {
        accountId: inAccountId,
        categoryId: null,
        type: 'transfer',
        amount: toAmount,
        exchangeRate: overrides?.exchangeRate ?? null,
        description: overrides?.description,
        date: new Date(date),
        transferGroupId,
        transferSide: 'in',
        transferPeerAccountId: outAccountId,
      },
    });

    // Update both account balances atomically
    await tx.account.update({
      where: { id: outAccountId },
      data: { balance: { decrement: fromAmount } },
    });

    await tx.account.update({
      where: { id: inAccountId },
      data: { balance: { increment: toAmount } },
    });

    return { outTx: outTransaction, inTx: inTransaction };
  });

  return { transferGroupId, outTx, inTx };
}

// ── cleanDatabase ─────────────────────────────────────────────────────────────

/**
 * Deletes all records from all tables in FK-safe order.
 *
 * Delete order (child → parent):
 * 1. Transaction (depends on Account, Category)
 * 2. Category (depends on User)
 * 3. Account (depends on User)
 * 4. UserSettings (depends on User)
 * 5. User (root)
 *
 * Wrapped in prisma.$transaction for atomicity.
 */
export async function cleanDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.category.deleteMany(),
    prisma.account.deleteMany(),
    prisma.userSettings.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
