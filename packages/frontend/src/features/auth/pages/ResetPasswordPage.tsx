import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NavLink, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { ApiError } from '@/lib/api-error.js';
import { useAuth } from '../hooks/use-auth.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.js';

// Extend with client-side confirmPassword validation
const resetPasswordFormSchema = z
  .object({
    newPassword: z.string().min(8).max(72),
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'passwordMismatch',
      });
    }
  });

type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  const onSubmit = (data: ResetPasswordFormInput) => {
    resetPassword.mutate({ token, password: data.newPassword });
  };

  const apiError = resetPassword.error as ApiError | null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
            <CardDescription>{t('auth.resetPasswordSubtitle')}</CardDescription>
          </CardHeader>

          <CardContent>
            <form id="reset-password-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-4">
                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.passwordPlaceholder')}
                    aria-invalid={!!errors.newPassword}
                    {...register('newPassword')}
                  />
                  {errors.newPassword && (
                    <p className="text-destructive text-xs">{errors.newPassword.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.passwordPlaceholder')}
                    aria-invalid={!!errors.confirmPassword}
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-destructive text-xs">
                      {errors.confirmPassword.message === 'passwordMismatch'
                        ? t('auth.passwordMismatch')
                        : errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* General API error */}
                {apiError && (
                  <p className="text-destructive text-sm" role="alert">
                    {t(`errors.${apiError.code}`, { defaultValue: t('errors.generic') })}
                  </p>
                )}
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              form="reset-password-form"
              className="w-full"
              disabled={resetPassword.isPending}
            >
              {t('auth.resetPassword')}
            </Button>

            <NavLink to="/login" className="text-primary text-sm hover:underline">
              {t('auth.backToLogin')}
            </NavLink>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
