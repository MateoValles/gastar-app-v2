import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from '../use-install-prompt';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockInstallPromptEvent() {
  const event = new Event('beforeinstallprompt');
  const promptFn = vi.fn().mockResolvedValue(undefined);
  const userChoiceFn = Promise.resolve({ outcome: 'accepted' as const });

  Object.assign(event, {
    prompt: promptFn,
    userChoice: userChoiceFn,
  });

  return { event, promptFn };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('is not visible initially', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isVisible).toBe(false);
  });

  it('becomes visible 30 seconds after beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt());
    const { event } = createMockInstallPromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    // Not yet visible (under 30s)
    expect(result.current.isVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('does not become visible if dismissed key is in sessionStorage', () => {
    sessionStorage.setItem('pwa-install-dismissed', '1');

    const { result } = renderHook(() => useInstallPrompt());
    const { event } = createMockInstallPromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('dismiss() hides the banner and sets sessionStorage key', () => {
    const { result } = renderHook(() => useInstallPrompt());
    const { event } = createMockInstallPromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isVisible).toBe(false);
    expect(sessionStorage.getItem('pwa-install-dismissed')).toBe('1');
  });

  it('triggerInstall() calls prompt() on the deferred event', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const { event, promptFn } = createMockInstallPromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    await act(async () => {
      await result.current.triggerInstall();
    });

    expect(promptFn).toHaveBeenCalledTimes(1);
  });

  it('triggerInstall() does nothing if no deferred prompt is available', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    // No event fired, no deferredPrompt set
    await act(async () => {
      await result.current.triggerInstall();
    });

    // Should not throw and should remain invisible
    expect(result.current.isVisible).toBe(false);
  });

  it('hides after accepted install outcome', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const { event } = createMockInstallPromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      await result.current.triggerInstall();
    });

    expect(result.current.isVisible).toBe(false);
  });
});
