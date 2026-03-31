import { get, post, patch, del } from '@/lib/api-client.js';
import type { ApiResponse } from '@gastar/shared';
import type { CategoryResponse, CreateCategoryInput, UpdateCategoryInput } from '@gastar/shared';

export async function getCategories(): Promise<CategoryResponse[]> {
  const response = await get<ApiResponse<CategoryResponse[]>>('/categories');
  return response.data;
}

export async function getCategory(id: string): Promise<CategoryResponse> {
  const response = await get<ApiResponse<CategoryResponse>>(`/categories/${id}`);
  return response.data;
}

export async function createCategory(data: CreateCategoryInput): Promise<CategoryResponse> {
  const response = await post<ApiResponse<CategoryResponse>>('/categories', data);
  return response.data;
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput,
): Promise<CategoryResponse> {
  const response = await patch<ApiResponse<CategoryResponse>>(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await del<ApiResponse<void>>(`/categories/${id}`);
}
