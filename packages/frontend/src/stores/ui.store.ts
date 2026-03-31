import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // System: check prefers-color-scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'system';
}

let systemThemeListener: MediaQueryList | null = null;

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  sidebarCollapsed: false,

  setTheme: (theme: Theme) => {
    // Persist to localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage unavailable
    }

    // Remove existing system listener if any
    if (systemThemeListener) {
      systemThemeListener.removeEventListener('change', handleSystemThemeChange);
      systemThemeListener = null;
    }

    // Apply theme to DOM
    applyTheme(theme);

    // Set up system listener for 'system' theme
    if (theme === 'system') {
      systemThemeListener = window.matchMedia('(prefers-color-scheme: dark)');
      systemThemeListener.addEventListener('change', handleSystemThemeChange);
    }

    set({ theme });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
}));

function handleSystemThemeChange(e: MediaQueryListEvent): void {
  const theme = useUIStore.getState().theme;
  if (theme === 'system') {
    const root = document.documentElement;
    if (e.matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
