import Router from 'preact-router';
import { useState, useCallback, useEffect } from 'preact/hooks';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { UnlockScreen } from './components/UnlockScreen';
import { PageMessage } from './components/PageMessage';
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

  // An interrupted setup can leave sealed cards with the flag off. Detect that
  // before rendering the list, so we ask to unlock instead of showing rows of
  // undefined fields.
  useEffect(() => {
    if (hasEncryptionKey()) return;
    repairEncryptionState()
      .then(active => { if (active) setUnlocked(false); })
      .catch(err => setVaultError(err.message));
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  if (vaultError) {
    return (
      <div class="page" style={{ paddingTop: 'calc(var(--space-6) * 2)' }}>
        <PageMessage title="Impossibile leggere i dati">{vaultError}</PageMessage>
      </div>
    );
  }

  if (!unlocked) {
    return <UnlockScreen onUnlock={() => setUnlocked(true)} />;
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
