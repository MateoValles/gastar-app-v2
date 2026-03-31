import { get, post, patch, del } from '@/lib/api-client.js';
import type { ApiResponse } from '@gastar/shared';
import type { AccountResponse, CreateAccountInput, UpdateAccountInput } from '@gastar/shared';

export async function getAccounts(): Promise<AccountResponse[]> {
  const response = await get<ApiResponse<AccountResponse[]>>('/accounts');
  return response.data;
}

export async function getAccount(id: string): Promise<AccountResponse> {
  const response = await get<ApiResponse<AccountResponse>>(`/accounts/${id}`);
  return response.data;
}

export async function createAccount(data: CreateAccountInput): Promise<AccountResponse> {
  const response = await post<ApiResponse<AccountResponse>>('/accounts', data);
  return response.data;
}

export async function updateAccount(
  id: string,
  data: UpdateAccountInput,
): Promise<AccountResponse> {
  const response = await patch<ApiResponse<AccountResponse>>(`/accounts/${id}`, data);
  return response.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await del<ApiResponse<void>>(`/accounts/${id}`);
}
