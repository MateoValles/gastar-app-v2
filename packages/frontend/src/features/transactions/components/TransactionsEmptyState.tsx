import { ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.js';

// ─── Props ──────────────────────────────────────────────────────────────────

interface TransactionsEmptyStateProps {
  onCreateTransaction: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TransactionsEmptyState({ onCreateTransaction }: TransactionsEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <ReceiptText className="size-12 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t('transactions.noTransactions')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('transactions.noTransactionsDescription')}
        </p>
      </div>
      <Button onClick={onCreateTransaction}>{t('transactions.newTransaction')}</Button>
    </div>
  );
}
