import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { getCard, deleteCard, toggleFavorite, touchCard } from '../db';
import { BarcodeDisplay } from '../components/BarcodeDisplay';
import { CardBanner } from '../components/CardBanner';
import { ShareModal } from '../components/ShareModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageMessage } from '../components/PageMessage';
import { DEFAULT_CARD_COLOR } from '../utils/color';
import { formatCardNumber } from '../utils/format';
import { copyToClipboard } from '../utils/share';
import { StarIcon, ShareIcon, BackArrowIcon } from '../components/icons';

export function ViewCard({ id, showToast }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // Without the catch a rejected read would leave the page stuck on
    // "Caricamento..." forever instead of reporting the problem.
    getCard(id)
      .then(found => {
        setCard(found);
        // Feeds the "Recenti" ordering on the list.
        if (found && !found._unreadable) touchCard(id);
      })
      .catch(() => setCard(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Keeps the screen awake while the barcode is on display at a till.
  useEffect(() => {
    // A Set, not a single ref: the browser can release a lock on its own, and
    // two visibility changes can overlap. Anything still held gets released on
    // the way out, so none can be orphaned.
    const locks = new Set();
    let inFlight = false;
    let cancelled = false;

    const drop = (lock) => {
      locks.delete(lock);
      lock.release().catch(() => {});
    };

    async function requestWakeLock() {
      // Without this guard a second visibilitychange arriving while the first
      // request is still pending would acquire a second lock and orphan one.
      if (!('wakeLock' in navigator) || cancelled || inFlight) return;
      inFlight = true;
      try {
        for (const lock of locks) drop(lock);
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release().catch(() => {});
        } else {
          locks.add(lock);
          // The browser drops the lock by itself when the page is hidden.
          lock.addEventListener?.('release', () => locks.delete(lock));
        }
      } catch {
        // No lock this time; the next foreground visit tries again.
      } finally {
        inFlight = false;
      }
    }

    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      for (const lock of locks) lock.release().catch(() => {});
      locks.clear();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleToggleFavorite = async () => {
    try {
      const updated = await toggleFavorite(id);
      setCard(updated);
      showToast(updated.favorite ? 'Aggiunta ai preferiti' : 'Rimossa dai preferiti');
    } catch {
      showToast('Impossibile aggiornare i preferiti', 'error');
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteCard(id);
    } catch {
      showToast('Errore nell\'eliminazione', 'error');
      return;
    }
    showToast('Carta eliminata');
    // Replace: Back must not land on a card that no longer exists.
    route('/fidelity-card-app/', true);
  };

  // Online checkouts and apps ask for the number typed in, not scanned.
  const handleCopyNumber = async () => {
    const ok = await copyToClipboard(card.cardNumber);
    showToast(ok ? 'Numero copiato' : 'Errore nella copia', ok ? 'success' : 'error');
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
        <BackArrowIcon size={20} />
        Le mie carte
      </button>

      <CardBanner
        color={cardColor}
        name={card.providerName}
        number={formatCardNumber(card.cardNumber)}
        action={
          <button
            class="card-banner-fav"
            onClick={handleToggleFavorite}
            aria-label={card.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            aria-pressed={Boolean(card.favorite)}
          >
            <StarIcon
              size={22}
              fill={card.favorite ? 'currentColor' : 'none'}
              opacity={card.favorite ? 1 : 0.6}
            />
          </button>
        }
      />

      <div style={{ marginTop: '16px' }}>
        <BarcodeDisplay value={card.cardNumber} format={card.barcodeFormat} />
      </div>

      <button class="view-copy" onClick={handleCopyNumber}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copia numero
      </button>

      {card.notes && (
        <div class="view-card-notes">
          <span class="label-caps view-card-notes-label">Note</span>
          <p>{card.notes}</p>
        </div>
      )}

      <div class="view-card-actions">
        <button class="btn btn-primary" onClick={() => setShowShare(true)} style={{ flex: 1 }}>
          <ShareIcon size={18} />
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
        .view-copy {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          margin: var(--space-2) auto 0;
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-primary);
          -webkit-tap-highlight-color: transparent;
        }
        .view-copy:active {
          opacity: 0.6;
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
        }
        .view-card-notes p {
          margin-top: var(--space-1);
          font-size: var(--text-sm);
          /* Keeps the line breaks typed in the form. */
          white-space: pre-wrap;
          overflow-wrap: anywhere;
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
