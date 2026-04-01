import { ApiError } from './api-error.js';

/**
 * Base URL for all API requests.
 *
 * - Development: override with VITE_API_URL (e.g. 'http://localhost:3001/v1')
 *   so the frontend dev server can proxy to the backend running on a different port.
 * - Production (single-container): defaults to '/v1' — same-origin, no CORS needed.
 *
 * The env var takes precedence when defined, making dev and CI overrides easy.
 */
export const BASE_URL = import.meta.env.VITE_API_URL ?? '/v1';

// Module-level state — NOT in React/Zustand/context
let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

// ─── Token management ──────────────────────────────────────────────────────

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ─── Refresh logic ─────────────────────────────────────────────────────────

/**
 * Handles reactive token refresh.
 * - If a refresh is already in-flight, returns the same promise (queuing behavior).
 * - If no refresh is in-flight, starts a new one.
 * - On failure, clears the token and redirects to /login.
 */
async function refreshOrQueue(): Promise<string> {
  if (refreshPromise !== null) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = (await response.json()) as { data: { accessToken: string } };
      const newToken = data.data.accessToken;
      setAccessToken(newToken);
      return newToken;
    } catch {
      clearAccessToken();
      // Redirect to login on refresh failure
      window.location.href = '/login';
      throw new ApiError('UNAUTHORIZED', 'Session expired', 401);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Core fetch wrapper ────────────────────────────────────────────────────

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Handle 401: refresh token and retry once
  if (response.status === 401) {
    const newToken = await refreshOrQueue();

    const retryHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${newToken}`,
    };

    const retryResponse = await fetch(fullUrl, {
      ...options,
      headers: retryHeaders,
    });

    if (!retryResponse.ok) {
      await throwApiError(retryResponse);
    }

    return retryResponse.json() as Promise<T>;
  }

  if (!response.ok) {
    await throwApiError(response);
  }

  // Handle empty responses (e.g. 204 No Content)
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

async function throwApiError(response: Response): Promise<never> {
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: Array<{ field: string; message: string }> | undefined;

  try {
    const body = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
        details?: Array<{ field: string; message: string }>;
      };
    };
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    // Could not parse error body — use defaults
  }

  throw new ApiError(code, message, response.status, details);
}

// ─── Convenience wrappers ──────────────────────────────────────────────────

export function get<T>(url: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(url, { ...options, method: 'GET' });
}

export function post<T>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function patch<T>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(url: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(url, { ...options, method: 'DELETE' });
}
