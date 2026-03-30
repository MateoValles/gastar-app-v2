import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@/lib/errors.js';
import * as accountsService from './accounts.service.js';

/**
 * Accounts Controller — thin HTTP layer.
 *
 * Rules:
 *  - NO try/catch — errors propagate to the global error middleware
 *  - NO direct Prisma access — delegates to accountsService
 *  - Handles all HTTP concerns: status codes, response envelope
 *  - `req.userId!` is safe — authMiddleware guarantees it is set
 *  - Express 5 natively catches async errors — no asyncHandler wrapper needed
 */

/** Zod schema for validating UUID path parameters (:id). */
const accountIdSchema = z.string().uuid('Invalid account ID — must be a UUID');

/**
 * Validates the `:id` path param as a UUID.
 * Throws `ValidationError` (400) if invalid, matching the global error shape.
 */
function parseAccountId(req: Request): string {
  const result = accountIdSchema.safeParse(req.params.id);
  if (!result.success) {
    throw new ValidationError('Invalid account ID', result.error.issues);
  }
  return result.data;
}

/**
 * GET /v1/accounts
 *
 * Returns all accounts owned by the authenticated user.
 */
export async function list(req: Request, res: Response): Promise<void> {
  const accounts = await accountsService.listAccounts(req.userId!);

  res.status(200).json({ success: true, data: accounts });
}

/**
 * GET /v1/accounts/:id
 *
 * Returns a single account by ID, scoped to the authenticated user.
 */
export async function get(req: Request, res: Response): Promise<void> {
  const accountId = parseAccountId(req);
  const account = await accountsService.getAccount(req.userId!, accountId);

  res.status(200).json({ success: true, data: account });
}

/**
 * POST /v1/accounts
 *
 * Creates a new account for the authenticated user.
 * Body is validated upstream by `validate(createAccountSchema)` middleware.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const account = await accountsService.createAccount(req.userId!, req.body);

  res.status(201).json({ success: true, data: account });
}

/**
 * PATCH /v1/accounts/:id
 *
 * Updates the `name` and/or `type` of an account owned by the authenticated user.
 * Body is validated upstream by `validate(updateAccountSchema)` middleware.
 */
export async function update(req: Request, res: Response): Promise<void> {
  const accountId = parseAccountId(req);
  const account = await accountsService.updateAccount(
    req.userId!,
    accountId,
    req.body,
  );

  res.status(200).json({ success: true, data: account });
}

/**
 * DELETE /v1/accounts/:id
 *
 * Deletes an account owned by the authenticated user.
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const accountId = parseAccountId(req);
  await accountsService.deleteAccount(req.userId!, accountId);

  res.status(200).json({ success: true, data: null });
}
