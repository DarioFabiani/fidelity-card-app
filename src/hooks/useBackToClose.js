import { useLayoutEffect, useRef } from 'preact/hooks';

let nextId = 0;
// Resolves once the history entry of the last overlay closed from the UI has
// been popped. See afterOverlayClosed().
let pendingBack = Promise.resolve();

/**
 * Makes the phone's Back button close an overlay (dialog, sheet, scanner,
 * enlarged barcode) instead of leaving the page underneath — which, from the
 * scanner, threw away the form being filled in.
 *
 * While `active`, a history entry for the same URL is pushed. Back pops it and
 * calls `onClose`. Closing from the UI instead pops the entry itself, so no
 * dead entry is left behind for Back to land on.
 */
export function useBackToClose(active, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Layout effect, not useEffect: Preact runs the latter after the next paint,
  // and a Back pressed in that window found no entry to pop — it left the
  // page with the overlay still open.
  useLayoutEffect(() => {
    if (!active) return;
    // Chrome skips history entries pushed without a user gesture when going
    // Back, so such an entry would not catch Back and could even make one
    // press leave two entries. An overlay opened with no gesture (the
    // password prompt after a file picker) is simply left to Back as before.
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    const id = `overlay-${++nextId}`;
    window.history.pushState({ ...(window.history.state || {}), overlay: id }, '', window.location.href);
    let poppedByBack = false;

    const onPop = () => {
      if (window.history.state?.overlay === id) return;
      poppedByBack = true;
      closeRef.current?.();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      // Still on our entry: closed from the UI, so consume it. Anything else
      // (Back already popped it, or the app navigated on top) leaves it be.
      if (!poppedByBack && window.history.state?.overlay === id) {
        pendingBack = new Promise(resolve => {
          window.addEventListener('popstate', () => resolve(), { once: true });
          // Belt and braces: never leave a caller waiting forever.
          setTimeout(resolve, 500);
        });
        window.history.back();
      }
    };
  }, [active]);
}

/**
 * For an action that closes an overlay and then navigates (delete → list):
 * waits until the overlay's history entry is gone. Navigating before that
 * would be undone when the pending Back lands.
 */
export async function afterOverlayClosed() {
  // Called right after the state change that closes the overlay: let that
  // render (and the hook's cleanup, which starts the Back) happen first.
  await new Promise(resolve => setTimeout(resolve, 0));
  await pendingBack;
}
