/**
 * Supported transaction types in Gastar.
 * Mirrors the Prisma `TransactionType` enum — source of truth is schema.prisma.
 * Kept as `as const` array + derived type so the frontend can use it
 * without importing from Prisma Client.
 */
export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Sides of a transfer transaction.
 * Mirrors the Prisma `TransferSide` enum — source of truth is schema.prisma.
 * 'out' = money leaves the account (debit); 'in' = money arrives (credit).
 */
export const TRANSFER_SIDES = ['out', 'in'] as const;

export type TransferSide = (typeof TRANSFER_SIDES)[number];
