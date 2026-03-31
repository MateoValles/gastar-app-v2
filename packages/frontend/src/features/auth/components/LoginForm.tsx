import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loginSchema } from '@gastar/shared';
import type { LoginInput } from '@gastar/shared';
import type { ApiError } from '@/lib/api-error.js';
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

interface LoginFormProps {
  onSubmit: (data: LoginInput) => void;
  isLoading: boolean;
  error?: ApiError | null;
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.loginTitle')}</CardTitle>
            <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
          </CardHeader>

          <CardContent>
            <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-4">
                {/* Email */}
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
                    <p className="text-destructive text-xs">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <NavLink to="/forgot-password" className="text-primary text-xs hover:underline">
                      {t('auth.forgotPassword')}
                    </NavLink>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={t('auth.passwordPlaceholder')}
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-destructive text-xs">{errors.password.message}</p>
                  )}
                </div>

                {/* General API error */}
                {error && (
                  <p className="text-destructive text-sm" role="alert">
                    {t(`errors.${error.code}`, { defaultValue: t('errors.generic') })}
                  </p>
                )}
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" form="login-form" className="w-full" disabled={isLoading}>
              {t('auth.login')}
            </Button>

            <p className="text-muted-foreground text-sm">
              {t('auth.dontHaveAccount')}{' '}
              <NavLink to="/register" className="text-primary hover:underline">
                {t('auth.registerHere')}
              </NavLink>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
