import Router from 'preact-router';
import { useState, useCallback } from 'preact/hooks';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { Home } from './pages/Home';
import { AddCard } from './pages/AddCard';
import { EditCard } from './pages/EditCard';
import { ViewCard } from './pages/ViewCard';
import { SharedCard } from './pages/SharedCard';
import { Settings } from './pages/Settings';

export function App() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

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
