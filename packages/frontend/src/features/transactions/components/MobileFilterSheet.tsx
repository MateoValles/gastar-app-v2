import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { AccountResponse, CategoryResponse } from '@gastar/shared';
import { useFiltersStore } from '@/stores/filters.store.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Label } from '@/components/ui/label.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.js';
import { Calendar } from '@/components/ui/calendar.js';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet.js';

// ─── Props ──────────────────────────────────────────────────────────────────

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MobileFilterSheet({
  open,
  onOpenChange,
  accounts,
  categories,
}: MobileFilterSheetProps) {
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

  // Local date picker open states
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  function handleApply() {
    onOpenChange(false);
  }

  function handleClear() {
    clearFilters();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {t('transactions.filters.title')}
            {count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-4">
          {/* Account filter */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('transactions.filters.account')}</Label>
            <Select
              value={accountId ?? '_all'}
              onValueChange={(val) =>
                setFilter('accountId', val === '_all' ? undefined : (val ?? undefined))
              }
            >
              <SelectTrigger className="w-full">
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
          </div>

          {/* Category filter */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('transactions.filters.category')}</Label>
            <Select
              value={categoryId ?? '_all'}
              onValueChange={(val) =>
                setFilter('categoryId', val === '_all' ? undefined : (val ?? undefined))
              }
            >
              <SelectTrigger className="w-full">
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
          </div>

          {/* Type filter */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('transactions.filters.type')}</Label>
            <Select
              value={type ?? '_all'}
              onValueChange={(val) =>
                setFilter(
                  'type',
                  val === '_all' ? undefined : (val as 'income' | 'expense' | 'transfer'),
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('transactions.filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">{t('transactions.filters.allTypes')}</SelectItem>
                <SelectItem value="income">{t('transactions.types.income')}</SelectItem>
                <SelectItem value="expense">{t('transactions.types.expense')}</SelectItem>
                <SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('transactions.filters.dateFrom')}</Label>
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger
                render={<Button variant="outline" className="w-full justify-start font-normal" />}
              >
                {dateFrom ? (
                  format(new Date(`${dateFrom}T00:00:00`), 'dd/MM/yyyy')
                ) : (
                  <span className="text-muted-foreground">
                    {t('transactions.filters.dateFrom')}
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined}
                  onSelect={(d) => {
                    setFilter('dateFrom', d ? format(d, 'yyyy-MM-dd') : undefined);
                    setDateFromOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('transactions.filters.dateTo')}</Label>
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger
                render={<Button variant="outline" className="w-full justify-start font-normal" />}
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
                  onSelect={(d) => {
                    setFilter('dateTo', d ? format(d, 'yyyy-MM-dd') : undefined);
                    setDateToOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-2 px-4 pb-4">
          <Button variant="outline" className="flex-1" onClick={handleClear}>
            {t('common.clearFilters')}
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            {t('common.apply')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
