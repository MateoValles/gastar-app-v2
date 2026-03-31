import { useTranslation } from 'react-i18next';

export default function TransactionsPage() {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('transactions.title')}</h1>
    </div>
  );
}
