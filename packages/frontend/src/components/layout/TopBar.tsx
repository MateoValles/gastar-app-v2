import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation();
  const { toggleSidebar } = useUIStore();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background px-4',
        'lg:px-6',
      )}
    >
      {/* Mobile: menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8 lg:hidden"
        onClick={toggleSidebar}
        aria-label={t('common.openMenu')}
      >
        <Menu className="size-5" />
      </Button>

      {/* Mobile: Logo */}
      <span className="text-xl font-bold text-primary lg:hidden">{t('common.appName')}</span>

      {/* Desktop: Page title */}
      {title && <h1 className="hidden text-2xl font-bold lg:block">{title}</h1>}
    </header>
  );
}
