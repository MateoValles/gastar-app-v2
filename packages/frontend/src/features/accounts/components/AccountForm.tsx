import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  ACCOUNT_TYPES,
  CURRENCIES,
  createAccountSchema,
  updateAccountSchema,
} from '@gastar/shared';
import type { CreateAccountInput, UpdateAccountInput, AccountResponse } from '@gastar/shared';
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

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountResponse | null;
  onSubmit: (data: CreateAccountInput | UpdateAccountInput) => void;
  isLoading?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AccountForm({
  open,
  onOpenChange,
  account,
  onSubmit,
  isLoading = false,
}: AccountFormProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isEdit = !!account;

  const schema = isEdit ? updateAccountSchema : createAccountSchema;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateAccountInput | UpdateAccountInput>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { name: account.name, type: account.type }
      : { name: '', type: 'checking', currency: 'ARS', initialBalance: '0' },
  });

  // Pre-fill on edit
  useEffect(() => {
    if (open) {
      if (isEdit) {
        reset({ name: account.name, type: account.type });
      } else {
        reset({ name: '', type: 'checking', currency: 'ARS', initialBalance: '0' });
      }
    }
  }, [open, isEdit, account, reset]);

  const selectedType = watch('type');
  const selectedCurrency = !isEdit
    ? watch('currency' as keyof (CreateAccountInput | UpdateAccountInput))
    : undefined;

  function handleFormSubmit(data: CreateAccountInput | UpdateAccountInput) {
    onSubmit(data);
  }

  const title = isEdit ? t('accounts.editAccount') : t('accounts.newAccount');

  const formContent = (
    <form
      id="account-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-4"
    >
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-name">{t('accounts.accountName')}</Label>
        <Input
          id="account-name"
          placeholder={t('accounts.namePlaceholder')}
          disabled={isLoading}
          {...register('name')}
        />
        {errors.name && <span className="text-xs text-destructive">{t('common.required')}</span>}
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-type">{t('accounts.accountType')}</Label>
        <Select
          value={selectedType as string}
          onValueChange={(value) => setValue('type', value as CreateAccountInput['type'])}
          disabled={isLoading}
        >
          <SelectTrigger id="account-type" className="w-full">
            <SelectValue placeholder={t('common.select')} />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`accounts.types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <span className="text-xs text-destructive">{t('common.required')}</span>}
      </div>

      {/* Currency — only on create */}
      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-currency">{t('common.currency')}</Label>
          <Select
            value={selectedCurrency as string}
            onValueChange={(value) =>
              setValue(
                'currency' as keyof (CreateAccountInput | UpdateAccountInput),
                value as CreateAccountInput['currency'],
              )
            }
            disabled={isLoading}
          >
            <SelectTrigger id="account-currency" className="w-full">
              <SelectValue placeholder={t('common.select')} />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {t(`accounts.currencies.${currency}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(errors as Record<string, { message?: string }>).currency && (
            <span className="text-xs text-destructive">{t('common.required')}</span>
          )}
        </div>
      )}

      {/* Initial balance — only on create */}
      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-initial-balance">{t('accounts.initialBalance')}</Label>
          <Input
            id="account-initial-balance"
            type="text"
            inputMode="decimal"
            placeholder="0"
            disabled={isLoading}
            {...register('initialBalance' as keyof (CreateAccountInput | UpdateAccountInput))}
          />
          {(errors as Record<string, { message?: string }>).initialBalance && (
            <span className="text-xs text-destructive">{t('common.required')}</span>
          )}
        </div>
      )}
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
      <Button type="submit" form="account-form" disabled={isLoading}>
        {isLoading ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
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
        <div className="px-4">{formContent}</div>
        <SheetFooter>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
