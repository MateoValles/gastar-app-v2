import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.js';

interface AccountsEmptyStateProps {
  onCreateAccount: () => void;
}

export function AccountsEmptyState({ onCreateAccount }: AccountsEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Wallet className="size-12 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t('accounts.noAccounts')}</h3>
        <p className="text-sm text-muted-foreground">{t('accounts.noAccountsDescription')}</p>
      </div>
      <Button onClick={onCreateAccount}>{t('accounts.newAccount')}</Button>
    </div>
  );
}
