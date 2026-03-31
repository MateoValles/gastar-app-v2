import { useTranslation } from 'react-i18next';

export default function AccountsPage() {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
    </div>
  );
}
