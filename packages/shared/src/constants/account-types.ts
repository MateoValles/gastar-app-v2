/**
 * Supported account types in Gastar.
 * Mirrors the Prisma `AccountType` enum — source of truth is schema.prisma.
 * Kept as `as const` array + derived type so the frontend can use it
 * without importing from Prisma Client.
 */
export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
