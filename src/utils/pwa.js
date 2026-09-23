import { registerSW } from 'virtual:pwa-register';

// Bridge between the service worker registration and the UI: the app shows
// a banner when a new build is waiting, and applies it only on request.
let updateReady = false;
let updateServiceWorker = null;
const listeners = new Set();

export function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  updateServiceWorker = registerSW({
    onNeedRefresh() {
      updateReady = true;
      for (const listener of listeners) listener();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // An installed PWA can stay open for days: check for a new build each
      // time it comes back to the foreground, not only on a cold start.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    }
  });
}

/** Calls `callback` once a new build is waiting. Returns an unsubscribe. */
export function onUpdateReady(callback) {
  if (updateReady) callback();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Activates the waiting build; the page reloads once it takes control. */
export function applyUpdate() {
  updateServiceWorker?.(true);
}
