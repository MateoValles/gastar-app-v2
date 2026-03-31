import { post, clearAccessToken, setAccessToken } from '@/lib/api-client.js';
import { ApiError } from '@/lib/api-error.js';
import type { ApiResponse, UserProfile } from '@gastar/shared';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@gastar/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

export interface LoginResponse {
  accessToken: string;
  user: UserProfile;
}

export interface RegisterResponse {
  user: UserProfile;
}

export async function login(data: LoginInput): Promise<LoginResponse> {
  // Use raw fetch to avoid the 401 interceptor in api-client.
  // A failed login returns 401 (invalid credentials) — we don't want that
  // to trigger refreshOrQueue(), which would hard-redirect to /login.
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let code = 'INTERNAL_ERROR';
    let message = code;
    let details: Array<{ field: string; message: string }> | undefined;
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string; details?: typeof details };
      };
      if (body.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? code;
        details = body.error.details;
      }
    } catch {
      // Could not parse error body — use defaults
    }
    throw new ApiError(code, message, response.status, details);
  }

  const body = (await response.json()) as ApiResponse<LoginResponse>;
  const result = body.data;
  setAccessToken(result.accessToken);
  return result;
}

export async function register(data: RegisterInput): Promise<RegisterResponse> {
  const response = await post<ApiResponse<RegisterResponse>>('/auth/register', data);
  return response.data;
}

export async function refresh(): Promise<LoginResponse> {
  // Use raw fetch to avoid the 401 interceptor loop in api-client
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
  }

  const body = (await response.json()) as ApiResponse<LoginResponse>;
  const result = body.data;
  setAccessToken(result.accessToken);
  return result;
}

export async function logout(): Promise<void> {
  await post<ApiResponse<null>>('/auth/logout', undefined, {
    credentials: 'include',
  });
  clearAccessToken();
}

export async function forgotPassword(data: ForgotPasswordInput): Promise<null> {
  const response = await post<ApiResponse<null>>('/auth/forgot-password', data);
  return response.data;
}

export async function resetPassword(data: ResetPasswordInput): Promise<null> {
  const response = await post<ApiResponse<null>>('/auth/reset-password', data);
  return response.data;
}
