import type { Currency } from '../constants/currencies.js';
import type { TransactionType, TransferSide } from '../constants/transaction-types.js';
import type { AccountResponse } from './account.types.js';

/**
 * Per-currency aggregation for the dashboard header cards.
 *
 * Balances and totals are NEVER consolidated across currencies — each entry
 * represents a distinct currency bucket. All monetary values are serialized
 * as strings to preserve Decimal(15,2) precision without floating-point corruption.
 */
export interface CurrencyGroupSummary {
  currency: Currency;
  totalBalance: string; // sum of account.balance for this currency (Decimal as string)
  accountCount: number;
  monthlyIncome: string; // sum of income txns this month (Decimal as string)
  monthlyExpenses: string; // sum of expense txns this month (Decimal as string)
  monthlyNet: string; // income - expenses (Decimal as string, can be negative)
}

/**
 * Single row in the expenses-by-category donut chart data.
 *
 * When a user has the same category on multiple accounts with the same currency,
 * those expenses are summed into a single item (grouped by categoryId + currency).
 */
export interface ExpenseByCategoryItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  currency: Currency;
  total: string; // Decimal as string
}

/**
 * Slim transaction shape for the "recent activity" list.
 *
 * `currency` is derived from the account (needed for display formatting).
 * Transfers appear here with `transferSide` set; they are excluded from
 * income/expense aggregations but included in recent activity.
 */
export interface RecentTransactionItem {
  id: string;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  type: TransactionType;
  amount: string; // Decimal as string
  currency: Currency; // from the account
  date: string; // YYYY-MM-DD
  description: string | null;
  transferSide: TransferSide | null;
}

/**
 * Top-level response for GET /v1/dashboard/summary.
 *
 * Aggregates all data needed by the frontend dashboard in a single call.
 * `accounts` reuses the existing `AccountResponse` type for full account details.
 */
export interface DashboardSummaryResponse {
  currencyGroups: CurrencyGroupSummary[];
  accounts: AccountResponse[];
  expensesByCategory: ExpenseByCategoryItem[];
  recentTransactions: RecentTransactionItem[];
}
