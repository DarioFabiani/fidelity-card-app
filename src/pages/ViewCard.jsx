import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { getCard, deleteCard } from '../db';
import { BarcodeDisplay } from '../components/BarcodeDisplay';
import { ShareModal } from '../components/ShareModal';

export function ViewCard({ id, showToast }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getCard(id).then(c => {
      setCard(c);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    let wakeLock = null;
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
      }
    }
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteCard(id);
    showToast('Carta eliminata');
    route('/fidelity-card-app/');
  };

  if (loading) {
    return (
      <div class="page" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
        Caricamento...
      </div>
    );
  }

  if (!card) {
    return (
      <div class="page" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
        Carta non trovata
      </div>
    );
  }

  return (
    <div class="page">
      <div class="view-card-header" style={{ background: card.color }}>
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
        <button
          class={`btn ${confirmDelete ? 'btn-danger' : 'btn-outline'}`}
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
        >
          {confirmDelete ? 'Conferma' : 'Elimina'}
        </button>
      </div>

      {showShare && (
        <ShareModal card={card} onClose={() => setShowShare(false)} showToast={showToast} />
      )}

      <style>{`
        .view-card-header {
          border-radius: var(--radius-lg);
          padding: 24px;
          color: #FFFFFF;
          text-align: center;
        }
        .view-card-name {
          font-size: 22px;
          font-weight: 700;
        }
        .view-card-number {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 4px;
          font-family: 'SF Mono', 'Menlo', monospace;
        }
        .view-card-notes {
          margin-top: 16px;
          padding: 16px;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
        }
        .view-card-notes-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .view-card-notes p {
          margin-top: 4px;
          font-size: 14px;
        }
        .view-card-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}
