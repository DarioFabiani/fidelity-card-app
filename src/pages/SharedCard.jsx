import { route } from 'preact-router';
import { useState, useMemo } from 'preact/hooks';
import { decodeSharedCard } from '../utils/share';
import { addCard } from '../db';
import { BarcodeDisplay } from '../components/BarcodeDisplay';

export function SharedCard({ data, showToast }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const card = useMemo(() => {
    if (!data) return null;
    return decodeSharedCard(data);
  }, [data]);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      await addCard(card);
      setSaved(true);
      showToast('Carta salvata!');
    } catch {
      showToast('Errore nel salvataggio', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!card) {
    return (
      <div class="page" style={{ textAlign: 'center', padding: '48px 0' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Link non valido</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Il link della carta condivisa non è valido o è corrotto.
        </p>
        <button class="btn btn-primary" onClick={() => route('/fidelity-card-app/')}>
          Vai alle mie carte
        </button>
      </div>
    );
  }

  return (
    <div class="page">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Qualcuno ha condiviso una carta con te
        </p>
      </div>

      <div class="shared-card-header" style={{ background: card.color }}>
        <h2 class="shared-card-name">{card.providerName}</h2>
        <p class="shared-card-number">{card.cardNumber}</p>
      </div>

      <div style={{ marginTop: '16px' }}>
        <BarcodeDisplay value={card.cardNumber} format={card.barcodeFormat} fullscreenable={false} />
      </div>

      {card.notes && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '14px'
        }}>
          {card.notes}
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {saved ? (
          <button class="btn btn-primary btn-block" onClick={() => route('/fidelity-card-app/')}>
            Vai alle mie carte
          </button>
        ) : (
          <button class="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva questa carta'}
          </button>
        )}
      </div>

      <style>{`
        .shared-card-header {
          border-radius: var(--radius);
          padding: 24px;
          color: #FFFFFF;
          text-align: center;
        }
        .shared-card-name {
          font-size: 22px;
          font-weight: 700;
        }
        .shared-card-number {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 4px;
          font-family: 'SF Mono', 'Menlo', monospace;
        }
      `}</style>
    </div>
  );
}
