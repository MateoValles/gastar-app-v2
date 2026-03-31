import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  setAuthenticated: (userId: string) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: true,
      userId: null,
      setAuthenticated: (userId: string) => set({ isAuthenticated: true, userId }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      clearAuth: () => set({ isAuthenticated: false, userId: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated, userId: state.userId }),
      onRehydrateStorage: () => (state) => {
        // Set isLoading to false once hydration from localStorage completes
        if (state) {
          state.setLoading(false);
        }
      },
    },
  ),
);
