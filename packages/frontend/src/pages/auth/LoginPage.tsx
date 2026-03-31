import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1>{t('auth.login')}</h1>
    </div>
  );
}
