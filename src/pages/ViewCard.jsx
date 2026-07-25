import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { getCard, deleteCard, toggleFavorite } from '../db';
import { BarcodeDisplay } from '../components/BarcodeDisplay';
import { ShareModal } from '../components/ShareModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageMessage } from '../components/PageMessage';
import { getContrastColor, cardGradient, DEFAULT_CARD_COLOR } from '../utils/color';

export function ViewCard({ id, showToast }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // Without the catch a rejected read would leave the page stuck on
    // "Caricamento..." forever instead of reporting the problem.
    getCard(id)
      .then(setCard)
      .catch(() => setCard(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Keeps the screen awake while the barcode is on display at a till.
  useEffect(() => {
    let wakeLock = null;
    let cancelled = false;

    async function requestWakeLock() {
      if (!('wakeLock' in navigator) || cancelled) return;
      // Drop any lock still held before asking for another, otherwise every
      // return to the foreground would leak one.
      if (wakeLock) {
        try { await wakeLock.release(); } catch {}
        wakeLock = null;
      }
      try {
        const lock = await navigator.wakeLock.request('screen');
        // The request can resolve after the user has already left the page.
        if (cancelled) {
          lock.release().catch(() => {});
        } else {
          wakeLock = lock;
        }
      } catch {}
    }

    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (wakeLock) wakeLock.release().catch(() => {});
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleToggleFavorite = async () => {
    const updated = await toggleFavorite(id);
    setCard(updated);
    showToast(updated.favorite ? 'Aggiunta ai preferiti' : 'Rimossa dai preferiti');
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await deleteCard(id);
    showToast('Carta eliminata');
    route('/fidelity-card-app/');
  };

  if (loading) {
    return (
      <div class="page">
        <PageMessage>Caricamento...</PageMessage>
      </div>
    );
  }

  if (!card) {
    return (
      <div class="page">
        <PageMessage
          title="Carta non trovata"
          action={
            <button class="btn btn-primary" onClick={() => route('/fidelity-card-app/')}>
              Vai alle mie carte
            </button>
          }
        >
          La carta che stai cercando non esiste più.
        </PageMessage>
      </div>
    );
  }

  if (card._unreadable) {
    return (
      <div class="page">
        <PageMessage
          title="Carta non leggibile"
          action={
            <button class="btn btn-primary" onClick={() => route('/fidelity-card-app/')}>
              Vai alle mie carte
            </button>
          }
        >
          I dati di questa carta non possono essere decifrati. Le altre carte non sono interessate.
        </PageMessage>
      </div>
    );
  }

  const cardColor = card.color || DEFAULT_CARD_COLOR;

  return (
    <div class="page">
      <button class="view-back" onClick={() => route('/fidelity-card-app/')} aria-label="Torna alle mie carte">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Le mie carte
      </button>

      <div
        class="view-card-header"
        style={{ background: cardGradient(cardColor), color: getContrastColor(cardColor) }}
      >
        <button
          class="view-card-fav"
          onClick={handleToggleFavorite}
          aria-label={card.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          aria-pressed={Boolean(card.favorite)}
        >
          <svg
            width="22" height="22" viewBox="0 0 24 24"
            fill={card.favorite ? 'currentColor' : 'none'}
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style={{ opacity: card.favorite ? 1 : 0.6 }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        <h2 class="view-card-name">{card.providerName}</h2>
        <p class="view-card-number">{card.cardNumber}</p>
      </div>

      <div style={{ marginTop: '16px' }}>
        <BarcodeDisplay value={card.cardNumber} format={card.barcodeFormat} />
      </div>

      {card.notes && (
        <div class="view-card-notes">
          <span class="view-card-notes-label">Note</span>
          <p>{card.notes}</p>
        </div>
      )}

      <div class="view-card-actions">
        <button class="btn btn-primary" onClick={() => setShowShare(true)} style={{ flex: 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Condividi
        </button>
        <button class="btn btn-outline" onClick={() => route(`/fidelity-card-app/edit/${card.id}`)} style={{ flex: 1 }}>
          Modifica
        </button>
        <button class="btn btn-outline btn-delete" onClick={() => setConfirmDelete(true)}>
          Elimina
        </button>
      </div>

      {showShare && (
        <ShareModal card={card} onClose={() => setShowShare(false)} showToast={showToast} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminare questa carta?"
          message={`"${card.providerName}" verrà rimossa definitivamente da questo dispositivo. L'operazione non può essere annullata.`}
          confirmLabel="Elimina"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <style>{`
        .view-back {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          margin-bottom: var(--space-3);
          margin-left: -4px;
          padding: var(--space-2) var(--space-2) var(--space-2) 0;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-secondary);
          -webkit-tap-highlight-color: transparent;
        }
        .view-back:active {
          opacity: 0.6;
        }
        .view-card-header {
          position: relative;
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          text-align: center;
          box-shadow: var(--shadow-md);
        }
        .view-card-fav {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: inherit;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease;
        }
        .view-card-fav:active {
          transform: scale(0.85);
        }
        .view-card-name {
          font-size: var(--text-xl);
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .view-card-number {
          font-size: var(--text-sm);
          opacity: 0.9;
          margin-top: var(--space-1);
          font-family: var(--font-mono);
          letter-spacing: 0.06em;
        }
        .view-card-notes {
          margin-top: var(--space-4);
          padding: var(--space-4);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
        }
        .view-card-notes-label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .view-card-notes p {
          margin-top: var(--space-1);
          font-size: var(--text-sm);
        }
        .view-card-actions {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-5);
          flex-wrap: wrap;
        }
        .btn-delete {
          color: var(--color-danger);
          border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);
        }
      `}</style>
    </div>
  );
}
