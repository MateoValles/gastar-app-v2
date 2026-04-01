import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { UserProfile } from '@gastar/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { formatDate } from '@/lib/utils.js';

// ─── Local schema (name-only subset of updateUserSchema) ──────────────────────

const nameFormSchema = z.object({
  name: z.string().min(1).max(100),
});

// ─── Types ─────────────────────────────────────────────────────────────────────

type NameFormValues = z.infer<typeof nameFormSchema>;

interface PersonalInfoSectionProps {
  user: UserProfile;
  locale: string;
  onUpdateName: (name: string) => void;
  isUpdating: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PersonalInfoSection({
  user,
  locale,
  onUpdateName,
  isUpdating,
}: PersonalInfoSectionProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameFormValues>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: user.name },
  });

  function handleEditClick() {
    reset({ name: user.name });
    setIsEditing(true);
  }

  function handleCancel() {
    reset({ name: user.name });
    setIsEditing(false);
  }

  function handleFormSubmit(data: NameFormValues) {
    onUpdateName(data.name);
    setIsEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.personalInfo')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('profile.name')}</Label>
          {isEditing ? (
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-2">
              <Input
                placeholder={t('profile.namePlaceholder')}
                disabled={isUpdating}
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <span className="text-xs text-destructive">{t('common.required')}</span>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isUpdating}>
                  {t('profile.saveChanges')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm">{user.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleEditClick}>
                {t('common.edit')}
              </Button>
            </div>
          )}
        </div>

        {/* Email (read-only) */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('profile.email')}</Label>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>

        {/* Member since */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('profile.memberSince')}</Label>
          <span className="text-sm text-muted-foreground">
            {formatDate(user.createdAt, locale)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
