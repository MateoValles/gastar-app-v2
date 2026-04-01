import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { useFilterSync } from '../use-filter-sync.js';
import { useFiltersStore } from '@/stores/filters.store.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper(initialEntries: string[] = ['/']) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  }
  return Wrapper;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useFilterSync', () => {
  beforeEach(() => {
    useFiltersStore.getState().clearFilters();
  });

  it('initializes store from URL params on mount', async () => {
    const wrapper = createWrapper(['/transactions?accountId=acc-1&type=expense']);

    renderHook(() => useFilterSync(), { wrapper });

    // After mount the store should reflect URL values
    const state = useFiltersStore.getState();
    expect(state.accountId).toBe('acc-1');
    expect(state.type).toBe('expense');
  });

  it('returns current filter values', async () => {
    const wrapper = createWrapper(['/transactions']);

    const { result } = renderHook(() => useFilterSync(), { wrapper });

    expect(result.current.accountId).toBeUndefined();
    expect(result.current.type).toBeUndefined();
  });

  it('reflects updated store values in hook return', () => {
    const wrapper = createWrapper(['/transactions']);

    const { result } = renderHook(() => useFilterSync(), { wrapper });

    act(() => {
      useFiltersStore.getState().setFilter('accountId', 'acc-2');
    });

    expect(result.current.accountId).toBe('acc-2');
  });

  it('clears store values when clearFilters is called', () => {
    const wrapper = createWrapper(['/transactions?categoryId=cat-1']);

    renderHook(() => useFilterSync(), { wrapper });

    act(() => {
      useFiltersStore.getState().clearFilters();
    });

    const state = useFiltersStore.getState();
    expect(state.categoryId).toBeUndefined();
    expect(state.accountId).toBeUndefined();
  });
});
