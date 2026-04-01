import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { InfiniteData } from '@tanstack/react-query';
import type { TransactionResponse, AccountResponse, CategoryResponse } from '@gastar/shared';
import { formatDate, formatMoney } from '@/lib/utils.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import type { TransactionPage } from '../services/transactions.service.js';

// ─── Props ──────────────────────────────────────────────────────────────────

interface TransactionTableProps {
  pages: InfiniteData<TransactionPage>;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
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

export function TransactionTable({
  pages,
  fetchNextPage,
  isFetchingNextPage,
  hasNextPage,
  onEdit,
  onDelete,
  accounts,
  categories,
}: TransactionTableProps) {
  const { t, i18n } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Flatten all pages into a single transaction array
  const transactions = pages.pages.flatMap((page) => page.data);

  // Build lookup maps for accounts and categories
  const accountsMap = new Map(accounts.map((a) => [a.id, a]));
  const categoriesMap = new Map(categories.map((c) => [c.id, c]));

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('transactions.table.date')}</TableHead>
            <TableHead>{t('transactions.table.description')}</TableHead>
            <TableHead>{t('transactions.table.account')}</TableHead>
            <TableHead>{t('transactions.table.category')}</TableHead>
            <TableHead>{t('common.type')}</TableHead>
            <TableHead className="text-right">{t('transactions.table.amount')}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const account = accountsMap.get(tx.accountId);
            const category = tx.categoryId ? categoriesMap.get(tx.categoryId) : null;
            const formattedAmount = account
              ? formatMoney(tx.amount, account.currency, i18n.language)
              : tx.amount;

            return (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(tx.date, i18n.language)}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {tx.description ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {account?.name ?? tx.accountId.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {category ? (
                    <span className="flex items-center gap-1.5">
                      {category.icon && <span className="text-xs">{category.icon}</span>}
                      {category.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(tx.type)} className={getTypeColor(tx.type)}>
                    {t(`transactions.types.${tx.type}`)}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${getTypeColor(tx.type)}`}>
                  {tx.type === 'expense' ? `-${formattedAmount}` : formattedAmount}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label={t('common.actions')} />
                      }
                    >
                      <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(tx)}>
                        <Pencil className="size-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(tx)}>
                        <Trash2 className="size-4" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-2 text-center">
        {isFetchingNextPage && (
          <div className="flex justify-center gap-2 px-4 py-2">
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {!hasNextPage && transactions.length > 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            {t('transactions.noMoreTransactions')}
          </p>
        )}
      </div>
    </div>
  );
}
