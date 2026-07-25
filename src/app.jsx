import Router from 'preact-router';
import { useState, useCallback, useEffect } from 'preact/hooks';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { UnlockScreen } from './components/UnlockScreen';
import { VaultRecovery } from './components/VaultRecovery';
import { isEncryptionEnabled, hasEncryptionKey, repairEncryptionState } from './db';
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
      <Header />
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
