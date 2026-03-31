import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useUIStore } from '../ui.store.js';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock matchMedia
const mockMatchMedia = vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

beforeEach(() => {
  // Reset store to initial state
  useUIStore.setState({
    theme: 'system',
    sidebarCollapsed: false,
  });

  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('matchMedia', mockMatchMedia);
  localStorageMock.clear();

  // Mock document.documentElement.classList
  const classList = new Set<string>();
  vi.spyOn(document.documentElement.classList, 'add').mockImplementation((cls) => {
    classList.add(cls);
  });
  vi.spyOn(document.documentElement.classList, 'remove').mockImplementation((cls) => {
    classList.delete(cls);
  });
  vi.spyOn(document.documentElement.classList, 'contains').mockImplementation((cls) =>
    classList.has(cls),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useUIStore', () => {
  describe('setTheme', () => {
    it('sets theme to dark and adds .dark class', () => {
      const { setTheme } = useUIStore.getState();
      setTheme('dark');

      expect(useUIStore.getState().theme).toBe('dark');
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(localStorageMock.getItem('theme')).toBe('dark');
    });

    it('sets theme to light and removes .dark class', () => {
      const { setTheme } = useUIStore.getState();
      setTheme('light');

      expect(useUIStore.getState().theme).toBe('light');
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
      expect(localStorageMock.getItem('theme')).toBe('light');
    });

    it('sets theme to system and uses prefers-color-scheme', () => {
      mockMatchMedia.mockReturnValueOnce({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { setTheme } = useUIStore.getState();
      setTheme('system');

      expect(useUIStore.getState().theme).toBe('system');
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('sets up system theme listener when theme is system', () => {
      const addEventListenerMock = vi.fn();
      mockMatchMedia.mockReturnValueOnce({
        matches: false,
        addEventListener: addEventListenerMock,
        removeEventListener: vi.fn(),
      });

      const { setTheme } = useUIStore.getState();
      setTheme('system');

      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar from false to true', () => {
      const { toggleSidebar } = useUIStore.getState();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);

      toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it('toggles sidebar back to false', () => {
      useUIStore.setState({ sidebarCollapsed: true });
      const { toggleSidebar } = useUIStore.getState();

      toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });
  });
});
