import { useTranslation } from 'react-i18next';
import { X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

/**
 * Dismissible install prompt banner.
 * Appears after a delay once the browser fires the `beforeinstallprompt` event.
 * Dismiss state is stored in sessionStorage — won't re-appear in the same session.
 */
export function InstallPrompt() {
  const { t } = useTranslation();
  const { isVisible, triggerInstall, dismiss } = useInstallPrompt();

  if (!isVisible) return null;

  return (
    <div
      role="banner"
      className={cn(
        'fixed bottom-20 left-4 right-4 z-[90] lg:bottom-6 lg:left-auto lg:right-6 lg:w-80',
        'rounded-xl border border-amber-200/20 bg-stone-900 p-4 shadow-xl',
        'flex items-start gap-3',
      )}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-600/20">
        <Download className="h-5 w-5 text-amber-500" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{t('pwa.installTitle')}</p>
        <p className="mt-0.5 text-xs text-stone-400">{t('pwa.installDescription')}</p>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={triggerInstall}
            className={cn(
              'rounded-lg bg-amber-600 px-3 py-1.5',
              'text-xs font-medium text-white',
              'hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-amber-500 transition-colors',
            )}
          >
            {t('pwa.installButton')}
          </button>
          <button
            onClick={dismiss}
            className={cn(
              'rounded-lg px-3 py-1.5',
              'text-xs font-medium text-stone-400',
              'hover:text-white focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-stone-500 transition-colors',
            )}
          >
            {t('pwa.dismissButton')}
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        aria-label={t('common.close')}
        className={cn(
          'flex-shrink-0 rounded p-1 text-stone-400',
          'hover:text-white focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-stone-500 transition-colors',
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
