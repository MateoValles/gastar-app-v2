import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useFiltersStore, type TransactionType } from '@/stores/filters.store.js';

const FILTER_KEYS = ['accountId', 'categoryId', 'type', 'dateFrom', 'dateTo'] as const;

export function useFilterSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);

  // Subscribe to store changes to trigger re-render when filters change
  const accountId = useFiltersStore((s) => s.accountId);
  const categoryId = useFiltersStore((s) => s.categoryId);
  const type = useFiltersStore((s) => s.type);
  const dateFrom = useFiltersStore((s) => s.dateFrom);
  const dateTo = useFiltersStore((s) => s.dateTo);

  // On mount: read URL params → store
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setFilter = useFiltersStore.getState().setFilter;
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) {
        if (key === 'type') {
          setFilter(key, value as TransactionType);
        } else {
          setFilter(key, value);
        }
      }
    }
  }, [searchParams]);

  // On filter change: store → URL params (debounced 100ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const state = useFiltersStore.getState();
      const params = new URLSearchParams();
      for (const key of FILTER_KEYS) {
        const value = state[key];
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      }

      // Only update URL if params actually changed
      const newQuery = params.toString();
      const currentQuery = new URLSearchParams(window.location.search).toString();
      if (newQuery !== currentQuery) {
        setSearchParams(params, { replace: true });
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [accountId, categoryId, type, dateFrom, dateTo, setSearchParams]);

  return { accountId, categoryId, type, dateFrom, dateTo };
}
