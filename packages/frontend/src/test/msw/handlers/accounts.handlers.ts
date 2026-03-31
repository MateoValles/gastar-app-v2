import { http, HttpResponse } from 'msw';

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

const mockAccount2 = {
  id: 'account-2',
  userId: 'user-1',
  name: 'Efectivo',
  type: 'cash' as const,
  currency: 'USD' as const,
  balance: '500.00',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const accountHandlers = [
  http.get('*/v1/accounts', () => {
    return HttpResponse.json({
      success: true,
      data: [mockAccount, mockAccount2],
    });
  }),

  http.get('*/v1/accounts/:id', ({ params }) => {
    const { id } = params;
    if (id === 'account-1') {
      return HttpResponse.json({ success: true, data: mockAccount });
    }
    if (id === 'account-2') {
      return HttpResponse.json({ success: true, data: mockAccount2 });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } },
      { status: 404 },
    );
  }),

  http.post('*/v1/accounts', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      type: string;
      currency: string;
      initialBalance?: string;
    };
    return HttpResponse.json(
      {
        success: true,
        data: {
          ...mockAccount,
          id: 'account-new',
          name: body.name,
          type: body.type,
          currency: body.currency,
          balance: body.initialBalance ?? '0.00',
        },
      },
      { status: 201 },
    );
  }),

  http.patch('*/v1/accounts/:id', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { name?: string; type?: string };
    return HttpResponse.json({
      success: true,
      data: {
        ...mockAccount,
        id,
        ...body,
      },
    });
  }),

  http.delete('*/v1/accounts/:id', ({ params }) => {
    const { id } = params;
    if (id === 'account-with-transactions') {
      return HttpResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Account has transactions' } },
        { status: 409 },
      );
    }
    return HttpResponse.json({ success: true, data: null });
  }),
];
