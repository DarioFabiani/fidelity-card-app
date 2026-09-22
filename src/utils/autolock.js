// How long the app may sit in the background, with the vault unlocked,
// before it asks for the password again. Stored per device.
const STORAGE_KEY = 'fidelity-autolock-minutes';

// No "immediately": opening the photo picker from the scanner, or a file
// picker for a backup, sends the app to the background for a few seconds,
// and locking then would throw away the form being filled in.
export const AUTOLOCK_OPTIONS = [
  { value: 1, label: 'Dopo 1 minuto' },
  { value: 5, label: 'Dopo 5 minuti' },
  { value: 15, label: 'Dopo 15 minuti' },
  { value: -1, label: 'Mai' }
];

export const DEFAULT_AUTOLOCK_MINUTES = 5;

export function getAutoLockMinutes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_AUTOLOCK_MINUTES;
    const value = Number(stored);
    return AUTOLOCK_OPTIONS.some(o => o.value === value) ? value : DEFAULT_AUTOLOCK_MINUTES;
  } catch {
    return DEFAULT_AUTOLOCK_MINUTES;
  }
}

export function setAutoLockMinutes(minutes) {
  try {
    localStorage.setItem(STORAGE_KEY, String(minutes));
  } catch {
    // Falls back to the default next time.
  }
}

/** Whether a stay in the background of `elapsedMs` should lock the vault. */
export function shouldAutoLock(elapsedMs, minutes = getAutoLockMinutes()) {
  if (minutes < 0) return false;
  return elapsedMs >= minutes * 60 * 1000;
}
