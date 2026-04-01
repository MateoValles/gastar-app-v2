import { get, patch } from '@/lib/api-client.js';
import type { ApiResponse, UserProfile, UpdateUserInput } from '@gastar/shared';

export async function getMe(): Promise<UserProfile> {
  const response = await get<ApiResponse<UserProfile>>('/users/me');
  return response.data;
}

export async function updateMe(data: UpdateUserInput): Promise<UserProfile> {
  const response = await patch<ApiResponse<UserProfile>>('/users/me', data);
  return response.data;
}
