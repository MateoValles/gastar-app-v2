import { http, HttpResponse } from 'msw';

const mockDashboardSummary = {
  currencyGroups: [
    {
      currency: 'ARS' as const,
      totalBalance: '85000.00',
      accountCount: 1,
      monthlyIncome: '50000.00',
      monthlyExpenses: '32000.00',
      monthlyNet: '18000.00',
    },
    {
      currency: 'USD' as const,
      totalBalance: '1500.00',
      accountCount: 1,
      monthlyIncome: '0.00',
      monthlyExpenses: '250.00',
      monthlyNet: '-250.00',
    },
  ],
  accounts: [
    {
      id: 'account-1',
      userId: 'user-1',
      name: 'Banco Galicia',
      type: 'checking' as const,
      currency: 'ARS' as const,
      balance: '85000.00',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'account-2',
      userId: 'user-1',
      name: 'Efectivo USD',
      type: 'cash' as const,
      currency: 'USD' as const,
      balance: '1500.00',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  expensesByCategory: [
    {
      categoryId: 'cat-1',
      categoryName: 'Comida',
      categoryColor: '#3B82F6',
      categoryIcon: 'ShoppingCart',
      currency: 'ARS' as const,
      total: '18000.00',
    },
    {
      categoryId: 'cat-2',
      categoryName: 'Transporte',
      categoryColor: '#F59E0B',
      categoryIcon: 'Car',
      currency: 'ARS' as const,
      total: '14000.00',
    },
  ],
  recentTransactions: [
    {
      id: 'tx-1',
      accountId: 'account-1',
      accountName: 'Banco Galicia',
      categoryId: null,
      categoryName: null,
      type: 'income' as const,
      amount: '50000.00',
      currency: 'ARS' as const,
      date: '2026-03-01',
      description: 'Sueldo',
      transferSide: null,
    },
    {
      id: 'tx-2',
      accountId: 'account-1',
      accountName: 'Banco Galicia',
      categoryId: 'cat-1',
      categoryName: 'Comida',
      type: 'expense' as const,
      amount: '5000.00',
      currency: 'ARS' as const,
      date: '2026-03-15',
      description: 'Supermercado',
      transferSide: null,
    },
    {
      id: 'tx-3',
      accountId: 'account-1',
      accountName: 'Banco Galicia',
      categoryId: null,
      categoryName: null,
      type: 'transfer' as const,
      amount: '10000.00',
      currency: 'ARS' as const,
      date: '2026-03-20',
      description: null,
      transferSide: 'out' as const,
    },
  ],
};

export const dashboardHandlers = [
  http.get('*/v1/dashboard/summary', () => {
    return HttpResponse.json({
      success: true,
      data: mockDashboardSummary,
    });
  }),
];
