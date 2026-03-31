import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as authService from '../services/auth.service.js';
import { useAuthStore } from '@/stores/auth.store.js';
import { clearAccessToken } from '@/lib/api-client.js';
import { queryClient } from '@/lib/query-client.js';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@gastar/shared';

// Module-level guard: ensures boot refresh runs exactly once globally,
// even if multiple components call useAuth() or StrictMode double-mounts.
let bootRefreshStarted = false;

export function useAuth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const bootRefreshRef = useRef(false);

  // ─── Boot refresh (one-time side effect on app start) ────────────────────
  useEffect(() => {
    // Guard: skip if already started by this or another instance
    if (bootRefreshStarted) return;
    bootRefreshStarted = true;
    bootRefreshRef.current = true;

    let cancelled = false;

    authService
      .refresh()
      .then((data) => {
        if (!cancelled) {
          authStore.setAuthenticated(data.user.id);
          authStore.setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          authStore.clearAuth();
          authStore.setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      // In StrictMode dev, reset so the second mount can run
      if (bootRefreshRef.current) {
        bootRefreshStarted = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cross-tab logout listener ────────────────────────────────────────────
  useEffect(() => {
    const channel = new BroadcastChannel('auth');

    channel.onmessage = (event: MessageEvent<string>) => {
      if (event.data === 'logout') {
        clearAccessToken();
        authStore.clearAuth();
        queryClient.clear();
        void navigate('/login');
      }
    };

    return () => {
      channel.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: (data) => {
      authStore.setAuthenticated(data.user.id);
      toast.success(t('toast.auth.loginSuccess', { name: data.user.name }));
      void navigate('/dashboard');
    },
  });

  // ─── Register ─────────────────────────────────────────────────────────────
  const register = useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: () => {
      toast.success(t('toast.auth.registerSuccess'));
      void navigate('/login');
    },
  });

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      authStore.clearAuth();
      queryClient.clear();
      const channel = new BroadcastChannel('auth');
      channel.postMessage('logout');
      channel.close();
      void navigate('/login');
    },
  });

  // ─── Forgot password ──────────────────────────────────────────────────────
  const forgotPassword = useMutation({
    mutationFn: (data: ForgotPasswordInput) => authService.forgotPassword(data),
    onSuccess: () => {
      toast.info(t('toast.auth.resetSent'));
    },
  });

  // ─── Reset password ───────────────────────────────────────────────────────
  const resetPassword = useMutation({
    mutationFn: (data: ResetPasswordInput) => authService.resetPassword(data),
    onSuccess: () => {
      toast.success(t('toast.auth.resetSuccess'));
      void navigate('/login');
    },
  });

  return {
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
  };
}
