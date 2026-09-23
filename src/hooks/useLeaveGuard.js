import { useState, useRef, useLayoutEffect } from 'preact/hooks';
import { afterOverlayClosed } from './useBackToClose';

let nextId = 0;

/** Pops the current history entry and resolves once the browser has done so. */
function popEntry() {
  return new Promise(resolve => {
    window.addEventListener('popstate', () => resolve(), { once: true });
    setTimeout(resolve, 500);
    window.history.back();
  });
}

/**
 * Guards a form page against losing what was typed: both the page's back
 * arrow and the phone's Back button ask before leaving with unsaved changes.
 *
 * The arrow is easy (`requestLeave`). Back is caught with a history entry
 * pushed while the form is dirty: Back pops it, the page stays, and the
 * question is asked. Answering "Annulla" pushes the entry again; leaving (or
 * saving) pops it first, so it never lingers as a dead step in history.
 */
export function useLeaveGuard(leave) {
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [asking, setAsking] = useState(false);
  const leavingRef = useRef(false);
  const guardIdRef = useRef(null);

  const onGuardEntry = () => guardIdRef.current && window.history.state?.leaveGuard === guardIdRef.current;

  // Whether the question was just on screen: its dialog is still popping its
  // own history entry, and the guard must re-arm only once that is done.
  const wasAskingRef = useRef(false);

  useLayoutEffect(() => {
    const returningFromDialog = wasAskingRef.current;
    wasAskingRef.current = asking;
    if (!dirty || asking || leavingRef.current) return;

    let cancelled = false;
    let armedId = null;
    let onPop = null;

    const arm = () => {
      if (cancelled || leavingRef.current) return;
      // Our entry already current (dialog entries copy the state): reuse it.
      let id = guardIdRef.current;
      if (!id || window.history.state?.leaveGuard !== id) {
        id = `guard-${++nextId}`;
        guardIdRef.current = id;
        window.history.pushState({ ...(window.history.state || {}), leaveGuard: id }, '', window.location.href);
      }
      armedId = id;
      onPop = () => {
        if (leavingRef.current || window.history.state?.leaveGuard === id) return;
        // Back popped our entry: the page is still here.
        if (dirtyRef.current) setAsking(true);
        else window.history.back();
      };
      window.addEventListener('popstate', onPop);
    };

    if (returningFromDialog) afterOverlayClosed().then(arm);
    else arm();

    return () => {
      cancelled = true;
      if (onPop) window.removeEventListener('popstate', onPop);
      // No longer dirty (changes undone by hand): drop the entry, so Back
      // does not need an extra press.
      if (armedId && !leavingRef.current && !dirtyRef.current && window.history.state?.leaveGuard === armedId) {
        window.history.back();
      }
    };
  }, [dirty, asking]);

  /** Leaves through `go`, popping the guard entry first if it is current. */
  const exit = async (go) => {
    leavingRef.current = true;
    if (onGuardEntry()) await popEntry();
    go();
  };

  return {
    onDirtyChange: (value) => {
      dirtyRef.current = value;
      setDirty(value);
    },
    requestLeave: () => (dirtyRef.current ? setAsking(true) : exit(leave)),
    // After a successful save: nothing to ask, just step out through `go`.
    leaveAfterSave: (go) => {
      dirtyRef.current = false;
      return exit(go);
    },
    asking,
    cancel: () => setAsking(false),
    confirm: async () => {
      leavingRef.current = true;
      setAsking(false);
      await afterOverlayClosed();
      await exit(leave);
    }
  };
}
