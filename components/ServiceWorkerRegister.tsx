'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production builds only.
 *
 * Updates are fully automatic - no user step needed:
 *  - Data (flights, schedule, money) is always fetched network-first by the
 *    service worker, so it's live every time you open the app or switch tabs.
 *  - App builds self-update: the new sw.js installs, skipWaiting() activates
 *    it, and clients.claim() takes control - the fresh build is picked up on
 *    the next launch with no prompt.
 *
 * Dev mode skips registration so local iterations never fight a stale SW.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('Service worker registration failed', err));
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
