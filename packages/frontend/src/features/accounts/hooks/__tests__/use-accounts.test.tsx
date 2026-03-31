import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as accountsService from '../../services/accounts.service.js';
import { useAccounts } from '../use-accounts.js';

// ─── Mock accounts service ────────────────────────────────────────────────────
vi.mock('../../services/accounts.service.js', () => ({
  getAccounts: vi.fn(),
  getAccount: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
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

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockAccount = {
  id: 'account-1',
  userId: 'user-1',
  name: 'Banco Galicia',
  type: 'checking' as const,
  currency: 'ARS' as const,
  balance: '10000.00',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetch accounts', () => {
    it('returns accounts on successful fetch', async () => {
      vi.mocked(accountsService.getAccounts).mockResolvedValue([mockAccount]);

      const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.accounts.isSuccess).toBe(true);
      });

      expect(result.current.accounts.data).toEqual([mockAccount]);
    });
  });

  describe('createAccount', () => {
    it('shows success toast and invalidates queries on create', async () => {
      vi.mocked(accountsService.getAccounts).mockResolvedValue([mockAccount]);
      vi.mocked(accountsService.createAccount).mockResolvedValue(mockAccount);

      const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.accounts.isSuccess).toBe(true));

      await act(async () => {
        result.current.createAccount.mutate({
          name: 'New Account',
          type: 'savings',
          currency: 'USD',
        });
      });

      await waitFor(() => {
        expect(result.current.createAccount.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('updateAccount', () => {
    it('shows success toast on update', async () => {
      vi.mocked(accountsService.getAccounts).mockResolvedValue([mockAccount]);
      vi.mocked(accountsService.updateAccount).mockResolvedValue({
        ...mockAccount,
        name: 'Updated Name',
      });

      const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.accounts.isSuccess).toBe(true));

      await act(async () => {
        result.current.updateAccount.mutate({ id: 'account-1', data: { name: 'Updated Name' } });
      });

      await waitFor(() => {
        expect(result.current.updateAccount.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('shows success toast on delete', async () => {
      vi.mocked(accountsService.getAccounts).mockResolvedValue([mockAccount]);
      vi.mocked(accountsService.deleteAccount).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.accounts.isSuccess).toBe(true));

      await act(async () => {
        result.current.deleteAccount.mutate('account-1');
      });

      await waitFor(() => {
        expect(result.current.deleteAccount.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
    });

    it('shows warning toast on 409 delete error', async () => {
      vi.mocked(accountsService.getAccounts).mockResolvedValue([mockAccount]);
      vi.mocked(accountsService.deleteAccount).mockRejectedValue(
        new Error('Account has transactions'),
      );

      const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.accounts.isSuccess).toBe(true));

      await act(async () => {
        result.current.deleteAccount.mutate('account-1');
      });

      await waitFor(() => {
        expect(result.current.deleteAccount.isError).toBe(true);
      });

      expect(toast.warning).toHaveBeenCalled();
    });
  });
});
