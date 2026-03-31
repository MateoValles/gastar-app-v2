import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  setAuthenticated: (userId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      setAuthenticated: (userId: string) => set({ isAuthenticated: true, userId }),
      clearAuth: () => set({ isAuthenticated: false, userId: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated, userId: state.userId }),
    },
  ),
);
