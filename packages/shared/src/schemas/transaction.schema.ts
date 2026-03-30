import { z } from 'zod';
import { TRANSACTION_TYPES } from '../constants/transaction-types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable field schemas
// ─────────────────────────────────────────────────────────────────────────────

/** Amount: strictly positive decimal string up to 2 decimal places. */
const amountSchema = z
  .string()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    'Must be a valid decimal number (e.g. "100" or "100.50")',
  )
  .refine((val) => parseFloat(val) > 0, {
    message: 'Amount must be greater than zero',
  });

/** Exchange rate: strictly positive decimal string up to 6 decimal places. */
const exchangeRateSchema = z
  .string()
  .regex(
    /^\d+(\.\d{1,6})?$/,
    'Must be a valid decimal rate (e.g. "1.234567")',
  )
  .refine((val) => parseFloat(val) > 0, {
    message: 'Exchange rate must be greater than zero',
  });

/** Date: ISO 8601 date string (YYYY-MM-DD). No time component. */
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format');

// ─────────────────────────────────────────────────────────────────────────────
// Task 1.3 — Create schemas (discriminated union on `type`)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for creating an income or expense transaction.
 *
 * `categoryId` is required — income and expense must belong to a category.
 * `amount` is a decimal string to prevent float precision loss.
 * `date` is a YYYY-MM-DD string (maps to Prisma @db.Date).
 */
const createIncomeExpenseSchema = z.object({
  type: z.enum(['income', 'expense']),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: amountSchema,
  description: z.string().max(500).optional(),
  date: dateSchema,
});

/**
 * Schema for creating a transfer transaction.
 *
 * `fromAccountId` and `toAccountId` must be distinct.
 * `categoryId` is NOT allowed — transfers are account-to-account movements.
 * `exchangeRate` is optional here; business logic in the service enforces that
 * it is required when the two accounts have different currencies.
 *
 * NOTE: The fromAccountId !== toAccountId refine is applied on the union level
 * (below) because z.discriminatedUnion requires plain ZodObject variants —
 * ZodEffects (from .refine()) are not valid discriminated union members.
 */
const createTransferSchema = z.object({
  type: z.literal('transfer'),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  fromAmount: amountSchema,
  toAmount: amountSchema,
  exchangeRate: exchangeRateSchema.optional(),
  description: z.string().max(500).optional(),
  date: dateSchema,
});

/**
 * Discriminated union for the single POST /v1/transactions endpoint.
 * Zod routes to the correct variant based on the `type` field.
 *
 * The `superRefine` applies cross-field validation for the transfer variant
 * (fromAccountId !== toAccountId) after the union has resolved the type.
 */
export const createTransactionSchema = z
  .discriminatedUnion('type', [createIncomeExpenseSchema, createTransferSchema])
  .superRefine((data, ctx) => {
    if (
      data.type === 'transfer' &&
      data.fromAccountId === data.toAccountId
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: 'Source and destination accounts must be different',
      });
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Task 1.4 — Update schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for updating an existing transaction.
 *
 * All fields are optional but at least one must be provided.
 * `accountId`, `fromAccountId`, and `toAccountId` are intentionally EXCLUDED —
 * re-assigning a transaction to a different account is not supported (requires
 * reversing and re-applying balance logic across two accounts; low MVP value).
 * Users must delete and re-create if they need to change the account.
 */
export const updateTransactionSchema = z
  .object({
    amount: amountSchema.optional(),
    toAmount: amountSchema.optional(),
    exchangeRate: exchangeRateSchema.optional(),
    categoryId: z.string().uuid().optional(),
    description: z.string().max(500).optional(),
    date: dateSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// ─────────────────────────────────────────────────────────────────────────────
// Task 1.5 — List query schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for query parameters on GET /v1/transactions.
 *
 * All filter fields are optional.
 * `page` and `limit` use `z.coerce.number()` because query params arrive as
 * strings from Express. Defaults applied by Zod so the service always receives
 * typed numbers.
 */
export const listTransactionsQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inferred input types (used by backend service)
// ─────────────────────────────────────────────────────────────────────────────

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
