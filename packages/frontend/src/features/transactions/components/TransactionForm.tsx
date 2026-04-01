import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { z } from 'zod';
import type { AccountResponse, CategoryResponse, TransactionResponse } from '@gastar/shared';
import { useMediaQuery } from '@/hooks/use-media-query.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.js';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.js';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.js';
import { Calendar } from '@/components/ui/calendar.js';
import { cn } from '@/lib/utils.js';

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionMode = 'income' | 'expense' | 'transfer';

// Zod validation issue codes — NOT rendered in UI; JSX uses t() for display
const VALIDATION_REQUIRED = 'validation.required';
const VALIDATION_SAME_ACCOUNT = 'validation.same_account';

// Single unified schema with conditional validation via superRefine
const unifiedSchema = z
  .object({
    mode: z.enum(['income', 'expense', 'transfer']),
    // Income/expense fields
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    amount: z.string().optional(),
    // Transfer fields
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    fromAmount: z.string().optional(),
    toAmount: z.string().optional(),
    exchangeRate: z.string().optional(),
    // Common
    description: z.string().max(500).optional(),
    date: z.string(),
  })
  .superRefine((data, ctx) => {
    const required = (path: string[]) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: VALIDATION_REQUIRED });

    if (data.mode === 'income' || data.mode === 'expense') {
      if (!data.accountId) required(['accountId']);
      if (!data.categoryId) required(['categoryId']);
      if (!data.amount) required(['amount']);
    }

    if (data.mode === 'transfer') {
      if (!data.fromAccountId) required(['fromAccountId']);
      if (!data.toAccountId) required(['toAccountId']);
      if (!data.fromAmount) required(['fromAmount']);
      if (!data.toAmount) required(['toAmount']);
      if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: VALIDATION_SAME_ACCOUNT,
        });
      }
    }
  });

type UnifiedFormValues = z.infer<typeof unifiedSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TransactionFormSubmitData {
  mode: TransactionMode;
  accountId?: string;
  categoryId?: string;
  amount?: string;
  fromAccountId?: string;
  toAccountId?: string;
  fromAmount?: string;
  toAmount?: string;
  exchangeRate?: string;
  description?: string;
  date: string;
}

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionResponse | null;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onSubmit: (data: TransactionFormSubmitData) => void;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function getDefaultMode(transaction: TransactionResponse | null | undefined): TransactionMode {
  if (!transaction) return 'expense';
  if (transaction.type === 'transfer') return 'transfer';
  return transaction.type as TransactionMode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  accounts,
  categories,
  onSubmit,
  isLoading = false,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isEdit = !!transaction;

  const [mode, setMode] = useState<TransactionMode>(() => getDefaultMode(transaction));

  const isTransfer = mode === 'transfer';

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<UnifiedFormValues>({
    resolver: zodResolver(unifiedSchema),
    defaultValues: buildDefaultValues(transaction, mode),
  });

  // Watch selected accounts for cross-currency detection
  const fromAccountId = watch('fromAccountId');
  const toAccountId = watch('toAccountId');
  const watchedExchangeRate = watch('exchangeRate');

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const isCrossCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  // Reset form when open changes or transaction changes
  useEffect(() => {
    if (open) {
      const newMode = getDefaultMode(transaction);
      setMode(newMode);
      reset(buildDefaultValues(transaction, newMode));
    }
  }, [open, transaction, reset]);

  // Reset form when mode changes (only for create)
  function handleModeChange(newMode: TransactionMode) {
    setMode(newMode);
    if (!isEdit) {
      reset({ mode: newMode, date: getTodayDate() });
    }
  }

  function handleFormSubmit(data: UnifiedFormValues) {
    onSubmit(data as TransactionFormSubmitData);
  }

  const title = isEdit ? t('transactions.editTransaction') : t('transactions.newTransaction');

  // Mode selector (only for create)
  const modeSelector = !isEdit && (
    <div className="flex flex-col gap-1.5">
      <Label>{t('transactions.fields.type')}</Label>
      <RadioGroup
        value={mode}
        onValueChange={(val) => handleModeChange(val as TransactionMode)}
        className="flex flex-row gap-4"
      >
        {(['income', 'expense', 'transfer'] as const).map((m) => (
          <label key={m} className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value={m} disabled={isLoading} />
            <span className="text-sm">{t(`transactions.types.${m}`)}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );

  // Date picker field
  const dateField = (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="tx-date">{t('transactions.fields.date')}</Label>
      <Controller
        name="date"
        control={control}
        render={({ field }) => {
          const dateValue = field.value;
          const parsedDate = dateValue ? new Date(`${dateValue}T00:00:00`) : undefined;
          return (
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    id="tx-date"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateValue && 'text-muted-foreground',
                    )}
                    disabled={isLoading}
                    aria-invalid={!!errors.date}
                  />
                }
              >
                <CalendarIcon className="mr-2 size-4" />
                {dateValue ?? <span>{t('common.date')}</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parsedDate}
                  onSelect={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
                  defaultMonth={parsedDate}
                />
              </PopoverContent>
            </Popover>
          );
        }}
      />
      {errors.date && <span className="text-xs text-destructive">{t('common.required')}</span>}
    </div>
  );

  const incomeExpenseContent = !isTransfer && (
    <>
      {/* Account */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-account">{t('transactions.fields.account')}</Label>
        <Controller
          name="accountId"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={isLoading}>
              <SelectTrigger id="tx-account" className="w-full" aria-invalid={!!errors.accountId}>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.accountId && (
          <span className="text-xs text-destructive">{t('common.required')}</span>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-category">{t('transactions.fields.category')}</Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={isLoading}>
              <SelectTrigger id="tx-category" className="w-full" aria-invalid={!!errors.categoryId}>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <span className="text-xs text-destructive">{t('common.required')}</span>
        )}
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-amount">{t('transactions.fields.amount')}</Label>
        <Input
          id="tx-amount"
          type="text"
          inputMode="decimal"
          placeholder={t('common.amountPlaceholder')}
          disabled={isLoading}
          aria-invalid={!!errors.amount}
          {...register('amount')}
        />
        {errors.amount && <span className="text-xs text-destructive">{t('common.required')}</span>}
      </div>
    </>
  );

  const transferContent = isTransfer && (
    <>
      {/* From Account */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-from-account">{t('transactions.transfer.from')}</Label>
        <Controller
          name="fromAccountId"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={isLoading}>
              <SelectTrigger
                id="tx-from-account"
                className="w-full"
                aria-invalid={!!errors.fromAccountId}
              >
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.fromAccountId && (
          <span className="text-xs text-destructive">{t('common.required')}</span>
        )}
      </div>

      {/* From Amount */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-from-amount">{t('transactions.fields.amount')}</Label>
        <Input
          id="tx-from-amount"
          type="text"
          inputMode="decimal"
          placeholder={t('common.amountPlaceholder')}
          disabled={isLoading}
          aria-invalid={!!errors.fromAmount}
          {...register('fromAmount')}
        />
        {errors.fromAmount && (
          <span className="text-xs text-destructive">{t('common.required')}</span>
        )}
      </div>

      {/* To Account */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-to-account">{t('transactions.transfer.to')}</Label>
        <Controller
          name="toAccountId"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={isLoading}>
              <SelectTrigger
                id="tx-to-account"
                className="w-full"
                aria-invalid={!!errors.toAccountId}
              >
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.toAccountId && (
          <span className="text-xs text-destructive">{t('common.required')}</span>
        )}
      </div>

      {/* To Amount (always shown for transfers, required to correctly credit destination) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-to-amount">{t('transactions.fields.destinationAmount')}</Label>
        <Input
          id="tx-to-amount"
          type="text"
          inputMode="decimal"
          placeholder={t('common.amountPlaceholder')}
          disabled={isLoading}
          aria-invalid={!!errors.toAmount}
          {...register('toAmount')}
        />
        {errors.toAmount && (
          <span className="text-xs text-destructive">{t('common.required')}</span>
        )}
      </div>

      {/* Exchange rate — only for cross-currency */}
      {isCrossCurrency && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-exchange-rate">{t('transactions.fields.exchangeRate')}</Label>
          <Input
            id="tx-exchange-rate"
            type="text"
            inputMode="decimal"
            placeholder={t('transactions.transfer.exchangeRatePlaceholder')}
            disabled={isLoading}
            aria-invalid={!!errors.exchangeRate}
            {...register('exchangeRate')}
          />
          {fromAccount && toAccount && watchedExchangeRate && (
            <span className="text-xs text-muted-foreground">
              {t('transactions.transfer.exchangeRateHelp', {
                from: fromAccount.currency,
                rate: watchedExchangeRate,
                to: toAccount.currency,
              })}
            </span>
          )}
          {errors.exchangeRate && (
            <span className="text-xs text-destructive">{t('common.required')}</span>
          )}
        </div>
      )}
    </>
  );

  const commonFields = (
    <>
      {/* Date */}
      {dateField}

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-description">
          {t('transactions.fields.description')}{' '}
          <span className="text-xs text-muted-foreground">({t('common.optional')})</span>
        </Label>
        <Input
          id="tx-description"
          placeholder={t('transactions.fields.description')}
          disabled={isLoading}
          {...register('description')}
        />
      </div>
    </>
  );

  const formContent = (
    <form
      id="transaction-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-4"
    >
      {modeSelector}
      {incomeExpenseContent}
      {transferContent}
      {commonFields}
    </form>
  );

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isLoading}
      >
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="transaction-form" disabled={isLoading}>
        {isLoading ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="px-4 overflow-y-auto max-h-[70vh]">{formContent}</div>
        <SheetFooter>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Default value builders ───────────────────────────────────────────────────

function buildDefaultValues(
  transaction: TransactionResponse | null | undefined,
  mode: TransactionMode,
): UnifiedFormValues {
  if (!transaction) {
    return { mode, date: getTodayDate() };
  }

  if (mode === 'transfer') {
    // Respect transferSide so from/to accounts and amounts are mapped correctly.
    // The "out" leg is the debit side (from), the "in" leg is the credit side (to).
    const isOutLeg = transaction.transferSide === 'out' || transaction.transferSide === null;

    return {
      mode: 'transfer',
      fromAccountId: isOutLeg ? transaction.accountId : (transaction.transferPeerAccountId ?? ''),
      toAccountId: isOutLeg ? (transaction.transferPeerAccountId ?? '') : transaction.accountId,
      fromAmount: transaction.amount,
      toAmount: transaction.amount,
      exchangeRate: transaction.exchangeRate ?? undefined,
      description: transaction.description ?? undefined,
      date: transaction.date,
    };
  }

  return {
    mode: transaction.type as 'income' | 'expense',
    accountId: transaction.accountId,
    categoryId: transaction.categoryId ?? '',
    amount: transaction.amount,
    description: transaction.description ?? undefined,
    date: transaction.date,
  };
}
