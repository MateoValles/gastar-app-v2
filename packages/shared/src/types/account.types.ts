import type { AccountType } from '../constants/account-types.js';
import type { Currency } from '../constants/currencies.js';

/**
 * API response shape for an Account resource.
 *
 * `balance` is serialized as a string — NEVER a number — to preserve
 * Decimal(15,2) precision without floating-point corruption in JSON.
 *
 * `createdAt` and `updatedAt` are ISO 8601 strings.
 */
export interface AccountResponse {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: string; // Decimal serialized as string — NEVER a number
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
