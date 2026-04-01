import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as transactionsService from '../../services/transactions.service.js';
import { useTransactions } from '../use-transactions.js';
import { useFiltersStore } from '@/stores/filters.store.js';

// ─── Mock service ─────────────────────────────────────────────────────────────

vi.mock('../../services/transactions.service.js', () => ({
  getTransactions: vi.fn(),
  getTransaction: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

// ─── Mock sonner toast ────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { wrapper: Wrapper, queryClient };
}

const mockTransaction = {
  id: 'transaction-1',
  accountId: 'account-1',
  categoryId: 'category-1',
  type: 'expense' as const,
  amount: '500.00',
  exchangeRate: null,
  description: 'Test',
  date: '2026-03-01',
  transferGroupId: null,
  transferSide: null,
  transferPeerAccountId: null,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

const mockPage = {
  data: [mockTransaction],
  meta: { page: 1, limit: 20, total: 1 },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFiltersStore.getState().clearFilters();
  });

  describe('fetch transactions', () => {
    it('returns transactions on successful fetch', async () => {
      vi.mocked(transactionsService.getTransactions).mockResolvedValue(mockPage);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.transactions.isSuccess).toBe(true);
      });

      expect(result.current.transactions.data?.pages[0]?.data).toEqual([mockTransaction]);
    });
  });

  describe('createTransaction', () => {
    it('shows success toast and invalidates queries on create', async () => {
      vi.mocked(transactionsService.getTransactions).mockResolvedValue(mockPage);
      vi.mocked(transactionsService.createTransaction).mockResolvedValue(mockTransaction);

      const { wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => expect(result.current.transactions.isSuccess).toBe(true));

      await act(async () => {
        result.current.createTransaction.mutate({
          type: 'expense',
          accountId: 'account-1',
          categoryId: 'category-1',
          amount: '500.00',
          date: '2026-03-01',
        });
      });

      await waitFor(() => {
        expect(result.current.createTransaction.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  describe('updateTransaction', () => {
    it('shows success toast and invalidates queries on update', async () => {
      vi.mocked(transactionsService.getTransactions).mockResolvedValue(mockPage);
      vi.mocked(transactionsService.updateTransaction).mockResolvedValue({
        ...mockTransaction,
        amount: '600.00',
      });

      const { wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => expect(result.current.transactions.isSuccess).toBe(true));

      await act(async () => {
        result.current.updateTransaction.mutate({
          id: 'transaction-1',
          data: { amount: '600.00' },
        });
      });

      await waitFor(() => {
        expect(result.current.updateTransaction.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  describe('deleteTransaction', () => {
    it('shows success toast and invalidates queries on delete', async () => {
      vi.mocked(transactionsService.getTransactions).mockResolvedValue(mockPage);
      vi.mocked(transactionsService.deleteTransaction).mockResolvedValue(undefined);

      const { wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => expect(result.current.transactions.isSuccess).toBe(true));

      await act(async () => {
        result.current.deleteTransaction.mutate('transaction-1');
      });

      await waitFor(() => {
        expect(result.current.deleteTransaction.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });
});
