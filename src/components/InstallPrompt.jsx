import { useState, useEffect } from 'preact/hooks';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('install-dismissed')) return;

    const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isSafari = /safari/.test(navigator.userAgent.toLowerCase()) && !/chrome/.test(navigator.userAgent.toLowerCase());

    if (isIos && isSafari) {
      setShowIosHint(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-dismissed', '1');
  };

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div class="install-banner">
      <div class="install-text">
        {deferredPrompt
          ? 'Installa l\'app sul tuo telefono'
          : 'Per installare: tocca Condividi, poi "Aggiungi a Home"'}
      </div>
      <div class="install-actions">
        {deferredPrompt && (
          <button class="btn btn-primary" onClick={handleInstall} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Installa
          </button>
        )}
        <button class="install-close" onClick={handleDismiss} aria-label="Chiudi">
          &times;
        </button>
      </div>
      <style>{`
        .install-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          z-index: 100;
          box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
        }
        .install-text {
          font-size: 13px;
          flex: 1;
        }
        .install-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .install-close {
          font-size: 22px;
          color: var(--color-text-secondary);
          padding: 4px 8px;
        }
      `}</style>
    </div>
  );
}
