import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { buttonVariants } from '@/components/ui/button.js';
import { formatRelativeDate, formatMoney, cn } from '@/lib/utils.js';
import type { RecentTransactionItem } from '@gastar/shared';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface RecentTransactionsListProps {
  transactions: RecentTransactionItem[];
  locale: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getAmountColor(type: RecentTransactionItem['type']): string {
  switch (type) {
    case 'income':
      return 'text-green-600 dark:text-green-400';
    case 'expense':
      return 'text-red-600 dark:text-red-400';
    case 'transfer':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-foreground';
  }
}

function getAmountPrefix(item: RecentTransactionItem): string {
  if (item.type === 'expense') return '-';
  if (item.type === 'transfer' && item.transferSide === 'out') return '-';
  return '+';
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RecentTransactionsList({ transactions, locale }: RecentTransactionsListProps) {
  const { t } = useTranslation();

  const items = transactions.slice(0, 10);

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t('dashboard.recentTransactions')}</h2>
        <NavLink
          to="/transactions"
          className={cn(buttonVariants({ variant: 'link' }), 'h-auto p-0 text-sm')}
        >
          {t('dashboard.viewAll')}
        </NavLink>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-border">
        {items.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between gap-4 py-3">
            {/* Left side: date + description */}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {tx.description ?? tx.categoryName ?? t('dashboard.recentTransactions')}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatRelativeDate(tx.date, locale)}</span>
                {tx.categoryName && (
                  <>
                    <span>·</span>
                    <span className="truncate">{tx.categoryName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right side: amount */}
            <span
              className={cn('shrink-0 text-sm font-medium tabular-nums', getAmountColor(tx.type))}
            >
              {getAmountPrefix(tx)}
              {formatMoney(tx.amount, tx.currency, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
