import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-error.js';
import * as categoriesService from '../services/categories.service.js';
import type { UpdateCategoryInput } from '@gastar/shared';

export function useCategories() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getCategories,
  });

  const createCategory = useMutation({
    mutationFn: categoriesService.createCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.created', { entity: t('common.category') }));
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      categoriesService.updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.updated', { entity: t('common.category') }));
    },
  });

  const deleteCategory = useMutation({
    mutationFn: categoriesService.deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.deleted', { entity: t('common.category') }));
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        const match = /(\d+)/.exec(error.message);
        const count = match ? Number(match[1]) : 0;
        toast.warning(t('toast.category.hasTransactions', { count }));
      } else {
        toast.error(t('errors.generic'));
      }
    },
  });

  return { categories, createCategory, updateCategory, deleteCategory };
}
