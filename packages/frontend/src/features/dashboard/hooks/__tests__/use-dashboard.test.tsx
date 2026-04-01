import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import * as dashboardService from '../../services/dashboard.service.js';
import { useDashboard } from '../use-dashboard.js';

// ─── Mock dashboard service ───────────────────────────────────────────────────
vi.mock('../../services/dashboard.service.js', () => ({
  getDashboardSummary: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { wrapper: Wrapper, queryClient };
}

const mockSummary = {
  currencyGroups: [
    {
      currency: 'ARS' as const,
      totalBalance: '10000.00',
      accountCount: 1,
      monthlyIncome: '5000.00',
      monthlyExpenses: '2000.00',
      monthlyNet: '3000.00',
    },
  ],
  accounts: [
    {
      id: 'account-1',
      userId: 'user-1',
      name: 'Banco Galicia',
      type: 'checking' as const,
      currency: 'ARS' as const,
      balance: '10000.00',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  expensesByCategory: [
    {
      categoryId: 'cat-1',
      categoryName: 'Food',
      categoryColor: '#3B82F6',
      categoryIcon: null,
      currency: 'ARS' as const,
      total: '2000.00',
    },
  ],
  recentTransactions: [
    {
      id: 'tx-1',
      accountId: 'account-1',
      accountName: 'Banco Galicia',
      categoryId: 'cat-1',
      categoryName: 'Food',
      type: 'expense' as const,
      amount: '500.00',
      currency: 'ARS' as const,
      date: '2026-03-15',
      description: 'Mercado',
      transferSide: null,
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns summary on successful fetch', async () => {
    vi.mocked(dashboardService.getDashboardSummary).mockResolvedValue(mockSummary);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toEqual(mockSummary);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state while fetching', () => {
    vi.mocked(dashboardService.getDashboardSummary).mockReturnValue(new Promise(() => {}));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDashboard(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.summary).toBeUndefined();
  });

  it('returns error on fetch failure', async () => {
    const mockError = new Error('Network error');
    vi.mocked(dashboardService.getDashboardSummary).mockRejectedValue(mockError);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.summary).toBeUndefined();
  });
});
