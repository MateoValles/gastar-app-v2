import { post, clearAccessToken, setAccessToken } from '@/lib/api-client.js';
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
  const response = await post<ApiResponse<LoginResponse>>('/auth/login', data, {
    credentials: 'include',
  });
  const result = response.data;
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
    throw new Error('Refresh failed');
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
