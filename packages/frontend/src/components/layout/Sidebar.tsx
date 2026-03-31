import type { ComponentType } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Wallet,
  Tags,
  Receipt,
  CircleUser,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';

interface NavItem {
  to: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.title' },
  { to: '/accounts', icon: Wallet, labelKey: 'accounts.title' },
  { to: '/categories', icon: Tags, labelKey: 'categories.title' },
  { to: '/transactions', icon: Receipt, labelKey: 'transactions.title' },
  { to: '/profile', icon: CircleUser, labelKey: 'profile.title' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-border bg-sidebar transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-border px-4',
          sidebarCollapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!sidebarCollapsed && (
          <span className="text-xl font-bold text-primary">{t('common.appName')}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={t('common.toggleSidebar')}
          className="size-8 text-muted-foreground hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive && 'bg-sidebar-accent text-primary',
                    sidebarCollapsed && 'justify-center px-2',
                  )
                }
              >
                <Icon className="size-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{t(labelKey)}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* New transaction button */}
      <div className={cn('border-t border-border p-4', sidebarCollapsed && 'px-2')}>
        <NavLink to="/transactions/new">
          <Button className={cn('w-full gap-2', sidebarCollapsed && 'px-2')}>
            <Plus className="size-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>{t('transactions.newTransaction')}</span>}
          </Button>
        </NavLink>
      </div>
    </aside>
  );
}
