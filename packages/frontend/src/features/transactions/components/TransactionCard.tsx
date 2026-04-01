import { useTranslation } from 'react-i18next';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { TransactionResponse, AccountResponse, CategoryResponse } from '@gastar/shared';
import { formatDate, formatMoney } from '@/lib/utils.js';
import { Card } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';

// ─── Props ──────────────────────────────────────────────────────────────────

interface TransactionCardProps {
  transaction: TransactionResponse;
  onEdit: (tx: TransactionResponse) => void;
  onDelete: (tx: TransactionResponse) => void;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

// ─── Type color helper ──────────────────────────────────────────────────────

function getTypeColor(type: string): string {
  switch (type) {
    case 'income':
      return 'text-green-600';
    case 'expense':
      return 'text-red-600';
    case 'transfer':
      return 'text-blue-600';
    default:
      return 'text-foreground';
  }
}

function getTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'income':
      return 'default';
    case 'expense':
      return 'secondary';
    case 'transfer':
      return 'outline';
    default:
      return 'outline';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  accounts,
  categories,
}: TransactionCardProps) {
  const { t, i18n } = useTranslation();

  const accountsMap = new Map(accounts.map((a) => [a.id, a]));
  const categoriesMap = new Map(categories.map((c) => [c.id, c]));

  const account = accountsMap.get(transaction.accountId);
  const category = transaction.categoryId ? categoriesMap.get(transaction.categoryId) : null;
  const formattedAmount = account
    ? formatMoney(transaction.amount, account.currency, i18n.language)
    : transaction.amount;

  return (
    <Card className="flex items-center justify-between gap-3 px-4 py-3 hover:shadow-sm transition-shadow">
      {/* Left: date + description + category */}
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(transaction.date, i18n.language)}
          </span>
          <Badge
            variant={getTypeBadgeVariant(transaction.type)}
            className={getTypeColor(transaction.type)}
          >
            {t(`transactions.types.${transaction.type}`)}
          </Badge>
        </div>
        {transaction.description && (
          <span className="truncate text-sm font-medium">{transaction.description}</span>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {category && (
            <span className="flex items-center gap-1">
              {category.icon && <span>{category.icon}</span>}
              <span>{category.name}</span>
            </span>
          )}
          {category && account && <span>·</span>}
          {account && <span>{account.name}</span>}
        </div>
      </div>

      {/* Right: amount + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-sm font-semibold tabular-nums ${getTypeColor(transaction.type)}`}>
          {transaction.type === 'expense' ? `-${formattedAmount}` : formattedAmount}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={t('common.actions')} />}
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(transaction)}>
              <Pencil className="size-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(transaction)}>
              <Trash2 className="size-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
