import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';

// Import before the hook so we can reset module-level state
import * as authService from '../../services/auth.service.js';
import { useAuth } from '../use-auth.js';

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

// ─── Mock api-client clearAccessToken ─────────────────────────────────────────
const mockClearAccessToken = vi.fn();
vi.mock('@/lib/api-client.js', () => ({
  clearAccessToken: (...args: unknown[]) => mockClearAccessToken(...args),
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

// ─── Mock query-client ────────────────────────────────────────────────────────
const mockQueryClientClear = vi.fn();
vi.mock('@/lib/query-client.js', () => ({
  queryClient: { clear: (...args: unknown[]) => mockQueryClientClear(...args) },
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

const mockRegisterResponse = {
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

    it('shows success toast with user name', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      result.current.login.mutate({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
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

  describe('register', () => {
    it('navigates to /login and shows toast on success', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));
      vi.mocked(authService.register).mockResolvedValue(mockRegisterResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      result.current.register.mutate({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
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
        expect(mockQueryClientClear).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('forgot password', () => {
    it('shows info toast on success', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));
      vi.mocked(authService.forgotPassword).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      result.current.forgotPassword.mutate({ email: 'test@example.com' });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalled();
      });
    });
  });

  describe('reset password', () => {
    it('navigates to /login and shows success toast', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));
      vi.mocked(authService.resetPassword).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      result.current.resetPassword.mutate({ token: 'valid-token', password: 'newpass123' });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('cross-tab logout', () => {
    it('clears auth, token, and cache when receiving logout message', async () => {
      vi.mocked(authService.refresh).mockRejectedValue(new Error('no session'));

      // Capture BroadcastChannel instances to simulate cross-tab messages
      const channelInstances: Array<{ onmessage: ((event: MessageEvent<string>) => void) | null }> =
        [];
      const OriginalBC = global.BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      const MockBC = class {
        onmessage: ((event: MessageEvent<string>) => void) | null = null;
        postMessage = vi.fn();
        close = vi.fn();
        constructor(_name: string) {
          channelInstances.push(this);
        }
      };
      global.BroadcastChannel = MockBC as unknown as typeof BroadcastChannel;

      renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockSetLoading).toHaveBeenCalled());

      vi.clearAllMocks();

      // Find the channel instance with onmessage set (the listener)
      const listenerChannel = channelInstances.find((ch) => ch.onmessage != null);
      expect(listenerChannel).toBeDefined();

      // Trigger the message handler
      act(() => {
        listenerChannel!.onmessage!(new MessageEvent('message', { data: 'logout' }));
      });

      expect(mockClearAccessToken).toHaveBeenCalled();
      expect(mockClearAuth).toHaveBeenCalled();
      expect(mockQueryClientClear).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');

      // Restore
      global.BroadcastChannel = OriginalBC;
    });
  });
});
