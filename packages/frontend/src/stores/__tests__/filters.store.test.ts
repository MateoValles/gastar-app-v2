import { describe, it, expect, beforeEach } from 'vitest';
import { useFiltersStore } from '../filters.store.js';

beforeEach(() => {
  useFiltersStore.setState({
    accountId: undefined,
    categoryId: undefined,
    type: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    limit: 20,
  });
});

describe('useFiltersStore', () => {
  describe('initial state', () => {
    it('starts with all filters undefined and default limit', () => {
      const state = useFiltersStore.getState();
      expect(state.accountId).toBeUndefined();
      expect(state.categoryId).toBeUndefined();
      expect(state.type).toBeUndefined();
      expect(state.dateFrom).toBeUndefined();
      expect(state.dateTo).toBeUndefined();
      expect(state.limit).toBe(20);
    });

    it('starts with zero active filters', () => {
      const { activeFilterCount } = useFiltersStore.getState();
      expect(activeFilterCount()).toBe(0);
    });
  });

  describe('setFilter', () => {
    it('sets accountId filter', () => {
      const { setFilter } = useFiltersStore.getState();
      setFilter('accountId', 'acc-123');

      expect(useFiltersStore.getState().accountId).toBe('acc-123');
    });

    it('sets type filter', () => {
      const { setFilter } = useFiltersStore.getState();
      setFilter('type', 'expense');

      expect(useFiltersStore.getState().type).toBe('expense');
    });

    it('sets date range', () => {
      const { setFilter } = useFiltersStore.getState();
      setFilter('dateFrom', '2025-01-01');
      setFilter('dateTo', '2025-01-31');

      const state = useFiltersStore.getState();
      expect(state.dateFrom).toBe('2025-01-01');
      expect(state.dateTo).toBe('2025-01-31');
    });

    it('updates limit', () => {
      const { setFilter } = useFiltersStore.getState();
      setFilter('limit', 50);

      expect(useFiltersStore.getState().limit).toBe(50);
    });
  });

  describe('clearFilters', () => {
    it('resets all filters to defaults', () => {
      const { setFilter, clearFilters } = useFiltersStore.getState();
      setFilter('accountId', 'acc-123');
      setFilter('type', 'income');
      setFilter('dateFrom', '2025-01-01');

      clearFilters();

      const state = useFiltersStore.getState();
      expect(state.accountId).toBeUndefined();
      expect(state.categoryId).toBeUndefined();
      expect(state.type).toBeUndefined();
      expect(state.dateFrom).toBeUndefined();
      expect(state.dateTo).toBeUndefined();
      expect(state.limit).toBe(20);
    });
  });

  describe('activeFilterCount', () => {
    it('counts each active filter', () => {
      const { setFilter, activeFilterCount } = useFiltersStore.getState();

      setFilter('accountId', 'acc-123');
      expect(activeFilterCount()).toBe(1);

      setFilter('type', 'expense');
      expect(activeFilterCount()).toBe(2);

      setFilter('dateFrom', '2025-01-01');
      expect(activeFilterCount()).toBe(3);

      setFilter('dateTo', '2025-01-31');
      expect(activeFilterCount()).toBe(4);

      setFilter('categoryId', 'cat-456');
      expect(activeFilterCount()).toBe(5);
    });

    it('does not count limit as active filter', () => {
      const { setFilter, activeFilterCount } = useFiltersStore.getState();
      setFilter('limit', 50);
      expect(activeFilterCount()).toBe(0);
    });

    it('decrements when filter is cleared', () => {
      const { setFilter, clearFilters, activeFilterCount } = useFiltersStore.getState();
      setFilter('accountId', 'acc-123');
      setFilter('type', 'income');
      expect(activeFilterCount()).toBe(2);

      clearFilters();
      expect(activeFilterCount()).toBe(0);
    });
  });
});
