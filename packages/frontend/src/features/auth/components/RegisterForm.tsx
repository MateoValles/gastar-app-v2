import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { registerSchema } from '@gastar/shared';
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

// Extend registerSchema with client-side confirmPassword validation
const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'passwordMismatch',
      });
    }
  });

type RegisterFormInput = z.infer<typeof registerFormSchema>;

interface RegisterFormProps {
  onSubmit: (data: { name: string; email: string; password: string }) => void;
  isLoading: boolean;
  error?: ApiError | null;
}

export function RegisterForm({ onSubmit, isLoading, error }: RegisterFormProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
  });

  const handleFormSubmit = (data: RegisterFormInput) => {
    onSubmit({ name: data.name, email: data.email, password: data.password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.registerTitle')}</CardTitle>
            <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
          </CardHeader>

          <CardContent>
            <form id="register-form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
              <div className="flex flex-col gap-4">
                {/* Full name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">{t('auth.fullName')}</Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder={t('auth.namePlaceholder')}
                    aria-invalid={!!errors.name}
                    {...register('name')}
                  />
                  {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                </div>

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
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.passwordPlaceholder')}
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-destructive text-xs">{errors.password.message}</p>
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
                {error && (
                  <p className="text-destructive text-sm" role="alert">
                    {t(`errors.${error.code}`, { defaultValue: t('errors.generic') })}
                  </p>
                )}
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" form="register-form" className="w-full" disabled={isLoading}>
              {t('auth.register')}
            </Button>

            <p className="text-muted-foreground text-sm">
              {t('auth.alreadyHaveAccount')}{' '}
              <NavLink to="/login" className="text-primary hover:underline">
                {t('auth.loginHere')}
              </NavLink>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
