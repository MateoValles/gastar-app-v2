import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@/lib/errors.js';
import * as transactionsService from './transactions.service.js';

/**
 * Transactions Controller — thin HTTP layer.
 *
 * Rules:
 *  - NO try/catch — errors propagate to the global error middleware
 *  - NO direct Prisma access — delegates to transactionsService
 *  - Handles all HTTP concerns: status codes, response envelope
 *  - `req.userId!` is safe — authMiddleware guarantees it is set
 *  - Express 5 natively catches async errors — no asyncHandler wrapper needed
 */

/** Zod schema for validating UUID path parameters (:id). */
const transactionIdSchema = z.string().uuid('Invalid transaction ID — must be a UUID');

/**
 * Validates the `:id` path param as a UUID.
 * Throws `ValidationError` (400) if invalid, matching the global error shape.
 */
function parseTransactionId(req: Request): string {
  const result = transactionIdSchema.safeParse(req.params.id);
  if (!result.success) {
    throw new ValidationError('Invalid transaction ID', result.error.issues);
  }
  return result.data;
}

/**
 * GET /v1/transactions
 *
 * Returns a paginated, filtered list of transactions for the authenticated user.
 * Query params are validated upstream by `validateQuery(listTransactionsQuerySchema)`.
 */
export async function list(req: Request, res: Response): Promise<void> {
  const result = await transactionsService.listTransactions(
    req.userId!,
    req.query as unknown as Parameters<typeof transactionsService.listTransactions>[1],
  );

  res.status(200).json({ success: true, data: result.data, meta: result.meta });
}

/**
 * GET /v1/transactions/:id
 *
 * Returns a single transaction by ID, scoped to the authenticated user.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const txId = parseTransactionId(req);
  const tx = await transactionsService.getTransaction(req.userId!, txId);

  res.status(200).json({ success: true, data: tx });
}

/**
 * POST /v1/transactions
 *
 * Creates a transaction (income, expense, or transfer) for the authenticated user.
 * Body is validated upstream by `validate(createTransactionSchema)`.
 *
 * Returns 201 with the created transaction(s):
 *  - Single `TransactionResponse` for income/expense.
 *  - Array of two `TransactionResponse` for transfers.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const result = await transactionsService.createTransaction(
    req.userId!,
    req.body,
  );

  res.status(201).json({ success: true, data: result });
}

/**
 * PATCH /v1/transactions/:id
 *
 * Updates a transaction owned by the authenticated user.
 * Body is validated upstream by `validate(updateTransactionSchema)`.
 *
 * Returns 200 with updated transaction(s):
 *  - Single `TransactionResponse` for income/expense.
 *  - Array of two `TransactionResponse` for transfers.
 */
export async function update(req: Request, res: Response): Promise<void> {
  const txId = parseTransactionId(req);
  const result = await transactionsService.updateTransaction(
    req.userId!,
    txId,
    req.body,
  );

  res.status(200).json({ success: true, data: result });
}

/**
 * DELETE /v1/transactions/:id
 *
 * Deletes a transaction owned by the authenticated user.
 * For transfers, deletes both legs and reverses both balance effects.
 *
 * Returns 200 with the deleted transaction(s).
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const txId = parseTransactionId(req);
  const result = await transactionsService.deleteTransaction(req.userId!, txId);

  res.status(200).json({ success: true, data: result });
}
