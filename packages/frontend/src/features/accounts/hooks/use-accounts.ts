import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as accountsService from '../services/accounts.service.js';
import type { UpdateAccountInput } from '@gastar/shared';

export function useAccounts() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const accounts = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsService.getAccounts,
  });

  const createAccount = useMutation({
    mutationFn: accountsService.createAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.created', { entity: t('common.account') }));
    },
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountInput }) =>
      accountsService.updateAccount(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.updated', { entity: t('common.account') }));
    },
  });

  const deleteAccount = useMutation({
    mutationFn: accountsService.deleteAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('toast.deleted', { entity: t('common.account') }));
    },
    onError: () => {
      toast.warning(t('toast.account.deleteWarning'));
    },
  });

  return { accounts, createAccount, updateAccount, deleteAccount };
}
