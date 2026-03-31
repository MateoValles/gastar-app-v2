import type { ComponentType } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Wallet, Tags, Receipt, CircleUser, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.title' },
  { to: '/accounts', icon: Wallet, labelKey: 'accounts.title' },
  { to: '/transactions', icon: Receipt, labelKey: 'transactions.title' },
  { to: '/categories', icon: Tags, labelKey: 'categories.title' },
  { to: '/profile', icon: CircleUser, labelKey: 'profile.title' },
];

export function MobileNav() {
  const { t } = useTranslation();

  return (
    <nav className="flex items-end h-16 border-t border-border bg-background">
      {/* First 2 items */}
      {NAV_ITEMS.slice(0, 2).map(({ to, icon: Icon, labelKey }) => (
        <MobileNavItem key={to} to={to} icon={Icon} label={t(labelKey)} />
      ))}

      {/* Center raised "+" button */}
      <div className="flex flex-1 justify-center">
        <NavLink
          to="/transactions/new"
          aria-label={t('transactions.newTransaction')}
          className={cn(
            'flex items-center justify-center',
            'size-14 rounded-full bg-primary text-primary-foreground shadow-lg',
            'translate-y-[-8px]', // Raised above the nav bar
            'transition-transform hover:scale-105 active:scale-95',
          )}
        >
          <Plus className="size-6" />
        </NavLink>
      </div>

      {/* Last 2 items */}
      {NAV_ITEMS.slice(3).map(({ to, icon: Icon, labelKey }) => (
        <MobileNavItem key={to} to={to} icon={Icon} label={t(labelKey)} />
      ))}
    </nav>
  );
}

interface MobileNavItemProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

function MobileNavItem({ to, icon: Icon, label }: MobileNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2',
          'text-muted-foreground transition-colors',
          isActive && 'text-primary',
        )
      }
    >
      <Icon className="size-5" />
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
}
