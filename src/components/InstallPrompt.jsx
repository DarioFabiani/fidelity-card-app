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

  const visible = !dismissed && (deferredPrompt || showIosHint);

  // Tells the layout to lift the FAB so the banner never covers it.
  useEffect(() => {
    document.body.classList.toggle('has-install-banner', Boolean(visible));
    return () => document.body.classList.remove('has-install-banner');
  }, [visible]);

  if (!visible) return null;

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
          background: color-mix(in srgb, var(--color-surface) 72%, transparent);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          backdrop-filter: blur(22px) saturate(180%);
          border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
          padding: var(--space-3) var(--space-4);
          padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          z-index: 100;
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, #FFFFFF 45%, transparent),
            0 -2px 12px rgba(0,0,0,0.1);
          animation: slideUp 0.3s ease;
        }
        @media (prefers-reduced-transparency: reduce) {
          .install-banner {
            background: var(--color-surface);
            -webkit-backdrop-filter: none;
            backdrop-filter: none;
          }
        }
        .install-text {
          font-size: var(--text-sm);
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
