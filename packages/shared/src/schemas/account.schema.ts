import { z } from 'zod';
import { ACCOUNT_TYPES } from '../constants/account-types.js';
import { CURRENCIES } from '../constants/currencies.js';

/**
 * Schema for creating a new account.
 *
 * `initialBalance` is optional and accepted as a decimal string to prevent
 * JavaScript float precision loss. Defaults to "0" when omitted.
 * Pattern allows integers ("1000") and decimals up to 2 places ("1000.50").
 */
export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  currency: z.enum(CURRENCIES),
  initialBalance: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal number (e.g. "100" or "100.50")')
    .optional(),
});

/**
 * Schema for updating an existing account.
 *
 * Only `name` and `type` are mutable:
 * - Currency cannot be changed (would invalidate existing transactions).
 * - Balance is managed by the transactions module, not via direct update.
 *
 * At least one field must be provided.
 */
export const updateAccountSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    type: z.enum(ACCOUNT_TYPES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
