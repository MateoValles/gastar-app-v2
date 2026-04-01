import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { formatMoney } from '@/lib/utils.js';
import type { CurrencyGroupSummary } from '@gastar/shared';

// ─── Currency badge colors ─────────────────────────────────────────────────────

const CURRENCY_BADGE_COLORS: Record<string, string> = {
  ARS: '#3B82F6',
  USD: '#16A34A',
  EUR: '#8B5CF6',
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CurrencyGroupCardProps {
  group: CurrencyGroupSummary;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CurrencyGroupCard({ group }: CurrencyGroupCardProps) {
  const { t, i18n } = useTranslation();

  const badgeColor = CURRENCY_BADGE_COLORS[group.currency] ?? '#94A3B8';
  const netValue = parseFloat(group.monthlyNet);
  const isPositiveNet = netValue >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{group.currency}</CardTitle>
          <Badge style={{ backgroundColor: badgeColor, color: '#fff', borderColor: 'transparent' }}>
            {group.currency}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('dashboard.accountCount', { count: group.accountCount })}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Total balance */}
        <span className="text-2xl font-bold tabular-nums">
          {formatMoney(group.totalBalance, group.currency, i18n.language)}
        </span>

        {/* Monthly stats */}
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('dashboard.monthlyIncome')}</span>
            <span className="font-medium text-green-600 dark:text-green-400 tabular-nums">
              {formatMoney(group.monthlyIncome, group.currency, i18n.language)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('dashboard.monthlyExpenses')}</span>
            <span className="font-medium text-red-600 dark:text-red-400 tabular-nums">
              {formatMoney(group.monthlyExpenses, group.currency, i18n.language)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('dashboard.monthlyNet')}</span>
            <span
              className={`font-medium tabular-nums ${isPositiveNet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {formatMoney(group.monthlyNet, group.currency, i18n.language)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
