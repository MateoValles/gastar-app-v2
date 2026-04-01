import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useFiltersStore } from '@/stores/filters.store.js';
import * as transactionsService from '../services/transactions.service.js';
import type { TransactionPage } from '../services/transactions.service.js';
import type { UpdateTransactionInput } from '@gastar/shared';

export function useTransactions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Read filter values from store
  const accountId = useFiltersStore((s) => s.accountId);
  const categoryId = useFiltersStore((s) => s.categoryId);
  const type = useFiltersStore((s) => s.type);
  const dateFrom = useFiltersStore((s) => s.dateFrom);
  const dateTo = useFiltersStore((s) => s.dateTo);
  const limit = useFiltersStore((s) => s.limit);

  const filters = { accountId, categoryId, type, dateFrom, dateTo, limit };

  const transactions = useInfiniteQuery<TransactionPage>({
    queryKey: ['transactions', filters],
    queryFn: ({ pageParam }) =>
      transactionsService.getTransactions({ ...filters, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.meta.total / lastPage.meta.limit);
      return lastPage.meta.page < totalPages ? lastPage.meta.page + 1 : undefined;
    },
  });

  const createTransaction = useMutation({
    mutationFn: transactionsService.createTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.created', { entity: t('common.transaction') }));
    },
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      transactionsService.updateTransaction(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.updated', { entity: t('common.transaction') }));
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: transactionsService.deleteTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.deleted', { entity: t('common.transaction') }));
    },
  });

  return { transactions, createTransaction, updateTransaction, deleteTransaction };
}
