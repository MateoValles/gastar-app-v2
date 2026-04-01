import { useTranslation } from 'react-i18next';
import { useDashboard } from '../hooks/use-dashboard.js';
import { CurrencyGroupCard } from '../components/CurrencyGroupCard.js';
import { ExpensesByCategory } from '../components/ExpensesByCategory.js';
import { RecentTransactionsList } from '../components/RecentTransactionsList.js';
import { DashboardEmptyState } from '../components/DashboardEmptyState.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { ApiError } from '@/lib/api-error.js';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { summary, isLoading, error } = useDashboard();

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72" />
        <Skeleton className="mt-6 h-48" />
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────────

  if (error) {
    const errorCode = error instanceof ApiError ? error.code : 'GENERIC';
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-destructive">{t(`errors.${errorCode}`)}</p>
      </div>
    );
  }

  // ─── Empty state (no accounts) ───────────────────────────────────────────────

  if (!summary || summary.accounts.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold">{t('dashboard.title')}</h1>
        <DashboardEmptyState />
      </div>
    );
  }

  // ─── Group expenses by currency for the chart (show first currency group) ────

  const firstGroup = summary.currencyGroups[0];
  const expensesForChart = firstGroup
    ? summary.expensesByCategory.filter((e) => e.currency === firstGroup.currency)
    : summary.expensesByCategory;

  return (
    <div className="p-4 pb-24 md:p-6">
      {/* Title */}
      <h1 className="mb-6 text-2xl font-bold">{t('dashboard.title')}</h1>

      {/* Currency group cards */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold">{t('dashboard.balancesByCurrency')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summary.currencyGroups.map((group) => (
            <CurrencyGroupCard key={group.currency} group={group} />
          ))}
        </div>
      </section>

      {/* Expenses by category chart */}
      {firstGroup && (
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.expensesByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpensesByCategory expenses={expensesForChart} currency={firstGroup.currency} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recent transactions */}
      <section>
        <Card>
          <CardContent className="pt-4">
            <RecentTransactionsList
              transactions={summary.recentTransactions}
              locale={i18n.language}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
