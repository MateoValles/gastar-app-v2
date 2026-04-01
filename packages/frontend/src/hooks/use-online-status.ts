import { useEffect, useState } from 'react';

export type OnlineStatus = 'online' | 'offline' | 'restored';

/**
 * Tracks the browser's network connectivity status.
 *
 * Returns:
 * - `isOnline` — current online state
 * - `status` — 'online' | 'offline' | 'restored'
 *   'restored' is set briefly when the connection comes back, then reverts to 'online'
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  const [status, setStatus] = useState<OnlineStatus>(() => {
    if (typeof navigator === 'undefined') return 'online';
    return navigator.onLine ? 'online' : 'offline';
  });

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setStatus('restored');
    }

    function handleOffline() {
      setIsOnline(false);
      setStatus('offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // After showing "restored", revert to "online" after 3 seconds
  useEffect(() => {
    if (status !== 'restored') return;

    const timer = setTimeout(() => {
      setStatus('online');
    }, 3000);

    return () => clearTimeout(timer);
  }, [status]);

  return { isOnline, status };
}
