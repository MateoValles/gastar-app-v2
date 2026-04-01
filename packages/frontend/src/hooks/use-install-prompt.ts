import { useEffect, useState } from 'react';

const SESSION_KEY = 'pwa-install-dismissed';
const SHOW_DELAY_MS = 30_000; // 30 seconds

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Manages the PWA install prompt (beforeinstallprompt event).
 *
 * - Captures the deferred prompt event from the browser
 * - Delays showing the prompt by `SHOW_DELAY_MS` (30s)
 * - Persists dismiss state in sessionStorage so it doesn't re-appear in the same session
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If already dismissed this session, don't listen
    if (sessionStorage.getItem(SESSION_KEY)) return;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Show banner after delay once we have a deferred prompt
  useEffect(() => {
    if (!deferredPrompt) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  async function triggerInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setIsVisible(false);
  }

  return { isVisible, triggerInstall, dismiss };
}
