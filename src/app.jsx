import Router from 'preact-router';
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { UnlockScreen } from './components/UnlockScreen';
import { VaultRecovery } from './components/VaultRecovery';
import { UpdateBanner } from './components/UpdateBanner';
import { isEncryptionEnabled, hasEncryptionKey, repairEncryptionState, lock, ENC_ENABLED_KEY, ENC_SALT_KEY } from './db';
import { clearShareLinks } from './utils/share';
import { shouldAutoLock } from './utils/autolock';
import { onUpdateReady, applyUpdate } from './utils/pwa';
import { Home } from './pages/Home';
import { AddCard } from './pages/AddCard';
import { EditCard } from './pages/EditCard';
import { ViewCard } from './pages/ViewCard';
import { SharedCard } from './pages/SharedCard';
import { Settings } from './pages/Settings';

export function App() {
  const [toast, setToast] = useState(null);
  const [unlocked, setUnlocked] = useState(() => !isEncryptionEnabled() || hasEncryptionKey());
  const [vaultError, setVaultError] = useState('');
  // Gate the router until the vault state is known. Rendering optimistically
  // let pages mount and read the db during the check — briefly enough that no
  // ciphertext ever reached the UI, but long enough for an export started in
  // that window to silently produce an empty backup.
  const [checked, setChecked] = useState(false);
  // Reached from the unlock screen: a forgotten password otherwise left the
  // app with no way forward at all.
  const [showRecovery, setShowRecovery] = useState(false);

  // An interrupted setup can leave sealed cards with the flag off. Detect that
  // before rendering anything, so we ask to unlock instead of showing rows of
  // undefined fields.
  useEffect(() => {
    if (hasEncryptionKey()) {
      setChecked(true);
      return;
    }
    repairEncryptionState()
      .then(active => { if (active) setUnlocked(false); })
      .catch(err => setVaultError(err.message))
      .finally(() => setChecked(true));
  }, []);

  // Drops the key and every share code derived while unlocked. The data on
  // disk is untouched; the router unmounts, so no page keeps decrypted cards
  // on screen behind the unlock form.
  const lockVault = useCallback(() => {
    lock();
    clearShareLinks();
    setUnlocked(false);
  }, []);

  // localStorage fires `storage` in the OTHER tabs. Without this, a tab left
  // open on the list while encryption was switched on elsewhere would keep
  // reading from a vault it no longer has the key for, and report the cards
  // as "non trovata" — which reads as data loss.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === ENC_ENABLED_KEY) {
        if (e.newValue === 'true' && !hasEncryptionKey()) {
          setUnlocked(false);
        } else if (e.newValue === null) {
          // Turned off elsewhere: the cards are plain again. A stale key kept
          // here would seal the next save and lock the vault back up.
          lock();
          clearShareLinks();
          setUnlocked(true);
        }
      } else if (e.key === ENC_SALT_KEY && e.oldValue && e.newValue && hasEncryptionKey()) {
        // Password changed in another tab: the key held here is the old one,
        // and a card saved with it would be unreadable under the new one.
        lockVault();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [lockVault]);

  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => onUpdateReady(() => setUpdateReady(true)), []);

  // Auto-lock: the key otherwise stayed in memory for as long as the app was
  // alive — on a phone, often days — so a vault "protected by password" was
  // open to anyone who picked up the phone. Measured on the way back to the
  // foreground, since timers are not reliable in a backgrounded tab.
  const hiddenAt = useRef(null);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      if (since !== null && isEncryptionEnabled() && hasEncryptionKey() && shouldAutoLock(Date.now() - since)) {
        lockVault();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [lockVault]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  if (vaultError || showRecovery) {
    return (
      <VaultRecovery
        message={vaultError || 'Senza la password i dati cifrati non possono essere letti. Puoi salvarne una copia così come sono, oppure ripartire da zero.'}
        // Only offered when the user chose to come here: a real vault error
        // has nothing to go back to.
        onCancel={vaultError ? undefined : () => setShowRecovery(false)}
      />
    );
  }

  if (!checked) {
    return null;
  }

  if (!unlocked) {
    return <UnlockScreen onUnlock={() => setUnlocked(true)} onRecover={() => setShowRecovery(true)} />;
  }

  return (
    <>
      <Header onLock={isEncryptionEnabled() ? lockVault : undefined} />
      {updateReady && (
        <UpdateBanner onUpdate={applyUpdate} onDismiss={() => setUpdateReady(false)} />
      )}
      <Router>
        <Home path="/fidelity-card-app/" showToast={showToast} />
        <AddCard path="/fidelity-card-app/add" showToast={showToast} />
        <EditCard path="/fidelity-card-app/edit/:id" showToast={showToast} />
        <ViewCard path="/fidelity-card-app/card/:id" showToast={showToast} />
        <SharedCard path="/fidelity-card-app/shared" showToast={showToast} />
        <Settings path="/fidelity-card-app/settings" showToast={showToast} />
      </Router>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
