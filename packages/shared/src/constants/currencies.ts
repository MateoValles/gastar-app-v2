/**
 * Supported currencies in Gastar.
 * Mirrors the Prisma `Currency` enum — source of truth is schema.prisma.
 * Kept as `as const` array + derived type so the frontend can use it
 * without importing from Prisma Client.
 */
export const CURRENCIES = ['ARS', 'USD', 'EUR'] as const;

export type Currency = (typeof CURRENCIES)[number];
