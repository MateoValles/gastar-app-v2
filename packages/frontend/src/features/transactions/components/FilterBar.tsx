import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import type { AccountResponse, CategoryResponse } from '@gastar/shared';
import { useFiltersStore } from '@/stores/filters.store.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.js';
import { Calendar } from '@/components/ui/calendar.js';

// ─── Props ──────────────────────────────────────────────────────────────────

interface FilterBarProps {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FilterBar({ accounts, categories }: FilterBarProps) {
  const { t } = useTranslation();

  const accountId = useFiltersStore((s) => s.accountId);
  const categoryId = useFiltersStore((s) => s.categoryId);
  const type = useFiltersStore((s) => s.type);
  const dateFrom = useFiltersStore((s) => s.dateFrom);
  const dateTo = useFiltersStore((s) => s.dateTo);
  const setFilter = useFiltersStore((s) => s.setFilter);
  const clearFilters = useFiltersStore((s) => s.clearFilters);
  const activeFilterCount = useFiltersStore((s) => s.activeFilterCount);

  const count = activeFilterCount();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Account filter */}
      <Select
        value={accountId ?? ''}
        onValueChange={(val) =>
          setFilter('accountId', val === '_all' ? undefined : (val ?? undefined))
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t('transactions.filters.allAccounts')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t('transactions.filters.allAccounts')}</SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category filter */}
      <Select
        value={categoryId ?? ''}
        onValueChange={(val) =>
          setFilter('categoryId', val === '_all' ? undefined : (val ?? undefined))
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t('transactions.filters.allCategories')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t('transactions.filters.allCategories')}</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type filter */}
      <Select
        value={type ?? ''}
        onValueChange={(val) =>
          setFilter('type', val === '_all' ? undefined : (val as 'income' | 'expense' | 'transfer'))
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t('transactions.filters.allTypes')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t('transactions.filters.allTypes')}</SelectItem>
          <SelectItem value="income">{t('transactions.types.income')}</SelectItem>
          <SelectItem value="expense">{t('transactions.types.expense')}</SelectItem>
          <SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Date from */}
      <Popover>
        <PopoverTrigger
          render={<Button variant="outline" className="w-40 justify-start font-normal" />}
        >
          {dateFrom ? (
            format(new Date(`${dateFrom}T00:00:00`), 'dd/MM/yyyy')
          ) : (
            <span className="text-muted-foreground">{t('transactions.filters.dateFrom')}</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined}
            onSelect={(d) => setFilter('dateFrom', d ? format(d, 'yyyy-MM-dd') : undefined)}
          />
        </PopoverContent>
      </Popover>

      {/* Date to */}
      <Popover>
        <PopoverTrigger
          render={<Button variant="outline" className="w-40 justify-start font-normal" />}
        >
          {dateTo ? (
            format(new Date(`${dateTo}T00:00:00`), 'dd/MM/yyyy')
          ) : (
            <span className="text-muted-foreground">{t('transactions.filters.dateTo')}</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={dateTo ? new Date(`${dateTo}T00:00:00`) : undefined}
            onSelect={(d) => setFilter('dateTo', d ? format(d, 'yyyy-MM-dd') : undefined)}
          />
        </PopoverContent>
      </Popover>

      {/* Clear button */}
      {count > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
          <X className="size-4" />
          {t('common.clearFilters')}
          <Badge variant="secondary" className="ml-1">
            {count}
          </Badge>
        </Button>
      )}

      {/* Active filter count indicator when no clear button */}
      {count > 0 && (
        <span className="text-xs text-muted-foreground">
          {t('transactions.filters.activeFilters', { count })}
        </span>
      )}
    </div>
  );
}

// ─── Filter icon button for mobile ───────────────────────────────────────────

interface FilterIconButtonProps {
  onClick: () => void;
}

export function FilterIconButton({ onClick }: FilterIconButtonProps) {
  const { t } = useTranslation();
  const activeFilterCount = useFiltersStore((s) => s.activeFilterCount);
  const count = activeFilterCount();

  return (
    <Button variant="outline" size="sm" onClick={onClick} className="relative gap-1.5">
      <Filter className="size-4" />
      {t('common.filters')}
      {count > 0 && (
        <Badge variant="destructive" className="ml-1 size-5 justify-center p-0 text-xs">
          {count}
        </Badge>
      )}
    </Button>
  );
}
