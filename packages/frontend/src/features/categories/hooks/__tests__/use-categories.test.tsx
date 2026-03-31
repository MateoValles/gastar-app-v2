import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as categoriesService from '../../services/categories.service.js';
import { useCategories } from '../use-categories.js';

// ─── Mock categories service ──────────────────────────────────────────────────
vi.mock('../../services/categories.service.js', () => ({
  getCategories: vi.fn(),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

// ─── Mock sonner toast ────────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { wrapper: Wrapper, queryClient };
}

const mockCategory = {
  id: 'category-1',
  userId: 'user-1',
  name: 'Comida',
  icon: 'ShoppingCart',
  color: '#3B82F6',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetch categories', () => {
    it('returns categories on successful fetch', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue([mockCategory]);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitFor(() => {
        expect(result.current.categories.isSuccess).toBe(true);
      });

      expect(result.current.categories.data).toEqual([mockCategory]);
    });
  });

  describe('createCategory', () => {
    it('shows success toast and invalidates queries on create', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue([mockCategory]);
      vi.mocked(categoriesService.createCategory).mockResolvedValue(mockCategory);

      const { wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitFor(() => expect(result.current.categories.isSuccess).toBe(true));

      await act(async () => {
        result.current.createCategory.mutate({
          name: 'New Category',
          icon: 'ShoppingCart',
          color: '#3B82F6',
        });
      });

      await waitFor(() => {
        expect(result.current.createCategory.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['categories'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  describe('updateCategory', () => {
    it('shows success toast and invalidates queries on update', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue([mockCategory]);
      vi.mocked(categoriesService.updateCategory).mockResolvedValue({
        ...mockCategory,
        name: 'Updated Name',
      });

      const { wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitFor(() => expect(result.current.categories.isSuccess).toBe(true));

      await act(async () => {
        result.current.updateCategory.mutate({ id: 'category-1', data: { name: 'Updated Name' } });
      });

      await waitFor(() => {
        expect(result.current.updateCategory.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['categories'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  describe('deleteCategory', () => {
    it('shows success toast and invalidates queries on delete', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue([mockCategory]);
      vi.mocked(categoriesService.deleteCategory).mockResolvedValue(undefined);

      const { wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitFor(() => expect(result.current.categories.isSuccess).toBe(true));

      await act(async () => {
        result.current.deleteCategory.mutate('category-1');
      });

      await waitFor(() => {
        expect(result.current.deleteCategory.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['categories'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });

    it('shows warning toast on 409 delete error', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue([mockCategory]);
      vi.mocked(categoriesService.deleteCategory).mockRejectedValue(
        new Error('Category has transactions'),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitFor(() => expect(result.current.categories.isSuccess).toBe(true));

      await act(async () => {
        result.current.deleteCategory.mutate('category-1');
      });

      await waitFor(() => {
        expect(result.current.deleteCategory.isError).toBe(true);
      });

      expect(toast.warning).toHaveBeenCalled();
    });
  });
});
