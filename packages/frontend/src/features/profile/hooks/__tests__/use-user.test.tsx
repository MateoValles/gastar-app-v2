import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as usersService from '../../services/users.service.js';
import i18n from '@/lib/i18n.js';
import { useUser } from '../use-user.js';

// ─── Mock users service ────────────────────────────────────────────────────────
vi.mock('../../services/users.service.js', () => ({
  getMe: vi.fn(),
  updateMe: vi.fn(),
}));

// ─── Mock i18n ────────────────────────────────────────────────────────────────
vi.mock('@/lib/i18n.js', () => ({
  default: { changeLanguage: vi.fn() },
}));

// ─── Mock sonner toast ────────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { wrapper: Wrapper, queryClient };
}

const mockUser = {
  id: 'user-1',
  email: 'john@example.com',
  name: 'John Doe',
  language: 'es',
  createdAt: '2026-01-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetch user', () => {
    it('returns user profile on successful fetch', async () => {
      vi.mocked(usersService.getMe).mockResolvedValue(mockUser);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('shows success toast and invalidates queries on name update', async () => {
      vi.mocked(usersService.getMe).mockResolvedValue(mockUser);
      vi.mocked(usersService.updateMe).mockResolvedValue({
        ...mockUser,
        name: 'Jane Doe',
      });

      const { wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.updateProfile.mutate({ name: 'Jane Doe' });
      });

      await waitFor(() => {
        expect(result.current.updateProfile.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['users', 'me'] });
    });

    it('calls i18n.changeLanguage when language is updated', async () => {
      vi.mocked(usersService.getMe).mockResolvedValue(mockUser);
      vi.mocked(usersService.updateMe).mockResolvedValue({
        ...mockUser,
        language: 'en',
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.updateProfile.mutate({ language: 'en' });
      });

      await waitFor(() => {
        expect(result.current.updateProfile.isSuccess).toBe(true);
      });

      expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
