import { http, HttpResponse } from 'msw';

export const authHandlers = [
  http.post('*/v1/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'test-token',
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      },
    });
  }),

  http.post('*/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; name: string };
    return HttpResponse.json(
      {
        success: true,
        data: {
          user: { id: 'user-1', email: body.email, name: body.name },
        },
      },
      { status: 201 },
    );
  }),

  http.post('*/v1/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'refreshed-token',
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      },
    });
  }),

  http.post('*/v1/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),

  http.post('*/v1/auth/forgot-password', () => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),

  http.post('*/v1/auth/reset-password', () => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),
];
