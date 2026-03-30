import type { TransactionType, TransferSide } from '../constants/transaction-types.js';

/**
 * API response shape for a Transaction resource.
 *
 * `amount` and `exchangeRate` are serialized as strings — NEVER numbers — to
 * preserve Decimal(15,2) / Decimal(15,6) precision without floating-point
 * corruption in JSON.
 *
 * `date` is a YYYY-MM-DD string (the DB column is @db.Date — no time component).
 * `createdAt` and `updatedAt` are ISO 8601 strings.
 *
 * Transfer-specific fields (`transferGroupId`, `transferSide`,
 * `transferPeerAccountId`) are null for income and expense transactions.
 * `categoryId` is null for transfer transactions.
 */
export interface TransactionResponse {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: string; // Decimal serialized as string — NEVER a number
  exchangeRate: string | null; // Decimal serialized as string — NEVER a number
  description: string | null;
  date: string; // YYYY-MM-DD
  transferGroupId: string | null;
  transferSide: TransferSide | null;
  transferPeerAccountId: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
