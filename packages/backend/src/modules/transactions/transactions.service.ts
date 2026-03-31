import { Decimal } from '@prisma/client/runtime/library';
import type { Transaction as PrismaTransaction } from '@prisma/client';
import type {
  TransactionResponse,
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
  TransactionType,
  TransferSide,
} from '@gastar/shared';
import { prisma } from '@/lib/prisma.js';
import { NotFoundError, ValidationError } from '@/lib/errors.js';

/**
 * Transactions Service
 *
 * Ownership enforcement: Transactions have no direct `userId`. Ownership is
 * established via `account: { userId }` — every query joins through Account.
 *
 * Balance integrity: ALL balance mutations are wrapped in `prisma.$transaction()`
 * to atomically update Account.balance alongside the Transaction row(s).
 * NO EXCEPTIONS — this is a hard architectural rule.
 *
 * Amount storage: amounts are ALWAYS positive in the DB. Direction is derived
 * from `type` + `transferSide` via `getBalanceDelta()`.
 *
 * Transfers: represented as 2 rows sharing a `transferGroupId` (crypto.randomUUID()).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Task 3.1 — Response Mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Prisma Transaction row to the API response shape.
 *
 * - `amount` → string via `.toFixed(2)` (preserves trailing zeros, e.g. "100.50")
 * - `exchangeRate` → string via `.toFixed(6)` (6 decimal precision for rates)
 * - `date` (Date @db.Date) → YYYY-MM-DD via `.toISOString().slice(0, 10)`
 * - `createdAt` / `updatedAt` → ISO 8601 via `.toISOString()`
 * - All nullable fields are passed through as-is.
 *
 * NOTE: `.toString()` is intentionally avoided — it strips trailing zeros
 * (e.g. new Decimal('100.50').toString() === '100.5'). toFixed() is correct.
 */
export function toTransactionResponse(tx: PrismaTransaction): TransactionResponse {
  return {
    id: tx.id,
    accountId: tx.accountId,
    categoryId: tx.categoryId,
    type: tx.type as TransactionType,
    amount: tx.amount.toFixed(2), // Decimal → string with 2dp, NEVER float
    exchangeRate: tx.exchangeRate?.toFixed(6) ?? null, // 6dp for exchange rates
    description: tx.description,
    date: tx.date.toISOString().slice(0, 10), // YYYY-MM-DD (no time)
    transferGroupId: tx.transferGroupId,
    transferSide: tx.transferSide as TransferSide | null,
    transferPeerAccountId: tx.transferPeerAccountId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 3.2 — Balance Delta Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the signed balance delta for a transaction.
 *
 * Rules (amount is ALWAYS positive in DB):
 *  - income            → +amount (credit)
 *  - expense           → -amount (debit)
 *  - transfer / 'in'   → +amount (credit to destination)
 *  - transfer / 'out'  → -amount (debit from source)
 */
function getBalanceDelta(
  type: TransactionType,
  transferSide: TransferSide | null,
  amount: Decimal,
): Decimal {
  if (type === 'income' || (type === 'transfer' && transferSide === 'in')) {
    return amount;
  }
  return amount.negated(); // expense or transfer 'out'
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.1 — List Transactions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of transactions scoped to `userId`'s accounts.
 *
 * Filters are applied via `account: { userId }` — the join through Account
 * enforces ownership since Transaction has no direct `userId` field.
 */
export async function listTransactions(
  userId: string,
  query: ListTransactionsQuery,
): Promise<{
  data: TransactionResponse[];
  meta: { page: number; limit: number; total: number };
}> {
  const { accountId, categoryId, type, dateFrom, dateTo, sortBy, sortOrder, page, limit } = query;

  const where = {
    account: { userId },
    ...(accountId && { accountId }),
    ...(categoryId && { categoryId }),
    ...(type && { type }),
    ...((dateFrom || dateTo) && {
      date: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: transactions.map(toTransactionResponse),
    meta: { page, limit, total },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.2 — Get Transaction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single transaction by ID, verifying ownership via account.userId.
 * Throws `NotFoundError` if the transaction doesn't exist or is inaccessible.
 */
export async function getTransaction(userId: string, txId: string): Promise<TransactionResponse> {
  const tx = await prisma.transaction.findFirst({
    where: { id: txId, account: { userId } },
  });

  if (!tx) {
    throw new NotFoundError('Transaction not found');
  }

  return toTransactionResponse(tx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.3 — Create Transaction (router/dispatcher)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a transaction, branching on `data.type`.
 *
 * - income/expense → single record + balance update
 * - transfer       → two records (out + in) + two balance updates
 *
 * Returns a single `TransactionResponse` for income/expense, or an array of
 * two for transfers (index 0 = out leg, index 1 = in leg).
 */
export async function createTransaction(
  userId: string,
  data: CreateTransactionInput,
): Promise<TransactionResponse | TransactionResponse[]> {
  if (data.type === 'transfer') {
    return createTransfer(userId, data);
  }
  return createIncomeExpense(userId, data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.4 — Create Income/Expense (private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a single income or expense transaction.
 *
 * Steps:
 * 1. Verify account ownership (findFirst with account.userId).
 * 2. Verify category ownership (findFirst with category.userId).
 * 3. Atomically create the transaction + update the account balance.
 */
async function createIncomeExpense(
  userId: string,
  data: Extract<CreateTransactionInput, { type: 'income' | 'expense' }>,
): Promise<TransactionResponse> {
  const { accountId, categoryId, type, amount, description, date } = data;

  // 1. Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // 2. Verify category ownership
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const decimalAmount = new Decimal(amount);
  const delta = getBalanceDelta(type, null, decimalAmount);

  // 3. Atomic: create transaction + update balance
  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        accountId,
        categoryId,
        type,
        amount: decimalAmount,
        description: description ?? null,
        date: new Date(date),
      },
    }),
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    }),
  ]);

  return toTransactionResponse(tx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.5 — Create Transfer (private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a transfer as two linked Transaction rows.
 *
 * Steps:
 * 1. Verify ownership of BOTH accounts.
 * 2. Validate exchangeRate rules (required iff currencies differ).
 * 3. Generate transferGroupId (crypto.randomUUID()).
 * 4. Atomically: create out-leg, create in-leg, decrement src, increment dst.
 *
 * Returns [outLeg, inLeg] — always an array of exactly 2.
 */
async function createTransfer(
  userId: string,
  data: Extract<CreateTransactionInput, { type: 'transfer' }>,
): Promise<TransactionResponse[]> {
  const { fromAccountId, toAccountId, fromAmount, toAmount, exchangeRate, description, date } =
    data;

  // 1. Verify ownership of both accounts
  const [srcAccount, dstAccount] = await Promise.all([
    prisma.account.findFirst({ where: { id: fromAccountId, userId } }),
    prisma.account.findFirst({ where: { id: toAccountId, userId } }),
  ]);

  if (!srcAccount) {
    throw new NotFoundError('Source account not found');
  }
  if (!dstAccount) {
    throw new NotFoundError('Destination account not found');
  }

  // 2. Validate exchange rate logic
  const isCrossCurrency = srcAccount.currency !== dstAccount.currency;

  if (isCrossCurrency && !exchangeRate) {
    throw new ValidationError('Exchange rate is required for cross-currency transfers', []);
  }

  if (!isCrossCurrency && exchangeRate) {
    throw new ValidationError('Exchange rate must not be provided for same-currency transfers', []);
  }

  if (!isCrossCurrency && new Decimal(fromAmount).comparedTo(new Decimal(toAmount)) !== 0) {
    throw new ValidationError('toAmount must equal fromAmount for same-currency transfers', []);
  }

  const decimalFromAmount = new Decimal(fromAmount);
  const decimalToAmount = new Decimal(toAmount);
  const decimalExchangeRate = exchangeRate ? new Decimal(exchangeRate) : null;

  // 3. Generate shared group ID
  const transferGroupId = crypto.randomUUID();
  const txDate = new Date(date);

  // 4. Atomic: create both legs + update both balances
  const [outTx, inTx] = await prisma.$transaction([
    // Out leg (source account — debit)
    prisma.transaction.create({
      data: {
        accountId: fromAccountId,
        categoryId: null,
        type: 'transfer',
        amount: decimalFromAmount,
        exchangeRate: decimalExchangeRate,
        description: description ?? null,
        date: txDate,
        transferGroupId,
        transferSide: 'out',
        transferPeerAccountId: toAccountId,
      },
    }),
    // In leg (destination account — credit)
    prisma.transaction.create({
      data: {
        accountId: toAccountId,
        categoryId: null,
        type: 'transfer',
        amount: decimalToAmount,
        exchangeRate: decimalExchangeRate,
        description: description ?? null,
        date: txDate,
        transferGroupId,
        transferSide: 'in',
        transferPeerAccountId: fromAccountId,
      },
    }),
    // Debit source
    prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: decimalFromAmount } },
    }),
    // Credit destination
    prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: decimalToAmount } },
    }),
  ]);

  return [toTransactionResponse(outTx), toTransactionResponse(inTx)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.6 — Update Transaction (router/dispatcher)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates a transaction, branching on the existing transaction's type.
 *
 * Fetches the old transaction first to verify ownership and determine branch.
 * Returns single or array depending on type (matching createTransaction shape).
 */
export async function updateTransaction(
  userId: string,
  txId: string,
  data: UpdateTransactionInput,
): Promise<TransactionResponse | TransactionResponse[]> {
  // Fetch old transaction to verify ownership and get current state
  const oldTx = await prisma.transaction.findFirst({
    where: { id: txId, account: { userId } },
  });

  if (!oldTx) {
    throw new NotFoundError('Transaction not found');
  }

  if (oldTx.type === 'transfer') {
    return updateTransfer(userId, oldTx, data);
  }
  return updateIncomeExpense(userId, oldTx, data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.7 — Update Income/Expense (private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates an income or expense transaction.
 *
 * Balance adjustment: reverse the old delta, then apply the new delta.
 * Net delta = newDelta - oldDelta (both from getBalanceDelta).
 * Performed atomically: transaction update + account balance update.
 *
 * If `categoryId` is provided, ownership is verified before applying.
 */
async function updateIncomeExpense(
  userId: string,
  oldTx: PrismaTransaction,
  data: UpdateTransactionInput,
): Promise<TransactionResponse> {
  const type = oldTx.type as TransactionType;

  // Verify category ownership if categoryId is being updated
  if (data.categoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId },
    });
    if (!category) {
      throw new NotFoundError('Category not found');
    }
  }

  // Compute old delta (what the old transaction contributed)
  const oldDelta = getBalanceDelta(type, null, oldTx.amount);

  // New amount (use old if not updating)
  const newAmount = data.amount ? new Decimal(data.amount) : oldTx.amount;
  const newDelta = getBalanceDelta(type, null, newAmount);

  // Net delta to apply: reverse old + apply new
  const netDelta = newDelta.minus(oldDelta);

  const [updatedTx] = await prisma.$transaction([
    prisma.transaction.update({
      where: { id: oldTx.id },
      data: {
        ...(data.amount !== undefined && { amount: new Decimal(data.amount) }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
      },
    }),
    prisma.account.update({
      where: { id: oldTx.accountId },
      data: { balance: { increment: netDelta } },
    }),
  ]);

  return toTransactionResponse(updatedTx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.8 — Update Transfer (private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates both legs of a transfer atomically.
 *
 * The `oldTx` may be either the out-leg or in-leg. We fetch the peer via
 * `transferGroupId` scoped to `account: { userId }`.
 *
 * Balance adjustment: reverse old effects on both accounts, apply new effects.
 * `amount` in the body updates the out-leg; `toAmount` updates the in-leg.
 */
async function updateTransfer(
  userId: string,
  oldTx: PrismaTransaction,
  data: UpdateTransactionInput,
): Promise<TransactionResponse[]> {
  // Transfers have no category — reject if client sends categoryId
  if (data.categoryId !== undefined) {
    throw new ValidationError('categoryId cannot be set on transfers', []);
  }

  // Find the peer leg (same transferGroupId, different id, user-scoped)
  const peer = await prisma.transaction.findFirst({
    where: {
      transferGroupId: oldTx.transferGroupId!,
      id: { not: oldTx.id },
      account: { userId },
    },
  });

  if (!peer) {
    throw new NotFoundError('Transfer peer transaction not found');
  }

  // Identify out and in legs regardless of which one was passed
  const outTx = oldTx.transferSide === 'out' ? oldTx : peer;
  const inTx = oldTx.transferSide === 'in' ? oldTx : peer;

  // Re-validate currency/exchangeRate invariants when amounts or rate change
  if (data.amount !== undefined || data.toAmount !== undefined || data.exchangeRate !== undefined) {
    const [srcAccount, dstAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: outTx.accountId, userId } }),
      prisma.account.findFirst({ where: { id: inTx.accountId, userId } }),
    ]);

    if (!srcAccount || !dstAccount) {
      throw new NotFoundError('Transfer account not found');
    }

    const isCrossCurrency = srcAccount.currency !== dstAccount.currency;
    const effectiveRate =
      data.exchangeRate !== undefined
        ? data.exchangeRate
        : (outTx.exchangeRate?.toString() ?? undefined);

    if (isCrossCurrency && !effectiveRate) {
      throw new ValidationError('Exchange rate is required for cross-currency transfers', []);
    }

    if (!isCrossCurrency && effectiveRate) {
      throw new ValidationError(
        'Exchange rate must not be provided for same-currency transfers',
        [],
      );
    }

    // For same-currency: if either amount changes, both must stay equal
    if (!isCrossCurrency) {
      const effectiveOutAmount = data.amount ?? outTx.amount.toString();
      const effectiveInAmount = data.toAmount ?? inTx.amount.toString();
      if (new Decimal(effectiveOutAmount).comparedTo(new Decimal(effectiveInAmount)) !== 0) {
        throw new ValidationError('toAmount must equal amount for same-currency transfers', []);
      }
    }
  }

  // Compute old balance effects
  const oldOutDelta = getBalanceDelta('transfer', 'out', outTx.amount); // negative
  const oldInDelta = getBalanceDelta('transfer', 'in', inTx.amount); // positive

  // New amounts (fall back to existing if not provided)
  const newOutAmount = data.amount ? new Decimal(data.amount) : outTx.amount;
  const newInAmount = data.toAmount ? new Decimal(data.toAmount) : inTx.amount;

  // New exchange rate
  const newExchangeRate =
    data.exchangeRate !== undefined
      ? data.exchangeRate
        ? new Decimal(data.exchangeRate)
        : null
      : outTx.exchangeRate;

  // New balance effects
  const newOutDelta = getBalanceDelta('transfer', 'out', newOutAmount); // negative
  const newInDelta = getBalanceDelta('transfer', 'in', newInAmount); // positive

  // Net deltas: reverse old + apply new
  const netSrcDelta = newOutDelta.minus(oldOutDelta);
  const netDstDelta = newInDelta.minus(oldInDelta);

  const newDate = data.date ? new Date(data.date) : undefined;

  const [updatedOut, updatedIn] = await prisma.$transaction([
    prisma.transaction.update({
      where: { id: outTx.id },
      data: {
        amount: newOutAmount,
        exchangeRate: newExchangeRate,
        ...(data.description !== undefined && { description: data.description }),
        ...(newDate && { date: newDate }),
      },
    }),
    prisma.transaction.update({
      where: { id: inTx.id },
      data: {
        amount: newInAmount,
        exchangeRate: newExchangeRate,
        ...(data.description !== undefined && { description: data.description }),
        ...(newDate && { date: newDate }),
      },
    }),
    prisma.account.update({
      where: { id: outTx.accountId },
      data: { balance: { increment: netSrcDelta } },
    }),
    prisma.account.update({
      where: { id: inTx.accountId },
      data: { balance: { increment: netDstDelta } },
    }),
  ]);

  return [toTransactionResponse(updatedOut), toTransactionResponse(updatedIn)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.9 — Delete Transaction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a transaction (or both legs of a transfer), reversing balance effects.
 *
 * For income/expense: delete + reverse single balance change.
 * For transfer: find peer leg, delete both + reverse both balance changes.
 *
 * Returns the deleted transaction(s) for the response envelope.
 */
export async function deleteTransaction(
  userId: string,
  txId: string,
): Promise<TransactionResponse | TransactionResponse[]> {
  // Fetch and verify ownership
  const tx = await prisma.transaction.findFirst({
    where: { id: txId, account: { userId } },
  });

  if (!tx) {
    throw new NotFoundError('Transaction not found');
  }

  if (tx.type === 'transfer') {
    return deleteTransfer(userId, tx);
  }
  return deleteIncomeExpense(tx);
}

/**
 * Deletes a single income or expense transaction and reverses its balance effect.
 */
async function deleteIncomeExpense(tx: PrismaTransaction): Promise<TransactionResponse> {
  const type = tx.type as TransactionType;
  const delta = getBalanceDelta(type, null, tx.amount);
  // Reverse: negate the delta
  const reverseDelta = delta.negated();

  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: tx.id } }),
    prisma.account.update({
      where: { id: tx.accountId },
      data: { balance: { increment: reverseDelta } },
    }),
  ]);

  return toTransactionResponse(tx);
}

/**
 * Deletes both legs of a transfer and reverses both balance effects.
 *
 * Ownership of peer is verified by scoping the peer lookup to `account: { userId }`.
 */
async function deleteTransfer(
  userId: string,
  tx: PrismaTransaction,
): Promise<TransactionResponse[]> {
  // Find the peer leg (same group, different id, user-scoped)
  const peer = await prisma.transaction.findFirst({
    where: {
      transferGroupId: tx.transferGroupId!,
      id: { not: tx.id },
      account: { userId },
    },
  });

  if (!peer) {
    throw new NotFoundError('Transfer peer transaction not found');
  }

  const outTx = tx.transferSide === 'out' ? tx : peer;
  const inTx = tx.transferSide === 'in' ? tx : peer;

  // Reverse old balance effects
  const outDelta = getBalanceDelta('transfer', 'out', outTx.amount); // negative
  const inDelta = getBalanceDelta('transfer', 'in', inTx.amount); // positive

  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: outTx.id } }),
    prisma.transaction.delete({ where: { id: inTx.id } }),
    // Reverse out-leg: add back what was removed from src
    prisma.account.update({
      where: { id: outTx.accountId },
      data: { balance: { increment: outDelta.negated() } },
    }),
    // Reverse in-leg: remove what was added to dst
    prisma.account.update({
      where: { id: inTx.accountId },
      data: { balance: { increment: inDelta.negated() } },
    }),
  ]);

  return [toTransactionResponse(outTx), toTransactionResponse(inTx)];
}
