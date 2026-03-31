import { create } from 'zustand';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface FiltersState {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  // Actions
  setFilter: <
    K extends keyof Omit<FiltersState, 'setFilter' | 'clearFilters' | 'activeFilterCount'>,
  >(
    key: K,
    value: FiltersState[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: () => number;
}

const DEFAULT_LIMIT = 20;

export const useFiltersStore = create<FiltersState>((set, get) => ({
  accountId: undefined,
  categoryId: undefined,
  type: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  limit: DEFAULT_LIMIT,

  setFilter: (key, value) => {
    set({ [key]: value });
  },

  clearFilters: () => {
    set({
      accountId: undefined,
      categoryId: undefined,
      type: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      limit: DEFAULT_LIMIT,
    });
  },

  activeFilterCount: () => {
    const state = get();
    let count = 0;
    if (state.accountId !== undefined) count++;
    if (state.categoryId !== undefined) count++;
    if (state.type !== undefined) count++;
    if (state.dateFrom !== undefined) count++;
    if (state.dateTo !== undefined) count++;
    return count;
  },
}));
