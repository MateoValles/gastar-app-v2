import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.js';
import { useFiltersStore } from '@/stores/filters.store.js';

// ─── Component ───────────────────────────────────────────────────────────────

export function TransactionsNoResults() {
  const { t } = useTranslation();
  const clearFilters = useFiltersStore((s) => s.clearFilters);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <SearchX className="size-12 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t('common.noResults')}</h3>
        <p className="text-sm text-muted-foreground">{t('common.clearFilters')}</p>
      </div>
      <Button variant="outline" onClick={clearFilters}>
        {t('common.clearFilters')}
      </Button>
    </div>
  );
}
