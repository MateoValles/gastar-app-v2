import { http, HttpResponse } from 'msw';

const mockCategory1 = {
  id: 'category-1',
  userId: 'user-1',
  name: 'Comida',
  icon: 'ShoppingCart',
  color: '#3B82F6',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCategory2 = {
  id: 'category-2',
  userId: 'user-1',
  name: 'Transporte',
  icon: 'Car',
  color: '#22C55E',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ID used to simulate a category that has transactions (triggers 409)
const CATEGORY_WITH_TRANSACTIONS_ID = 'category-has-transactions';

export const categoryHandlers = [
  http.get('*/v1/categories', () => {
    return HttpResponse.json({
      success: true,
      data: [mockCategory1, mockCategory2],
    });
  }),

  http.get('*/v1/categories/:id', ({ params }) => {
    const { id } = params;
    if (id === 'category-1') {
      return HttpResponse.json({ success: true, data: mockCategory1 });
    }
    if (id === 'category-2') {
      return HttpResponse.json({ success: true, data: mockCategory2 });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } },
      { status: 404 },
    );
  }),

  http.post('*/v1/categories', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      icon?: string;
      color?: string;
    };
    return HttpResponse.json(
      {
        success: true,
        data: {
          ...mockCategory1,
          id: 'category-new',
          name: body.name,
          icon: body.icon ?? null,
          color: body.color ?? null,
        },
      },
      { status: 201 },
    );
  }),

  http.patch('*/v1/categories/:id', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { name?: string; icon?: string; color?: string };
    return HttpResponse.json({
      success: true,
      data: {
        ...mockCategory1,
        id,
        ...body,
      },
    });
  }),

  http.delete('*/v1/categories/:id', ({ params }) => {
    const { id } = params;
    if (id === CATEGORY_WITH_TRANSACTIONS_ID) {
      return HttpResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Category has transactions' } },
        { status: 409 },
      );
    }
    return HttpResponse.json({ success: true, data: null });
  }),
];
