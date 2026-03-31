import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { forgotPasswordSchema } from '@gastar/shared';
import type { ForgotPasswordInput } from '@gastar/shared';
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

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPassword.mutate(data);
  };

  const apiError = forgotPassword.error as ApiError | null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
            <CardDescription>{t('auth.forgotPasswordSubtitle')}</CardDescription>
          </CardHeader>

          <CardContent>
            <form id="forgot-password-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs">{t('auth.invalidEmail')}</p>
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
              form="forgot-password-form"
              className="w-full"
              disabled={forgotPassword.isPending}
            >
              {t('auth.sendResetLink')}
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
