import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import i18n from '@/lib/i18n.js';
import * as usersService from '../services/users.service.js';
import type { UpdateUserInput } from '@gastar/shared';

export function useUser() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const user = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersService.getMe,
  });

  const updateProfile = useMutation({
    mutationFn: (data: UpdateUserInput) => usersService.updateMe(data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      if (data.language) {
        void i18n.changeLanguage(data.language);
      }
      toast.success(t('toast.updated', { entity: t('common.profile') }));
    },
  });

  return {
    user: user.data,
    isLoading: user.isLoading,
    error: user.error,
    updateProfile,
  };
}
