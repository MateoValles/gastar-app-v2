import { http, HttpResponse } from 'msw';

const mockUser = {
  id: 'user-1',
  email: 'john@example.com',
  name: 'John Doe',
  language: 'es',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const userHandlers = [
  http.get('*/v1/users/me', () => {
    return HttpResponse.json({
      success: true,
      data: mockUser,
    });
  }),

  http.patch('*/v1/users/me', async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      language?: string;
    };
    return HttpResponse.json({
      success: true,
      data: {
        ...mockUser,
        ...body,
      },
    });
  }),
];
