import { route } from 'preact-router';

export function Header() {
  return (
    <header class="header">
      <div class="header-inner">
        <button class="header-title" onClick={() => route('/fidelity-card-app/')}>
          Carte Fedeltà
        </button>
        <button
          class="btn-icon header-settings"
          onClick={() => route('/fidelity-card-app/settings')}
          aria-label="Impostazioni"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
      <style>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: calc(var(--header-height) + env(safe-area-inset-top));
          padding-top: env(safe-area-inset-top);
          background: linear-gradient(135deg, var(--color-header-from), var(--color-header-to));
          color: #FFFFFF;
          z-index: 150;
          box-shadow: var(--shadow-md);
        }
        .header-inner {
          max-width: 600px;
          margin: 0 auto;
          height: var(--header-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-4);
        }
        .header-title {
          font-size: var(--text-lg);
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #FFFFFF;
          -webkit-tap-highlight-color: transparent;
        }
        .header-settings {
          color: #FFFFFF;
        }
      `}</style>
    </header>
  );
}
