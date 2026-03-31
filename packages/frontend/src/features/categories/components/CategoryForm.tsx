import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { createCategorySchema, updateCategorySchema } from '@gastar/shared';
import type { CreateCategoryInput, UpdateCategoryInput, CategoryResponse } from '@gastar/shared';
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
import { IconPicker } from './IconPicker.js';
import { ColorPicker } from './ColorPicker.js';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryResponse | null;
  onSubmit: (data: CreateCategoryInput | UpdateCategoryInput) => void;
  isLoading?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CategoryForm({
  open,
  onOpenChange,
  category,
  onSubmit,
  isLoading = false,
}: CategoryFormProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isEdit = !!category;

  const schema = isEdit ? updateCategorySchema : createCategorySchema;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateCategoryInput | UpdateCategoryInput>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: category.name,
          icon: category.icon ?? undefined,
          color: category.color ?? undefined,
        }
      : { name: '', icon: undefined, color: undefined },
  });

  // Pre-fill on edit / reset on create
  useEffect(() => {
    if (open) {
      if (isEdit) {
        reset({
          name: category.name,
          icon: category.icon ?? undefined,
          color: category.color ?? undefined,
        });
      } else {
        reset({ name: '', icon: undefined, color: undefined });
      }
    }
  }, [open, isEdit, category, reset]);

  function handleFormSubmit(data: CreateCategoryInput | UpdateCategoryInput) {
    onSubmit(data);
  }

  const title = isEdit ? t('categories.editCategory') : t('categories.newCategory');

  const formContent = (
    <form
      id="category-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-4"
    >
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-name">{t('categories.categoryName')}</Label>
        <Input
          id="category-name"
          placeholder={t('categories.namePlaceholder')}
          disabled={isLoading}
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && <span className="text-xs text-destructive">{t('common.required')}</span>}
      </div>

      {/* Icon */}
      <div className="flex flex-col gap-1.5">
        <Label>{t('categories.categoryIcon')}</Label>
        <Controller
          name="icon"
          control={control}
          render={({ field }) => (
            <IconPicker
              value={field.value as string | undefined}
              onChange={field.onChange}
              disabled={isLoading}
            />
          )}
        />
      </div>

      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <Label>{t('categories.categoryColor')}</Label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <ColorPicker
              value={field.value as string | undefined}
              onChange={field.onChange}
              disabled={isLoading}
            />
          )}
        />
      </div>
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
      <Button type="submit" form="category-form" disabled={isLoading}>
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
