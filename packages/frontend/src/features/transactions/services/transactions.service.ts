import { get, post, patch, del } from '@/lib/api-client.js';
import type {
  ApiResponse,
  PaginationMeta,
  TransactionResponse,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '@gastar/shared';

// ─── Query params interface ─────────────────────────────────────────────────

export interface TransactionQuery {
  accountId?: string;
  categoryId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ─── Paginated response ─────────────────────────────────────────────────────

export interface TransactionPage {
  data: TransactionResponse[];
  meta: PaginationMeta;
}

// ─── Service functions ──────────────────────────────────────────────────────

export async function getTransactions(query: TransactionQuery = {}): Promise<TransactionPage> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  const queryString = params.toString();
  const url = queryString ? `/transactions?${queryString}` : '/transactions';
  const response = await get<ApiResponse<TransactionResponse[]>>(url);
  if (!response.meta) {
    throw new Error('MISSING_PAGINATION_META');
  }
  return { data: response.data, meta: response.meta };
}

export async function getTransaction(id: string): Promise<TransactionResponse> {
  const response = await get<ApiResponse<TransactionResponse>>(`/transactions/${id}`);
  return response.data;
}

export async function createTransaction(
  data: CreateTransactionInput,
): Promise<TransactionResponse> {
  const response = await post<ApiResponse<TransactionResponse>>('/transactions', data);
  return response.data;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionInput,
): Promise<TransactionResponse> {
  const response = await patch<ApiResponse<TransactionResponse>>(`/transactions/${id}`, data);
  return response.data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await del<ApiResponse<void>>(`/transactions/${id}`);
}
