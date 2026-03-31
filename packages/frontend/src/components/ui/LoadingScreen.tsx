import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/Spinner';

export function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Spinner size="lg" className="text-primary" />
      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    </div>
  );
}
