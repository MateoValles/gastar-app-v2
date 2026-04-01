import { http, HttpResponse } from 'msw';

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockTransaction1 = {
  id: 'transaction-1',
  accountId: 'account-1',
  categoryId: 'category-1',
  type: 'expense',
  amount: '500.00',
  exchangeRate: null,
  description: 'Supermercado',
  date: '2026-03-01',
  transferGroupId: null,
  transferSide: null,
  transferPeerAccountId: null,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

const mockTransaction2 = {
  id: 'transaction-2',
  accountId: 'account-1',
  categoryId: null,
  type: 'income',
  amount: '120000.00',
  exchangeRate: null,
  description: 'Sueldo',
  date: '2026-03-05',
  transferGroupId: null,
  transferSide: null,
  transferPeerAccountId: null,
  createdAt: '2026-03-05T09:00:00.000Z',
  updatedAt: '2026-03-05T09:00:00.000Z',
};

const mockTransactionPage = {
  success: true,
  data: [mockTransaction1, mockTransaction2],
  meta: { page: 1, limit: 20, total: 2 },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const transactionHandlers = [
  http.get('*/v1/transactions', () => {
    return HttpResponse.json(mockTransactionPage);
  }),

  http.get('*/v1/transactions/:id', ({ params }) => {
    const { id } = params;
    if (id === 'transaction-1') {
      return HttpResponse.json({ success: true, data: mockTransaction1 });
    }
    if (id === 'transaction-2') {
      return HttpResponse.json({ success: true, data: mockTransaction2 });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } },
      { status: 404 },
    );
  }),

  http.post('*/v1/transactions', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        success: true,
        data: {
          ...mockTransaction1,
          id: 'transaction-new',
          type: (body.type as string) ?? 'expense',
          accountId: (body.accountId as string) ?? 'account-1',
          categoryId: (body.categoryId as string) ?? null,
          amount: (body.amount as string) ?? '100.00',
          description: (body.description as string) ?? null,
          date: (body.date as string) ?? '2026-03-01',
        },
      },
      { status: 201 },
    );
  }),

  http.patch('*/v1/transactions/:id', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: {
        ...mockTransaction1,
        id,
        ...body,
      },
    });
  }),

  http.delete('*/v1/transactions/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];
