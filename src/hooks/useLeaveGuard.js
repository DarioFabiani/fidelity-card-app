import { useState, useRef } from 'preact/hooks';
import { afterOverlayClosed } from './useBackToClose';

/**
 * Back arrow of a form page: leaves at once when nothing was changed, or asks
 * first. Losing an edit to a stray tap on the arrow went unnoticed.
 */
export function useLeaveGuard(leave) {
  const dirtyRef = useRef(false);
  const [asking, setAsking] = useState(false);

  return {
    onDirtyChange: (dirty) => { dirtyRef.current = dirty; },
    requestLeave: () => (dirtyRef.current ? setAsking(true) : leave()),
    // Leaving right after submit: the form is saved, nothing to ask.
    markSaved: () => { dirtyRef.current = false; },
    asking,
    cancel: () => setAsking(false),
    confirm: async () => {
      setAsking(false);
      await afterOverlayClosed();
      leave();
    }
  };
}
