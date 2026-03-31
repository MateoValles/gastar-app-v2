import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { useAuth } from '../use-auth.js';
import * as authService from '../../services/auth.service.js';

// ─── Mock auth service ────────────────────────────────────────────────────────
vi.mock('../../services/auth.service.js', () => ({
  refresh: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

// ─── Mock sonner toast ────────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ─── Mock react-router useNavigate ────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Mock auth store ──────────────────────────────────────────────────────────
const mockSetAuthenticated = vi.fn();
const mockSetLoading = vi.fn();
const mockClearAuth = vi.fn();

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    setAuthenticated: mockSetAuthenticated,
    setLoading: mockSetLoading,
    clearAuth: mockClearAuth,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  language: 'es',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockLoginResponse = {
  accessToken: 'test-token',
  user: mockUser,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('boot refresh', () => {
    it('sets isAuthenticated when refresh succeeds', async () => {
      vi.mocked(authService.refresh).mockResolvedValue(mockLoginResponse);

      renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockSetAuthenticated).toHaveBeenCalledWith('user-1');
        expect(mockSetLoading).toHaveBeenCalledWith(false);
      });
    });

    it('clears auth when refresh fails', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('Refresh failed'));

      renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockClearAuth).toHaveBeenCalled();
        expect(mockSetLoading).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('login', () => {
    it('navigates to /dashboard on success', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      result.current.login.mutate({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(mockSetAuthenticated).toHaveBeenCalledWith('user-1');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('does NOT set authenticated on login error', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));
      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      vi.clearAllMocks();

      result.current.login.mutate({ email: 'test@example.com', password: 'wrong' });

      await waitFor(() => {
        expect(result.current.login.isError).toBe(true);
      });

      expect(mockSetAuthenticated).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears auth and navigates to /login', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));
      vi.mocked(authService.logout).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      result.current.logout.mutate();

      await waitFor(() => {
        expect(mockClearAuth).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });
});
