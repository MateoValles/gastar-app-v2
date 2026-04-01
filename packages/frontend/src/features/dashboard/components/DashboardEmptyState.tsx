import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { LayoutDashboard } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button.js';
import { cn } from '@/lib/utils.js';

// ─── Component ─────────────────────────────────────────────────────────────────

export function DashboardEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <LayoutDashboard className="size-12 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t('dashboard.noAccounts')}</h3>
        <p className="text-sm text-muted-foreground">{t('dashboard.noAccountsDescription')}</p>
      </div>
      <NavLink to="/accounts" className={cn(buttonVariants({ variant: 'default' }))}>
        {t('accounts.newAccount')}
      </NavLink>
    </div>
  );
}
