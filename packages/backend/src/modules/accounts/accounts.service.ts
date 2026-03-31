import type { Account as PrismaAccount } from '@prisma/client';
import type { AccountResponse, CreateAccountInput, UpdateAccountInput } from '@gastar/shared';
import { prisma } from '@/lib/prisma.js';
import { ConflictError, NotFoundError } from '@/lib/errors.js';

/**
 * Accounts Service
 *
 * All methods enforce ownership via `userId` as the first parameter.
 * Every Prisma query includes `userId` in the `where` clause — no resource
 * can be accessed or mutated without matching the authenticated user.
 *
 * Prisma `Decimal` values are serialized to strings via `toAccountResponse()`
 * to prevent floating-point corruption in JSON.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Response Mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Prisma Account row to the API response shape.
 * Serializes `balance` (Decimal) as a string and dates as ISO 8601.
 */
export function toAccountResponse(account: PrismaAccount): AccountResponse {
  return {
    id: account.id,
    userId: account.userId,
    name: account.name,
    type: account.type as AccountResponse['type'],
    currency: account.currency as AccountResponse['currency'],
    balance: account.balance.toFixed(2), // Decimal → string with 2 decimal places, NEVER float
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all accounts owned by `userId`, newest first.
 */
export async function listAccounts(userId: string): Promise<AccountResponse[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return accounts.map(toAccountResponse);
}

/**
 * Returns a single account by ID, scoped to `userId`.
 * Throws `NotFoundError` if the account does not exist or is not owned by the user.
 */
export async function getAccount(userId: string, accountId: string): Promise<AccountResponse> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    throw new NotFoundError('Account not found');
  }

  return toAccountResponse(account);
}

/**
 * Creates a new account for `userId`.
 *
 * `initialBalance` is accepted as a decimal string and defaults to 0 when
 * omitted. No `prisma.$transaction()` is needed here because no Transaction
 * row is involved — the initial balance is simply the starting balance field.
 */
export async function createAccount(
  userId: string,
  data: CreateAccountInput,
): Promise<AccountResponse> {
  const { name, type, currency, initialBalance } = data;

  const account = await prisma.account.create({
    data: {
      userId,
      name,
      type,
      currency,
      balance: initialBalance ?? 0,
    },
  });

  return toAccountResponse(account);
}

/**
 * Updates the `name` and/or `type` of an account owned by `userId`.
 * Currency and balance are immutable via this endpoint.
 * Throws `NotFoundError` if the account does not exist or is not owned by the user.
 *
 * Uses `updateMany` with compound `{ id, userId }` to enforce ownership in a
 * single query, then fetches the updated row. Same pattern as `deleteAccount`.
 */
export async function updateAccount(
  userId: string,
  accountId: string,
  data: UpdateAccountInput,
): Promise<AccountResponse> {
  // updateMany with compound where enforces ownership in the query itself.
  // Returns count=0 if not found or not owned → throw NotFoundError.
  const { count } = await prisma.account.updateMany({
    where: { id: accountId, userId },
    data,
  });

  if (count === 0) {
    throw new NotFoundError('Account not found');
  }

  // Fetch the updated row for the response (updateMany doesn't return records).
  // Ownership already enforced by updateMany above — scope to userId for defense-in-depth.
  const account = await prisma.account.findFirstOrThrow({
    where: { id: accountId, userId },
  });

  return toAccountResponse(account);
}

/**
 * Deletes an account owned by `userId`.
 * Throws `NotFoundError` if the account does not exist or is not owned by the user.
 * Throws `ConflictError` if the account has existing transactions (onDelete: Restrict).
 * The user must delete or reassign transactions before the account can be deleted.
 */
export async function deleteAccount(userId: string, accountId: string): Promise<void> {
  // 1. Check account exists and is owned by user.
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // 2. Check if account has transactions — Restrict prevents deletion at DB level,
  //    but we throw a clear business error instead of letting Prisma throw P2003.
  //    Ownership already verified in step 1. Scoped to account.userId for defense-in-depth.
  const transactionCount = await prisma.transaction.count({
    where: { accountId, account: { userId } },
  });

  if (transactionCount > 0) {
    throw new ConflictError(
      'Cannot delete account with existing transactions. Delete or reassign transactions first.',
    );
  }

  // 3. Delete (safe — no transactions exist).
  //    Use deleteMany with compound where for defense-in-depth ownership enforcement.
  await prisma.account.deleteMany({
    where: { id: accountId, userId },
  });
}
