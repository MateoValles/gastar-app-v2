import { get } from '@/lib/api-client.js';
import type { ApiResponse, DashboardSummaryResponse } from '@gastar/shared';

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await get<ApiResponse<DashboardSummaryResponse>>('/dashboard/summary');
  return response.data;
}
