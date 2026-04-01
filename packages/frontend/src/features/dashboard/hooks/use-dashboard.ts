import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../services/dashboard.service.js';
import type { DashboardSummaryResponse } from '@gastar/shared';

export function useDashboard() {
  const query = useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboard'],
    queryFn: getDashboardSummary,
  });

  return {
    summary: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
