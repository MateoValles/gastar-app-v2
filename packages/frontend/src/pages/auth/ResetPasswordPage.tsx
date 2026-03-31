import { useTranslation } from 'react-i18next';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1>{t('auth.resetPassword')}</h1>
    </div>
  );
}
