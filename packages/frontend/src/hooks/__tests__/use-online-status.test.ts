import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../use-online-status';

describe('useOnlineStatus', () => {
  // Store original navigator.onLine descriptor
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');

  function setOnlineState(online: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: online,
    });
  }

  beforeEach(() => {
    // Start online by default
    setOnlineState(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original descriptor if it existed
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalDescriptor);
    }
  });

  it('returns online status by default when navigator.onLine is true', () => {
    setOnlineState(true);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.status).toBe('online');
  });

  it('returns offline status when navigator.onLine is false', () => {
    setOnlineState(false);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.status).toBe('offline');
  });

  it('transitions to offline when the offline event fires', () => {
    setOnlineState(true);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.status).toBe('offline');
  });

  it('transitions to restored when the online event fires after being offline', () => {
    setOnlineState(false);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.status).toBe('restored');
  });

  it('transitions from restored back to online after 3 seconds', () => {
    setOnlineState(false);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.status).toBe('restored');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.status).toBe('online');
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    // Listeners for online/offline were added
    const onlineAdds = addSpy.mock.calls.filter(
      ([type]) => type === 'online' || type === 'offline',
    );
    expect(onlineAdds.length).toBeGreaterThanOrEqual(2);

    unmount();

    // Listeners for online/offline were removed
    const onlineRemoves = removeSpy.mock.calls.filter(
      ([type]) => type === 'online' || type === 'offline',
    );
    expect(onlineRemoves.length).toBeGreaterThanOrEqual(2);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
