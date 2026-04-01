import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type {
  CreateTransactionInput,
  TransactionResponse,
  UpdateTransactionInput,
} from '@gastar/shared';
import { useMediaQuery } from '@/hooks/use-media-query.js';
import { useTransactions } from '../hooks/use-transactions.js';
import { useFilterSync } from '../hooks/use-filter-sync.js';
import { useAccounts } from '@/features/accounts/hooks/use-accounts.js';
import { useCategories } from '@/features/categories/hooks/use-categories.js';
import { TransactionTable } from '../components/TransactionTable.js';
import { TransactionCard } from '../components/TransactionCard.js';
import { TransactionForm, type TransactionFormSubmitData } from '../components/TransactionForm.js';
import { FilterBar, FilterIconButton } from '../components/FilterBar.js';
import { MobileFilterSheet } from '../components/MobileFilterSheet.js';
import { TransactionsEmptyState } from '../components/TransactionsEmptyState.js';
import { TransactionsNoResults } from '../components/TransactionsNoResults.js';
import { Button } from '@/components/ui/button.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog.js';
import { useFiltersStore } from '@/stores/filters.store.js';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Sync URL ↔ store
  useFilterSync();

  const activeFilterCount = useFiltersStore((s) => s.activeFilterCount);
  const hasActiveFilters = activeFilterCount() > 0;

  // Data hooks
  const { transactions, createTransaction, updateTransaction, deleteTransaction } =
    useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];

  // UI state
  const [formOpen, setFormOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionResponse | null>(null);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleCreateClick() {
    setEditingTransaction(null);
    setFormOpen(true);
  }

  function handleEditClick(tx: TransactionResponse) {
    setEditingTransaction(tx);
    setFormOpen(true);
  }

  function handleDeleteClick(tx: TransactionResponse) {
    setDeletingTransaction(tx);
  }

  function handleFormSubmit(data: TransactionFormSubmitData) {
    if (editingTransaction) {
      // Build update payload — accountId/fromAccountId/toAccountId excluded from updates
      const updateData: UpdateTransactionInput = {};
      if (data.mode !== 'transfer') {
        if (data.amount) updateData.amount = data.amount;
        if (data.categoryId) updateData.categoryId = data.categoryId;
      } else {
        if (data.fromAmount) updateData.amount = data.fromAmount;
        if (data.toAmount) updateData.toAmount = data.toAmount;
        if (data.exchangeRate) updateData.exchangeRate = data.exchangeRate;
      }
      if (data.description !== undefined) updateData.description = data.description;
      if (data.date) updateData.date = data.date;

      updateTransaction.mutate(
        { id: editingTransaction.id, data: updateData },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      // Build create payload
      let createData: CreateTransactionInput;

      if (data.mode === 'transfer') {
        createData = {
          type: 'transfer',
          fromAccountId: data.fromAccountId!,
          toAccountId: data.toAccountId!,
          fromAmount: data.fromAmount!,
          toAmount: data.toAmount!,
          exchangeRate: data.exchangeRate,
          description: data.description,
          date: data.date,
        };
      } else {
        createData = {
          type: data.mode,
          accountId: data.accountId!,
          categoryId: data.categoryId!,
          amount: data.amount!,
          description: data.description,
          date: data.date,
        };
      }

      createTransaction.mutate(createData, { onSuccess: () => setFormOpen(false) });
    }
  }

  function handleDeleteConfirm() {
    if (!deletingTransaction) return;
    deleteTransaction.mutate(deletingTransaction.id, {
      onSuccess: () => setDeletingTransaction(null),
      onError: () => setDeletingTransaction(null),
    });
  }

  // ─── Loading state ────────────────────────────────────────────────────────────

  if (transactions.isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="mb-4 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-36" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  // Flatten pages
  const pages = transactions.data;
  const allTransactions = pages?.pages.flatMap((p) => p.data) ?? [];
  const totalCount = pages?.pages[0]?.meta.total ?? 0;

  // Determine empty state type
  const isCompletelyEmpty = totalCount === 0 && !hasActiveFilters;
  const isFilteredEmpty = totalCount === 0 && hasActiveFilters;

  return (
    <div className="p-4 pb-24 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('transactions.title')}</h1>
        <Button onClick={handleCreateClick} className="flex">
          <Plus className="size-4" />
          {t('transactions.newTransaction')}
        </Button>
      </div>

      {/* Filter bar — desktop inline, mobile icon button */}
      <div className="mb-4">
        {isDesktop ? (
          <FilterBar accounts={accountList} categories={categoryList} />
        ) : (
          <FilterIconButton onClick={() => setFilterSheetOpen(true)} />
        )}
      </div>

      {/* Empty states */}
      {isCompletelyEmpty && <TransactionsEmptyState onCreateTransaction={handleCreateClick} />}

      {isFilteredEmpty && <TransactionsNoResults />}

      {/* Transaction list */}
      {!isCompletelyEmpty && !isFilteredEmpty && pages && (
        <>
          {isDesktop ? (
            <TransactionTable
              pages={pages}
              fetchNextPage={transactions.fetchNextPage}
              isFetchingNextPage={transactions.isFetchingNextPage}
              hasNextPage={transactions.hasNextPage}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              accounts={accountList}
              categories={categoryList}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {allTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  accounts={accountList}
                  categories={categoryList}
                />
              ))}

              {/* Mobile infinite scroll sentinel */}
              {transactions.isFetchingNextPage && (
                <div className="flex flex-col gap-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              )}
              {transactions.hasNextPage && !transactions.isFetchingNextPage && (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => transactions.fetchNextPage()}
                >
                  {t('transactions.loadingMore')}
                </Button>
              )}
              {!transactions.hasNextPage && allTransactions.length > 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  {t('transactions.noMoreTransactions')}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Create/Edit form */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTransaction}
        accounts={accountList}
        categories={categoryList}
        onSubmit={handleFormSubmit}
        isLoading={createTransaction.isPending || updateTransaction.isPending}
      />

      {/* Mobile filter sheet */}
      <MobileFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        accounts={accountList}
        categories={categoryList}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => {
          if (!open) setDeletingTransaction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactions.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction?.type === 'transfer'
                ? t('transactions.deleteTransferDescription')
                : t('transactions.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteTransaction.isPending}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
