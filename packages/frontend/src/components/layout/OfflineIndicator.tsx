import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/use-online-status';

/**
 * Fixed banner shown when the user goes offline or when connection is restored.
 * Informational only — does NOT block the UI.
 *
 * - Offline: amber/warning bar at top
 * - Restored: green bar that auto-hides after 3 seconds
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const { status } = useOnlineStatus();

  if (status === 'online') return null;

  const isOffline = status === 'offline';
  const isRestored = status === 'restored';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 top-0 z-[100]',
        'flex items-center justify-center px-4 py-2',
        'text-sm font-medium text-white',
        'transition-all duration-300',
        isOffline && 'bg-amber-600',
        isRestored && 'bg-green-600',
      )}
    >
      {isOffline && t('pwa.offline')}
      {isRestored && t('pwa.backOnline')}
    </div>
  );
}
